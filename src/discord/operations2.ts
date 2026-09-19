import {
    createCategory,
    createChannel,
    postMessage,
    postFile,
    deleteChannel,
    fetchMembers,
    fetchChannels,
    getGuildId,
    getBotUser
} from './client2';
import { getPresets, getAssetPath } from '../data';
import {
    VIEW_CHANNEL,
    SEND_MESSAGES,
    ATTACH_FILES,
    READ_MESSAGE_HISTORY
} from './permissions';
import fs from 'fs';

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export const getGuildMembers = async (limit = 1000, after?: string) => {
    try {
        const fetchAll = limit === undefined || limit >= PAGE_SIZE;

        const mapMember = (m: any) => ({
            id: m.user.id,
            username: m.user.username,
            discriminator: m.user.discriminator,
            global_name: m.user.global_name,
            avatar: m.user.avatar
        });

        if (!fetchAll) {
            const members = await fetchMembers(limit, after) as any[];
            return members.filter((m: any) => !m.user.bot).map(mapMember);
        }

        const all: any[] = [];
        let cursor = after;
        for (let page = 0; page < MAX_PAGES; page++) {
            const members = await fetchMembers(PAGE_SIZE, cursor) as any[];
            all.push(...members);
            if (members.length < PAGE_SIZE) break;
            cursor = members[members.length - 1].user.id;
        }
        return all.filter((m: any) => !m.user.bot).map(mapMember);
    } catch (e) {
        console.error("Error fetching members:", e);
        throw e;
    }
};

export const getGuildCategories = async () => {
    try {
        const channels = await fetchChannels();
        const childrenOf = (catId: string) => channels.filter((c: any) => c.parent_id === catId);
        return channels
            .filter((c: any) => c.type === 4) // 4 = GUILD_CATEGORY
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .map((c: any) => {
                const children = childrenOf(c.id);
                return {
                    id: c.id,
                    name: c.name,
                    position: c.position ?? 0,
                    childCount: children.length,
                    managed: children.some((ch: any) =>
                        typeof ch.topic === 'string' && ch.topic.includes('managed_by=local_preset_tool'))
                };
            });
    } catch (e) {
        console.error("Error fetching categories:", e);
        throw e;
    }
};

export const runCreate = async (presetId: string, categoryName: string, memberIds: string[], hiddenAccess: Record<string, string[]> = {}) => {
    console.log(`[runCreate] Starting for preset=${presetId}, category=${categoryName}, members=${memberIds.length}, hiddenAccessKeys=${Object.keys(hiddenAccess).length}`);
    const presets = getPresets();
    const preset = presets.find(p => p.presetId === presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);

    const guildId = getGuildId();
    if (!guildId) throw new Error("GUILD_ID not set");

    const result = {
        category: { id: '', name: categoryName },
        channels: [] as any[],
        errors: [] as string[]
    };

    try {
        const botUser: any = await getBotUser();

        const overwrites = [
            {
                id: guildId,
                type: 0,
                deny: VIEW_CHANNEL.toString()
            },
            {
                id: botUser.id,
                type: 1,
                // Discord rejects overwrites granting permissions the bot lacks (50013);
                // MANAGE_ROLES in a channel overwrite additionally requires Administrator.
                allow: (VIEW_CHANNEL | SEND_MESSAGES | ATTACH_FILES | READ_MESSAGE_HISTORY).toString()
            },
            ...memberIds.map(uid => ({
                id: uid,
                type: 1,
                allow: (VIEW_CHANNEL | SEND_MESSAGES).toString()
            }))
        ];

        const cat: any = await createCategory(categoryName, overwrites);
        result.category.id = cat.id;

        for (const ch of preset.channels) {
            try {
                const nowProp = new Date().toISOString();
                const topic = `managed_by=local_preset_tool; preset=${presetId}; created=${nowProp}`;

                let channelOverwrites = overwrites;
                if (ch.isHidden) {
                    const allowed = new Set(hiddenAccess[ch.key] ?? []);
                    channelOverwrites = overwrites.filter((o: any) => !memberIds.includes(o.id) || allowed.has(o.id));
                }

                const channelType = ch.type === 'voice' ? 2 : 0;
                const channel: any = await createChannel(ch.name, cat.id, channelOverwrites, topic, channelType);

                result.channels.push({ id: channel.id, name: channel.name, success: true });

                if (ch.type !== 'voice') {
                    const postDef = preset.posts.find(p => p.targetChannelKey === ch.key);
                    if (postDef) {
                        for (const item of postDef.items) {
                            try {
                                if (item.type === 'text') {
                                    if (item.content) await postMessage(channel.id, item.content);
                                } else if (item.type === 'file' && item.assetId) {
                                    const assetPath = getAssetPath(item.assetId);
                                    if (assetPath && fs.existsSync(assetPath)) {
                                        const data = fs.readFileSync(assetPath);
                                        await postFile(channel.id, item.caption || '', [{
                                            name: item.filename || item.assetId,
                                            data
                                        }]);
                                    }
                                }
                            } catch (e: any) {
                                result.errors.push(`Failed to post to ${channel.name}: ${e.message}`);
                            }
                        }
                    }
                }

            } catch (e: any) {
                let errorMsg = e.message;
                if (e.rawError) {
                    errorMsg += ` (Discord: ${JSON.stringify(e.rawError)})`;
                }
                result.channels.push({ name: ch.name, success: false, error: errorMsg });
                result.errors.push(`Failed to create channel ${ch.name}: ${errorMsg}`);
            }
        }

    } catch (e: any) {
        let errorMsg = e.message;
        if (e.rawError) {
            errorMsg += ` (Discord: ${JSON.stringify(e.rawError)})`;
        }
        if (e.code === 50013 || e.rawError?.code === 50013) {
            errorMsg = `Botの権限が不足しています（Discord 50013）。Botのロールに「チャンネルの管理」「ロールの管理」があるか、サーバー設定で確認してください。 ${errorMsg}`;
        }
        if (e.code === 60003 || e.rawError?.code === 60003) {
            errorMsg = `サーバー設定で「モデレーション操作に2段階認証を要求」が有効なため、Bot を作成したアカウントに2段階認証（2FA）を設定する必要があります。 ${errorMsg}`;
        }
        result.errors.push(`Execution failed: ${errorMsg}`);
    }

    return result;
};

export const runDelete = async (categoryIds: string[]) => {
    const results = [];

    // Delete children first, then the category itself
    let allChannels: any[] = [];
    try {
        if (getGuildId()) {
            allChannels = await fetchChannels();
        }
    } catch (e) {
        console.error("Failed to fetch channels for deletion logic", e);
        throw e;
    }

    for (const catId of categoryIds) {
        const result = { categoryId: catId, success: false, error: '' };
        try {
            // Find children
            const children = allChannels.filter((c: any) => c.parent_id === catId);

            // Delete children
            for (const child of children) {
                try {
                    await deleteChannel(child.id);
                } catch (e: any) {
                    console.error(`Failed to delete child ${child.id}:`, e);
                }
            }

            // Delete category
            await deleteChannel(catId);
            result.success = true;

        } catch (e: any) {
            let errorMsg = e.message;
            if (e.code === 50013 || e.rawError?.code === 50013 || e.code === 50001 || e.rawError?.code === 50001) {
                errorMsg = `Bot がこのカテゴリを閲覧・管理できません（このツール以外で作成された非公開カテゴリの可能性）。 ${errorMsg}`;
            }
            if (e.code === 60003 || e.rawError?.code === 60003) {
                errorMsg = `サーバー設定で「モデレーション操作に2段階認証を要求」が有効なため、Bot を作成したアカウントに2段階認証（2FA）を設定する必要があります。 ${errorMsg}`;
            }
            result.error = errorMsg;
        }
        results.push(result);
    }
    return results;
};
