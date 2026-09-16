import type { ja } from './ja';

export type Lang = 'ja' | 'en' | 'ko' | 'zh-Hans' | 'zh-Hant';

export const LANGS: { code: Lang; label: string }[] = [
    { code: 'ja', label: '日本語' },
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'zh-Hans', label: '简体中文' },
    { code: 'zh-Hant', label: '繁體中文' }
];

export type Messages = Record<keyof typeof ja, string>;
