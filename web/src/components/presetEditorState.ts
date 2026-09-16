import type { Preset, PresetChannel, PresetPostItem } from '../types';

const move = <T>(arr: T[], from: number, to: number): T[] => {
    const next = [...arr];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    return next;
};

// Applies fn to the items array of the posts entry for channelKey.
// Returns the preset unchanged if no such posts entry exists.
const mapPostItems = (preset: Preset, channelKey: string, fn: (items: PresetPostItem[]) => PresetPostItem[]): Preset => {
    const idx = preset.posts.findIndex(p => p.targetChannelKey === channelKey);
    if (idx === -1) return preset;
    const posts = [...preset.posts];
    posts[idx] = { ...posts[idx], items: fn(posts[idx].items) };
    return { ...preset, posts };
};

export const updateChannel = (preset: Preset, idx: number, patch: Partial<PresetChannel>): Preset => ({
    ...preset,
    channels: preset.channels.map((ch, i) => (i === idx ? { ...ch, ...patch } : ch))
});

export const addChannel = (preset: Preset, type: 'text' | 'voice'): Preset => ({
    ...preset,
    channels: [
        ...preset.channels,
        {
            key: crypto.randomUUID(),
            name: type === 'voice' ? '新規ボイスチャンネル' : '新規テキストチャンネル',
            type
        }
    ]
});

// Also drops the channel's posts entry so no orphan data remains.
export const removeChannel = (preset: Preset, idx: number): Preset => {
    const removed = preset.channels[idx];
    return {
        ...preset,
        channels: preset.channels.filter((_, i) => i !== idx),
        posts: removed ? preset.posts.filter(p => p.targetChannelKey !== removed.key) : preset.posts
    };
};

export const moveChannel = (preset: Preset, from: number, to: number): Preset => ({
    ...preset,
    channels: move(preset.channels, from, to)
});

export const movePostItem = (preset: Preset, channelKey: string, from: number, to: number): Preset =>
    mapPostItems(preset, channelKey, items => move(items, from, to));

export const addPostItem = (preset: Preset, channelKey: string, type: 'text' | 'file'): Preset => {
    const newItem: PresetPostItem = type === 'text'
        ? { type: 'text', content: '' }
        : { type: 'file', assetId: '', filename: '', caption: '' };
    const idx = preset.posts.findIndex(p => p.targetChannelKey === channelKey);
    if (idx === -1) {
        return { ...preset, posts: [...preset.posts, { targetChannelKey: channelKey, items: [newItem] }] };
    }
    return mapPostItems(preset, channelKey, items => [...items, newItem]);
};

export const updatePostItem = (preset: Preset, channelKey: string, idx: number, patch: Partial<PresetPostItem>): Preset =>
    mapPostItems(preset, channelKey, items => items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

// An emptied posts entry is kept (harmless on save/load).
export const removePostItem = (preset: Preset, channelKey: string, idx: number): Preset =>
    mapPostItems(preset, channelKey, items => items.filter((_, i) => i !== idx));

export const duplicatePreset = (preset: Preset): Preset => ({
    ...JSON.parse(JSON.stringify(preset)),
    presetId: crypto.randomUUID(),
    presetName: `${preset.presetName} のコピー`
});
