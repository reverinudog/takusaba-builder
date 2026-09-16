import fs from 'fs';
import dotenv from 'dotenv';
import { CONFIG_FILE } from './paths';

export interface AppConfig {
    token: string;
    guildId: string;
}

let cached: AppConfig | null = null;

export const loadConfig = (): AppConfig => {
    if (cached) return cached;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            cached = {
                token: raw.token || '',
                guildId: raw.guildId || ''
            };
            return cached;
        } catch (e) {
            console.error('Failed to read config.json:', e);
        }
    }
    dotenv.config();
    cached = {
        token: process.env.DISCORD_BOT_TOKEN || '',
        guildId: process.env.GUILD_ID || ''
    };
    return cached;
};

export const saveConfig = (cfg: AppConfig): void => {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    cached = { token: cfg.token, guildId: cfg.guildId };
    // Lazy require to avoid circular dependency at module init
    const { applyConfig } = require('./discord/client2');
    applyConfig(cached);
};

export const isConfigured = (): boolean => {
    const cfg = loadConfig();
    return !!cfg.token && !!cfg.guildId;
};
