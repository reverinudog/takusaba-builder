import express from 'express';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { loadConfig, saveConfig, updateConfig, isConfigured, AppConfig } from './config';
import { fetchMembers } from './discord/client2';
import {
    BOT_INVITE_PERMISSIONS,
    PERMISSION_NAMES,
    ADMINISTRATOR,
    hasGuildMembersIntent
} from './discord/permissions';
import { IS_ELECTRON, DATA_DIR } from './paths';

const router = express.Router();

const withToken = (token: string) => new REST({ version: '10' }).setToken(token);

const isDiscordError = (e: any) => e?.name === 'DiscordAPIError' || typeof e?.status === 'number';

const handleDiscord = async (res: express.Response, fn: () => Promise<unknown>) => {
    try {
        await fn();
    } catch (e: any) {
        if (isDiscordError(e)) {
            res.json({
                ok: false,
                code: e.status === 401 ? 'INVALID_TOKEN' : String(e?.code ?? 'DISCORD_ERROR'),
                message: e.message || 'Discord API error'
            });
        } else {
            console.error('setup api failed:', e);
            res.status(500).json({ ok: false, code: 'INTERNAL', message: e.message });
        }
    }
};

// guildName cache (60s). Invalidated on save via the /save handler.
let guildNameCache: { name: string | null; at: number } | null = null;
const getGuildName = async (cfg: AppConfig): Promise<string | null> => {
    if (guildNameCache && Date.now() - guildNameCache.at < 60_000) return guildNameCache.name;
    try {
        // 2.5s cap so an unreachable Discord doesn't stall the status endpoint
        const guild: any = await Promise.race([
            withToken(cfg.token).get(Routes.guild(cfg.guildId)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('guild fetch timeout')), 2500))
        ]);
        const name = guild.name ?? null;
        guildNameCache = { name, at: Date.now() };
        return name;
    } catch {
        // failures (incl. timeout) are not cached
        return null;
    }
};

router.get('/status', async (req, res) => {
    const cfg = loadConfig();
    let guildName: string | null = null;
    if (cfg.token && cfg.guildId) {
        guildName = await getGuildName(cfg);
    }
    res.json({
        configured: isConfigured(),
        hasToken: !!cfg.token,
        guildId: cfg.guildId,
        guildName,
        packaged: IS_ELECTRON,
        port: Number(process.env.PORT) || 3000,
        dataDir: DATA_DIR,
        language: cfg.language ?? null
    });
});

router.post('/language', (req, res) => {
    const language = req.body?.language;
    if (typeof language !== 'string' || !language) {
        return res.status(400).json({ ok: false, code: 'MISSING_FIELDS', message: 'language is required' });
    }
    updateConfig({ language });
    res.json({ ok: true });
});

router.post('/verify-token', (req, res) => handleDiscord(res, async () => {
    const token = req.body?.token;
    if (!token || typeof token !== 'string') {
        return res.json({ ok: false, code: 'INVALID_TOKEN', message: 'Token is empty' });
    }
    const rest = withToken(token);
    const bot: any = await rest.get(Routes.user());
    const application: any = await rest.get(Routes.currentApplication());
    res.json({
        ok: true,
        bot: { id: bot.id, username: bot.username, avatar: bot.avatar },
        application: {
            id: application.id,
            name: application.name,
            flags: application.flags,
            botPublic: application.bot_public
        },
        intents: { guildMembers: hasGuildMembersIntent(application.flags ?? 0) },
        inviteUrl: `https://discord.com/oauth2/authorize?client_id=${application.id}&scope=bot&permissions=${BOT_INVITE_PERMISSIONS.toString()}`
    });
}));

router.post('/guilds', (req, res) => handleDiscord(res, async () => {
    const token = req.body?.token;
    if (!token || typeof token !== 'string') {
        return res.json({ ok: false, code: 'INVALID_TOKEN', message: 'Token is empty' });
    }
    const rest = withToken(token);
    const guilds = await rest.get(Routes.userGuilds()) as any[];
    res.json({
        ok: true,
        guilds: guilds.map((g: any) => ({ id: g.id, name: g.name, icon: g.icon }))
    });
}));

router.post('/save', (req, res) => {
    try {
        const { token, guildId } = req.body ?? {};
        if (!token || !guildId) {
            return res.status(400).json({ ok: false, code: 'MISSING_FIELDS', message: 'token and guildId are required' });
        }
        saveConfig({ token, guildId });
        guildNameCache = null;
        res.json({ ok: true, configured: true });
    } catch (e: any) {
        res.status(500).json({ ok: false, code: 'INTERNAL', message: e.message });
    }
});

interface Check {
    id: string;
    label: string;
    ok: boolean;
    detail?: string;
    detailCode?: 'admin' | 'missing_perms' | 'skipped' | 'intent_off' | 'guild_name' | 'error';
    detailParams?: Record<string, string>;
}

const SKIPPED = '先行チェックが失敗したためスキップ';

const runChecks = async (cfg: AppConfig): Promise<Check[]> => {
    const checks: Check[] = [];
    const rest = withToken(cfg.token);
    let botUser: any = null;

    // 1. token
    try {
        botUser = await rest.get(Routes.user());
        checks.push({ id: 'token', label: 'Botトークン', ok: true });
    } catch (e: any) {
        checks.push({ id: 'token', label: 'Botトークン', ok: false, detail: e.message, detailCode: 'error', detailParams: { message: e.message } });
    }

    // 2. intent_members
    if (checks[0].ok) {
        try {
            const application: any = await rest.get(Routes.currentApplication());
            const enabled = hasGuildMembersIntent(application.flags ?? 0);
            checks.push({
                id: 'intent_members',
                label: 'Server Members Intent',
                ok: enabled,
                detail: enabled ? undefined : 'Developer Portal で Server Members Intent を有効にしてください',
                detailCode: enabled ? undefined : 'intent_off'
            });
        } catch (e: any) {
            checks.push({ id: 'intent_members', label: 'Server Members Intent', ok: false, detail: e.message, detailCode: 'error', detailParams: { message: e.message } });
        }
    } else {
        checks.push({ id: 'intent_members', label: 'Server Members Intent', ok: false, detail: SKIPPED, detailCode: 'skipped' });
    }

    // 3. guild
    if (checks[0].ok) {
        try {
            const guild: any = await rest.get(Routes.guild(cfg.guildId));
            checks.push({ id: 'guild', label: 'サーバー参加', ok: true, detail: guild.name, detailCode: 'guild_name', detailParams: { name: guild.name } });
        } catch (e: any) {
            checks.push({ id: 'guild', label: 'サーバー参加', ok: false, detail: e.message, detailCode: 'error', detailParams: { message: e.message } });
        }
    } else {
        checks.push({ id: 'guild', label: 'サーバー参加', ok: false, detail: SKIPPED, detailCode: 'skipped' });
    }

    // 4. permissions
    if (checks[0].ok && checks[2].ok && botUser) {
        try {
            const member: any = await rest.get(Routes.guildMember(cfg.guildId, botUser.id));
            const roles: any[] = await rest.get(Routes.guildRoles(cfg.guildId)) as any[];
            const roleMap = new Map(roles.map((r: any) => [r.id, BigInt(r.permissions)]));
            let perms = roleMap.get(cfg.guildId) ?? 0n; // @everyone role has guild's id
            for (const roleId of member.roles ?? []) {
                perms |= roleMap.get(roleId) ?? 0n;
            }
            if ((perms & ADMINISTRATOR) !== 0n) {
                checks.push({ id: 'permissions', label: 'Bot権限', ok: true, detail: '管理者権限あり', detailCode: 'admin' });
            } else {
                const missing = PERMISSION_NAMES.filter(p => (perms & p.bit) === 0n);
                checks.push({
                    id: 'permissions',
                    label: 'Bot権限',
                    ok: missing.length === 0,
                    detail: missing.length ? `不足: ${missing.map(p => p.name).join(', ')}` : undefined,
                    detailCode: missing.length ? 'missing_perms' : undefined,
                    detailParams: missing.length ? {
                        perms: missing.map(p => p.name).join(', '),
                        permKeys: missing.map(p => p.key).join(',')
                    } : undefined
                });
            }
        } catch (e: any) {
            checks.push({ id: 'permissions', label: 'Bot権限', ok: false, detail: e.message, detailCode: 'error', detailParams: { message: e.message } });
        }
    } else {
        checks.push({ id: 'permissions', label: 'Bot権限', ok: false, detail: SKIPPED, detailCode: 'skipped' });
    }

    // 5. members_fetch
    if (checks[0].ok && checks[2].ok) {
        try {
            await fetchMembers(1);
            checks.push({ id: 'members_fetch', label: 'メンバー取得', ok: true });
        } catch (e: any) {
            checks.push({ id: 'members_fetch', label: 'メンバー取得', ok: false, detail: e.message, detailCode: 'error', detailParams: { message: e.message } });
        }
    } else {
        checks.push({ id: 'members_fetch', label: 'メンバー取得', ok: false, detail: SKIPPED, detailCode: 'skipped' });
    }

    return checks;
};

router.get('/check', async (req, res) => {
    const cfg = loadConfig();
    if (!cfg.token || !cfg.guildId) {
        return res.json({ ok: false, checks: [{ id: 'config', label: '設定', ok: false, detail: '未設定' }] });
    }
    try {
        const checks = await runChecks(cfg);
        res.json({ ok: checks.every(c => c.ok), checks });
    } catch (e: any) {
        res.status(500).json({ ok: false, code: 'INTERNAL', message: e.message });
    }
});

export default router;
