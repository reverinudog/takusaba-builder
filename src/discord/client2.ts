import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { loadConfig, AppConfig } from '../config';

const rest = new REST({ version: '10' }).setToken(loadConfig().token || '');

export const applyConfig = (cfg: AppConfig) => {
    rest.setToken(cfg.token || '');
};

export const getClient = () => rest;
export const getGuildId = () => loadConfig().guildId || undefined;

export const getBotUser = async () => {
    return rest.get(Routes.user());
};

export const fetchMembers = async (limit = 1000, after?: string) => {
    const guildId = getGuildId();
    if (!guildId) throw new Error("GUILD_ID not set");
    const query = new URLSearchParams({ limit: limit.toString() });
    if (after) query.append('after', after);

    return rest.get(Routes.guildMembers(guildId), { query });
};

export const fetchChannels = async () => {
    const guildId = getGuildId();
    if (!guildId) throw new Error("GUILD_ID not set");
    return (await rest.get(Routes.guildChannels(guildId))) as any[];
};

export const fetchCategories = async () => {
    const channels = await fetchChannels();
    return channels.filter((c: any) => c.type === 4); // 4 = GUILD_CATEGORY
};

export const createCategory = async (name: string, permissionOverwrites: any[]) => {
    const guildId = getGuildId();
    if (!guildId) throw new Error("GUILD_ID not set");
    return rest.post(Routes.guildChannels(guildId), {
        body: {
            name,
            type: 4, // GUILD_CATEGORY
            permission_overwrites: permissionOverwrites
        }
    });
};

export const createChannel = async (name: string, parentId: string, permissionOverwrites?: any[], topic?: string, type: number = 0) => {
    const guildId = getGuildId();
    if (!guildId) throw new Error("GUILD_ID not set");
    const body: Record<string, any> = {
        name,
        type, // 0 = GUILD_TEXT, 2 = GUILD_VOICE
        parent_id: parentId,
    };
    if (permissionOverwrites) {
        body.permission_overwrites = permissionOverwrites;
    }
    if (topic && type !== 2) {
        body.topic = topic;
    }
    return rest.post(Routes.guildChannels(guildId), { body });
};

export const deleteChannel = async (channelId: string) => {
    return rest.delete(Routes.channel(channelId));
};

export const postMessage = async (channelId: string, content: string) => {
    return rest.post(Routes.channelMessages(channelId), {
        body: { content }
    });
};

// For file uploads, we need to handle FormData. @discordjs/rest handles files if passed in options.
// But implementation is slightly different.
export const postFile = async (channelId: string, content: string, files: { name: string, data: Buffer }[]) => {
    return rest.post(Routes.channelMessages(channelId), {
        body: { content },
        files: files
    });
};
