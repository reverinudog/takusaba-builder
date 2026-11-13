import fs from 'fs';
import path from 'path';
import { Preset, Asset } from './types';
import { PRESETS_FILE, ASSETS_DIR } from './paths';

export const getPresets = (): Preset[] => {
    if (!fs.existsSync(PRESETS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(PRESETS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
};

export const savePreset = (preset: Preset): void => {
    const presets = getPresets();
    const index = presets.findIndex((p) => p.presetId === preset.presetId);
    if (index !== -1) {
        presets[index] = preset;
    } else {
        presets.push(preset);
    }
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
};

export const deletePreset = (presetId: string): void => {
    const presets = getPresets();
    const newPresets = presets.filter((p) => p.presetId !== presetId);
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(newPresets, null, 2));
};

// Reorders presets to follow `ids`. Unknown ids are ignored; presets missing
// from `ids` keep their relative order at the end, so nothing is ever dropped.
export const reorderPresets = (ids: string[]): void => {
    const presets = getPresets();
    const rank = new Map(ids.map((id, i) => [id, i]));
    const ordered = presets
        .map((p, i) => ({ p, i }))
        .sort((a, b) => {
            const ra = rank.get(a.p.presetId) ?? ids.length + a.i;
            const rb = rank.get(b.p.presetId) ?? ids.length + b.i;
            return ra - rb;
        })
        .map(x => x.p);
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(ordered, null, 2));
};

export const getAssetPath = (assetId: string): string | null => {
    // In a real app we might store metadata separately, but here we assume filename is assetId or we scan dir
    // The requirement says "presets.json doesn't store absolute path, only assetId".
    // We need to resolve assetId to filename.
    // Simplest way: assetId IS the filename (uuid + extension)
    // Or we scan the directory for files starting with assetId.

    if (typeof assetId !== 'string' || !/^[\w.-]{1,120}$/.test(assetId) || assetId.startsWith('.')) return null;
    if (!fs.existsSync(ASSETS_DIR)) return null;
    const files = fs.readdirSync(ASSETS_DIR);
    const file = files.find(f => f.startsWith(assetId));
    if (!file) return null;
    const resolved = path.resolve(ASSETS_DIR, file);
    if (!resolved.startsWith(path.resolve(ASSETS_DIR) + path.sep)) return null;
    return resolved;
};
