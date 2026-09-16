import fs from 'fs';
import dotenv from 'dotenv';
import { CONFIG_FILE } from './paths';

export interface AppConfig {
    token: string;
    guildId: string;
    language?: string;
}

// Stored-file shape: { tokenEnc?: string; token?: string; guildId: string; language?: string }
// — never write both `token` and `tokenEnc`.
interface StoredConfig {
    tokenEnc?: string;
    token?: string;
    guildId?: string;
    language?: string;
}

export type SecretCodec = { encrypt: (plain: string) => string; decrypt: (enc: string) => string }; // both sides base64 text
let codec: SecretCodec | null = null;

let cached: AppConfig | null = null;

export const setSecretCodec = (c: SecretCodec | null) => { codec = c; cached = null; };

const writeStored = (cfg: AppConfig): void => {
    const stored: StoredConfig = {
        guildId: cfg.guildId,
        language: cfg.language
    };
    if (codec && cfg.token) {
        stored.tokenEnc = codec.encrypt(cfg.token);
    } else {
        stored.token = cfg.token;
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(stored, null, 2));
};

export const loadConfig = (): AppConfig => {
    if (cached) return cached;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw: StoredConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            let token = '';
            if (raw.tokenEnc) {
                if (codec) {
                    try {
                        token = codec.decrypt(raw.tokenEnc);
                    } catch (e) {
                        console.error('Failed to decrypt config token:', e);
                    }
                } else {
                    console.warn('config.json token is encrypted; run inside the packaged app');
                }
            } else if (raw.token) {
                token = raw.token;
                // Migrate plaintext → encrypted now that a codec is available
                if (codec) {
                    const migrated: AppConfig = { token, guildId: raw.guildId || '', language: raw.language };
                    try {
                        writeStored(migrated);
                    } catch (e) {
                        console.error('Failed to migrate config token:', e);
                    }
                }
            }
            cached = {
                token,
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
    writeStored(cfg);
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
