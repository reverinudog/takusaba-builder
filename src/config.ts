import fs from 'fs';
import dotenv from 'dotenv';
import { CONFIG_FILE } from './paths';

export interface AppConfig {
    token: string;
    guildId: string;
    language?: string;
}

let cached: AppConfig | null = null;

export const loadConfig = (): AppConfig => {
    if (cached) return cached;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            cached = {
                token: raw.token || '',
                guildId: raw.guildId || '',
                language: raw.language
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
    cached = { ...cfg };
    // Lazy require to avoid circular dependency at module init
    const { applyConfig } = require('./discord/client2');
    applyConfig(cached);
};

// Partial update preserving fields not present in `partial`
export const updateConfig = (partial: Partial<AppConfig>): void => {
    saveConfig({ ...loadConfig(), ...partial });
};

export const isConfigured = (): boolean => {
    const cfg = loadConfig();
    return !!cfg.token && !!cfg.guildId;
};
