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

export const getAssetPath = (assetId: string): string | null => {
    // In a real app we might store metadata separately, but here we assume filename is assetId or we scan dir
    // The requirement says "presets.json doesn't store absolute path, only assetId".
    // We need to resolve assetId to filename.
    // Simplest way: assetId IS the filename (uuid + extension)
    // Or we scan the directory for files starting with assetId.

    if (!fs.existsSync(ASSETS_DIR)) return null;
    const files = fs.readdirSync(ASSETS_DIR);
    const file = files.find(f => f.startsWith(assetId));
    return file ? path.join(ASSETS_DIR, file) : null;
};
