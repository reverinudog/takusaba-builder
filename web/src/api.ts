import type { Preset } from './types';

const API_BASE = '/api';

export class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
        let body: { error?: string, code?: string, message?: string } | null = null;
        try {
            body = await res.json();
        } catch {
            // non-JSON error body
        }
        const code = body?.error ?? body?.code;
        if (res.status === 409 && code === 'NOT_CONFIGURED') {
            throw new ApiError('セットアップが完了していません。左下の「セットアップ」から設定してください。', res.status, 'NOT_CONFIGURED');
        }
        throw new ApiError(body?.error ?? body?.message ?? `HTTP ${res.status}`, res.status, code);
    }
    return res.json();
};

export const getPresets = async (): Promise<Preset[]> => {
    return request('/presets');
};

export const savePreset = async (preset: Preset): Promise<{ success: boolean, preset: Preset }> => {
    return request('/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset)
    });
};

export const deletePreset = async (presetId: string): Promise<void> => {
    return request(`/presets/${presetId}`, { method: 'DELETE' });
};

export const uploadAsset = async (file: File): Promise<{ assetId: string, path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/assets/upload', {
        method: 'POST',
        body: formData
    });
};

export type Member = { id: string, username: string, discriminator: string, global_name: string | null, avatar: string | null };
export const getMembers = async (limit?: number, after?: string): Promise<Member[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (after) params.append('after', after);
    return request(`/guild/members?${params.toString()}`);
};

export type Category = { id: string, name: string, position: number, childCount: number, managed: boolean };
export const getCategories = async (): Promise<Category[]> => {
    return request('/guild/categories');
};

export const getDebugMembersRaw = async (): Promise<unknown> => {
    return request('/debug/members-raw');
};

export type RunCreateResult = {
    category: { id: string, name: string },
    channels: { id?: string, name: string, success: boolean, error?: string }[],
    errors: string[]
};
export const runCreate = async (presetId: string, categoryName: string, memberIds: string[]): Promise<RunCreateResult> => {
    return request('/run/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId, categoryName, memberIds })
    });
};

export type SetupStatus = {
    configured: boolean,
    hasToken: boolean,
    guildId: string,
    guildName: string | null,
    packaged: boolean,
    port: number,
    dataDir: string
};
export const getSetupStatus = async (): Promise<SetupStatus> => {
    return request('/setup/status');
};

export type VerifyTokenResult =
    | { ok: true, bot: { id: string, username: string, avatar: string | null }, application: { id: string, name: string, flags: number, botPublic: boolean }, intents: { guildMembers: boolean }, inviteUrl: string }
    | { ok: false, code: string, message: string };
export const verifyToken = async (token: string): Promise<VerifyTokenResult> => {
    return request('/setup/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
};

export type ListGuildsResult =
    | { ok: true, guilds: { id: string, name: string, icon: string | null }[] }
    | { ok: false, code: string, message: string };
export const listGuilds = async (token: string): Promise<ListGuildsResult> => {
    return request('/setup/guilds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
};

export const saveSetup = async (token: string, guildId: string): Promise<{ ok: true }> => {
    return request('/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, guildId })
    });
};

export type SetupCheckItem = { id: string, label: string, ok: boolean, detail?: string };
export type SetupCheckResult = { ok: boolean, checks: SetupCheckItem[] };
export const runSetupCheck = async (): Promise<SetupCheckResult> => {
    return request('/setup/check');
};

export const openDataDir = async (): Promise<{ ok: boolean }> => {
    return request('/system/open-data-dir', { method: 'POST' });
};

export type RunDeleteResult = { categoryId: string, success: boolean, error?: string }[];
export const runDelete = async (categoryIds: string[]): Promise<RunDeleteResult> => {
    return request('/run/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds })
    });
};
