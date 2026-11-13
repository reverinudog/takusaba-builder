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

const readStored = (): StoredConfig => {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) ?? {};
    } catch {
        return {};
    }
};

// Partial update preserving fields not present in `partial`.
// When the token is not being changed, the stored token fields are copied
// verbatim: re-encoding the in-memory token would wipe `tokenEnc` whenever it
// could not be decrypted (no codec in a dev run, OS key change, ...).
export const updateConfig = (partial: Partial<AppConfig>): void => {
    if (partial.token !== undefined) {
        saveConfig({ ...loadConfig(), ...partial });
        return;
    }
    const stored: StoredConfig = { ...readStored() };
    if (partial.guildId !== undefined) stored.guildId = partial.guildId;
    if (partial.language !== undefined) stored.language = partial.language;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(stored, null, 2));
    // Token is unchanged, so the REST client needs no re-apply
    cached = { ...loadConfig(), ...partial };
};

export const isConfigured = (): boolean => {
    const cfg = loadConfig();
    return !!cfg.token && !!cfg.guildId;
};
