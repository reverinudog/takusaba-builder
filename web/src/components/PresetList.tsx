import { useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { Copy, Trash2, GripVertical, Search, X } from 'lucide-react';
import type { Preset } from '../types';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { useI18n } from '../i18n';
import { moveById } from './presetEditorState';
import styles from './PresetList.module.css';

type Props = {
    presets: Preset[];
    selectedId: string | null;
    // Name of a new, never-saved preset shown at the top of the list
    unsavedName: string | null;
    onSelect: (id: string) => void;
    onDuplicate: (preset: Preset, e: MouseEvent) => void;
    onDelete: (id: string, e: MouseEvent) => void;
    // Called once per completed drag with the full new id order
    onReorder: (ids: string[]) => void;
};

// Sidebar preset list: live name filter + drag-and-drop reorder.
// The drag preview order is local state, so the parent (and the whole
// editor) only re-renders once on drop. Dropping outside the list or
// pressing Esc cancels the drag and restores the original order.
export default function PresetList({ presets, selectedId, unsavedName, onSelect, onDuplicate, onDelete, onReorder }: Props) {
    const { t } = useI18n();
    const [filter, setFilter] = useState('');
    const [dragId, setDragId] = useState<string | null>(null);
    const [dragOrder, setDragOrder] = useState<string[] | null>(null);

    const byId = useMemo(() => new Map(presets.map(p => [p.presetId, p])), [presets]);
    const q = filter.trim().toLowerCase();
    const visible = useMemo(() => {
        const ordered = dragOrder
            ? dragOrder.map(id => byId.get(id)).filter((p): p is Preset => !!p)
            : presets;
        return q ? ordered.filter(p => p.presetName.toLowerCase().includes(q)) : ordered;
    }, [presets, byId, dragOrder, q]);

    const endDrag = () => {
        setDragId(null);
        setDragOrder(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        if (dragOrder && dragOrder.some((id, i) => id !== presets[i]?.presetId)) onReorder(dragOrder);
        endDrag();
    };

    return (
        <>
            {presets.length > 0 && (
                <div className={styles.filterWrap}>
                    <Search size={14} className={styles.filterIcon} />
                    <Input
                        className={styles.filterInput}
                        value={filter}
                        placeholder={t('preset.filterPh')}
                        aria-label={t('preset.filterPh')}
                        onChange={e => setFilter(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setFilter(''); }}
                    />
                    {filter && (
                        <button
                            type="button"
                            className={styles.filterClear}
                            aria-label={t('run.presetClear')}
                            title={t('run.presetClear')}
                            onClick={() => setFilter('')}
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            )}
            <div
                className={`${styles.list} stagger`}
                // Accept drops in the gaps between rows too
                onDragOver={e => { if (dragId) e.preventDefault(); }}
                onDrop={handleDrop}
            >
                {unsavedName !== null && (
                    <div className={`${styles.presetRow} ${styles.selected}`}>
                        <span className={styles.gripSpacer} />
                        <span className={styles.presetName}>{unsavedName}</span>
                        <Badge tone="warning">{t('unsaved.listBadge')}</Badge>
                    </div>
                )}
                {q && visible.length === 0 && (
                    <div className={styles.noMatch}>{t('run.presetNoMatch')}</div>
                )}
                {visible.map((p, i) => (
                    <div
                        key={p.presetId}
                        className={`${styles.presetRow} ${selectedId === p.presetId ? styles.selected : ''} ${dragId === p.presetId ? styles.dragging : ''}`}
                        style={{ '--i': i } as CSSProperties}
                        onClick={() => onSelect(p.presetId)}
                        draggable
                        onDragStart={e => {
                            e.dataTransfer.effectAllowed = 'move';
                            setDragId(p.presetId);
                            setDragOrder(presets.map(x => x.presetId));
                        }}
                        onDragOver={e => {
                            if (!dragId) return;
                            e.preventDefault();
                            if (dragId !== p.presetId) {
                                setDragOrder(o => o && moveById(o, dragId, p.presetId));
                            }
                        }}
                        onDragEnd={endDrag}
                    >
                        <span className={styles.grip} title={t('preset.dragHint')}>
                            <GripVertical size={13} />
                        </span>
                        <span className={styles.presetName}>{p.presetName}</span>
                        <div className={styles.rowActions}>
                            <IconButton size="sm" title={t('preset.duplicate')} onClick={e => onDuplicate(p, e)}>
                                <Copy size={13} />
                            </IconButton>
                            <IconButton size="sm" tone="danger" title={t('preset.delete')} onClick={e => onDelete(p.presetId, e)}>
                                <Trash2 size={13} />
                            </IconButton>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
