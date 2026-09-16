import { createContext, createElement, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ja } from './ja';
import { en } from './en';
import { ko } from './ko';
import { zhHans } from './zh-Hans';
import { zhHant } from './zh-Hant';
import type { Lang, Messages } from './types';
import { LANGS } from './types';

export type { Lang, Messages };
export { LANGS };

export type MsgKey = keyof typeof ja;

const DICTS: Partial<Record<Lang, Messages>> = {
    ja, en, ko,
    'zh-Hans': zhHans,
    'zh-Hant': zhHant
};

export const LANG_STORAGE_KEY = 'takusaba.lang';

export const detectLang = (nav: string): Lang => {
    const l = (nav || '').toLowerCase();
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('zh')) {
        if (l === 'zh-tw' || l === 'zh-hk' || l.startsWith('zh-hant')) return 'zh-Hant';
        return 'zh-Hans';
    }
    return 'en';
};

export const storedLang = (): Lang | null => {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return (LANGS.some(l => l.code === v) ? v : null) as Lang | null;
};

interface I18nCtx {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: MsgKey, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

const applyDomLang = (l: Lang) => {
    document.documentElement.lang = l;
};

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => storedLang() ?? detectLang(navigator.language));

    const setLang = useCallback((l: Lang) => {
        setLangState(l);
        localStorage.setItem(LANG_STORAGE_KEY, l);
        applyDomLang(l);
        fetch('/api/setup/language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: l })
        }).catch(() => { /* server persistence is best-effort */ });
    }, []);

    useEffect(() => { applyDomLang(lang); }, [lang]);

    const t = useCallback((key: MsgKey, params?: Record<string, string | number>): string => {
        const dict = DICTS[lang] ?? en;
        let s: string = dict[key] ?? (en as Messages)[key] ?? (ja as Messages)[key] ?? String(key);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                s = s.replaceAll(`{${k}}`, String(v));
            }
        }
        return s;
    }, [lang]);

    return createElement(Ctx.Provider, { value: { lang, setLang, t } }, children);
}

export const useI18n = (): I18nCtx => {
    const c = useContext(Ctx);
    if (!c) throw new Error('useI18n must be used inside I18nProvider');
    return c;
};

// Translate an ApiError when a localized `error.<code>` message exists,
// otherwise fall back to the server-provided message.
export const apiErrMsg = (t: I18nCtx['t'], e: unknown): string => {
    const code = (e as { code?: string })?.code;
    if (code) {
        const key = `error.${code}` as MsgKey;
        const msg = t(key);
        if (msg !== key) return msg;
    }
    const msg = (e as { message?: string })?.message;
    if (typeof msg === 'string' && msg) return msg;
    return e instanceof Error ? e.message : String(e);
};
