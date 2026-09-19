import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import { Search, ChevronDown, X, Check, Lock } from 'lucide-react';
import type { Preset } from '../types';
import { useI18n } from '../i18n';
import styles from './PresetPicker.module.css';

type Props = {
    presets: Preset[];
    value: string;
    onChange: (id: string) => void;
    onBlur?: () => void;
    invalid?: boolean;
};

export default function PresetPicker({ presets, value, onChange, onBlur, invalid }: Props) {
    const { t } = useI18n();
    const selected = presets.find(p => p.presetId === value);
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const openPicker = () => {
        if (open) return;
        setText('');
        setOpen(true);
        setActiveIndex(-1);
    };

    const filtered = useMemo(() => {
        const q = text.trim().toLowerCase();
        if (!q) return presets;
        return presets.filter(p => p.presetName.toLowerCase().includes(q));
    }, [presets, text]);

    const close = () => {
        setOpen(false);
        setActiveIndex(-1);
        setText('');
        onBlur?.();
    };

    const select = (p: Preset) => {
        onChange(p.presetId);
        setText('');
        setOpen(false);
        setActiveIndex(-1);
        onBlur?.();
    };

    const clear = () => {
        onChange('');
        setText('');
        setOpen(false);
        setActiveIndex(-1);
        onBlur?.();
    };

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    });

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
                setOpen(true);
                setActiveIndex(0);
                return;
            }
            if (filtered.length === 0) return;
            setActiveIndex(i => {
                const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
                return (next + filtered.length) % filtered.length;
            });
        } else if (e.key === 'Enter') {
            if (open && activeIndex >= 0 && filtered[activeIndex]) {
                e.preventDefault();
                select(filtered[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            if (open) {
                e.preventDefault();
                close();
            }
        }
    };

    useEffect(() => {
        if (activeIndex < 0 || !listRef.current) return;
        listRef.current.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    return (
        <div className={styles.wrap} ref={wrapRef}>
            <span className={styles.leadIcon}><Search size={16} /></span>
            <input
                className={`${styles.input} ${invalid ? styles.invalid : ''}`}
                role="combobox"
                aria-expanded={open}
                aria-controls="preset-picker-list"
                aria-autocomplete="list"
                placeholder={t('run.presetSearchPh')}
                value={open ? text : (selected?.presetName ?? '')}
                onChange={e => {
                    setText(e.target.value);
                    setOpen(true);
                    setActiveIndex(-1);
                }}
                onFocus={openPicker}
                onClick={openPicker}
                onKeyDown={onKeyDown}
                onBlur={() => { if (open) close(); }}
            />
            {selected && (
                <button
                    type="button"
                    className={styles.clearBtn}
                    title={t('run.presetClear')}
                    aria-label={t('run.presetClear')}
                    onMouseDown={e => e.preventDefault()}
                    onClick={clear}
                >
                    <X size={14} />
                </button>
            )}
            <button
                type="button"
                className={styles.toggleBtn}
                tabIndex={-1}
                aria-label={t('run.preset')}
                onMouseDown={e => e.preventDefault()}
                onClick={() => (open ? close() : openPicker())}
            >
                <ChevronDown size={16} />
            </button>
            {open && (
                <ul
                    id="preset-picker-list"
                    className={`${styles.dropdown} anim-fade`}
                    role="listbox"
                    ref={listRef}
                    onMouseDown={e => e.preventDefault()}
                >
                    {filtered.length === 0 && (
                        <li className={styles.noMatch}>{t('run.presetNoMatch')}</li>
                    )}
                    {filtered.map((p, i) => {
                        const hasHidden = p.channels.some(c => c.isHidden);
                        return (
                            <li
                                key={p.presetId}
                                role="option"
                                aria-selected={p.presetId === value}
                                className={`${styles.option} ${i === activeIndex ? styles.active : ''} ${p.presetId === value ? styles.selected : ''}`}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => select(p)}
                                onMouseEnter={() => setActiveIndex(i)}
                            >
                                <span className={styles.optCheck}>
                                    {p.presetId === value && <Check size={14} />}
                                </span>
                                <span className={styles.optName}>{p.presetName}</span>
                                <span className={styles.optMeta}>
                                    {t('run.confirm.channelsVal', { n: p.channels.length })}
                                    {hasHidden && (
                                        <span className={styles.optHidden}>
                                            <Lock size={11} /> {t('run.presetHiddenMeta')}
                                        </span>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
