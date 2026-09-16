import { useRef, useState, useEffect, type CSSProperties } from 'react';
import {
    Plus, Copy, Trash2, GripVertical, Hash, Volume2, Lock, Unlock,
    X, Type, ImagePlus, Save, LayoutList, MousePointerClick
} from 'lucide-react';
import type { Preset, PresetPostItem } from '../types';
import * as api from '../api';
import * as editor from './presetEditorState';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Field from '../ui/Field';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast, errMsg } from '../ui/toastContext';
import { useUnsaved } from '../ui/unsavedContext';
import styles from './PresetEditor.module.css';

export default function PresetEditor() {
    const toast = useToast();
    const { setDirty } = useUnsaved();
    const [presets, setPresets] = useState<Preset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
    const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDeletePreset, setConfirmDeletePreset] = useState<string | null>(null);
    const [confirmDeleteChannel, setConfirmDeleteChannel] = useState<number | null>(null);
    const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

    const isDirty = editingPreset !== null && JSON.stringify(editingPreset) !== savedSnapshot;

    useEffect(() => {
        setDirty(isDirty);
        return () => setDirty(false);
    }, [isDirty, setDirty]);

    useEffect(() => {
        loadPresets();
    }, []);

    const loadPresets = async () => {
        setLoading(true);
        try {
            const data = await api.getPresets();
            setPresets(data);
        } catch (e) {
            toast(errMsg(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Runs action immediately, or defers it behind the discard-confirm dialog when dirty.
    const guardDirty = (action: () => void) => {
        if (isDirty) setPendingDiscard(() => action);
        else action();
    };

    const openPreset = (preset: Preset) => {
        // Deep copy to disconnect from list state while editing
        const copy: Preset = JSON.parse(JSON.stringify(preset));
        setEditingPreset(copy);
        setSavedSnapshot(JSON.stringify(copy));
        setSelectedPresetId(preset.presetId);
    };

    const handleCreate = () => guardDirty(() => {
        const newPreset: Preset = {
            presetId: crypto.randomUUID(),
            presetName: '無題のプリセット',
            channels: [],
            posts: []
        };
        setEditingPreset(newPreset);
        setSavedSnapshot(null);
        setSelectedPresetId(newPreset.presetId);
    });

    const handleSelect = (id: string) => guardDirty(() => {
        const preset = presets.find(p => p.presetId === id);
        if (preset) openPreset(preset);
    });

    const handleSave = async () => {
        if (!editingPreset) return;
        if (editingPreset.channels.length === 0) {
            toast('最低1つのチャンネル構成が必要です', 'error');
            return;
        }
        const saved = editingPreset;
        setLoading(true);
        try {
            await api.savePreset(saved);
            await loadPresets();
            setSavedSnapshot(JSON.stringify(saved));
            toast('保存しました', 'success');
        } catch (e) {
            toast(errMsg(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = (sourcePreset: Preset, e: React.MouseEvent) => {
        e.stopPropagation();
        guardDirty(async () => {
            const duplicatedPreset = editor.duplicatePreset(sourcePreset);
            setLoading(true);
            try {
                await api.savePreset(duplicatedPreset);
                await loadPresets();
                setSelectedPresetId(duplicatedPreset.presetId);
                setEditingPreset(duplicatedPreset);
                setSavedSnapshot(JSON.stringify(duplicatedPreset));
            } catch (err) {
                toast(errMsg(err), 'error');
            } finally {
                setLoading(false);
            }
        });
    };

    const requestDeletePreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        guardDirty(() => setConfirmDeletePreset(id));
    };

    const handleDeleteById = async (id: string) => {
        setConfirmDeletePreset(null);
        setLoading(true);
        try {
            await api.deletePreset(id);
            if (selectedPresetId === id) {
                setEditingPreset(null);
                setSavedSnapshot(null);
                setSelectedPresetId(null);
            }
            await loadPresets();
        } catch (err) {
            toast(errMsg(err), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Drag and Drop Logic for Channels
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const moveChannel = (fromIdx: number, toIdx: number) => {
        setEditingPreset(p => p && editor.moveChannel(p, fromIdx, toIdx));
    };

    // Drag and Drop Logic for Posts
    const [draggedPostItem, setDraggedPostItem] = useState<{ channelKey: string, idx: number } | null>(null);

    const movePostItem = (channelKey: string, fromIdx: number, toIdx: number) => {
        setEditingPreset(p => p && editor.movePostItem(p, channelKey, fromIdx, toIdx));
    };

    // Post Items Utility
    const addPostItem = (channelKey: string, type: 'text' | 'file') => {
        setEditingPreset(p => p && editor.addPostItem(p, channelKey, type));
    };

    const updatePostItem = (channelKey: string, index: number, updates: Partial<PresetPostItem>) => {
        setEditingPreset(p => p && editor.updatePostItem(p, channelKey, index, updates));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, channelKey: string, index: number) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        try {
            const uploadedAsset = await api.uploadAsset(file);
            updatePostItem(channelKey, index, {
                assetId: uploadedAsset.assetId,
                filename: file.name
            });
        } catch (err) {
            toast('アップロード失敗: ' + errMsg(err), 'error');
        }
    };

    const removePostItem = (channelKey: string, index: number) => {
        setEditingPreset(p => p && editor.removePostItem(p, channelKey, index));
    };

    const deleteChannel = (idx: number) => {
        setEditingPreset(p => p && editor.removeChannel(p, idx));
        setConfirmDeleteChannel(null);
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar: Preset List */}
            <div className={styles.listPane}>
                <Button icon={<Plus size={16} />} onClick={handleCreate}>新規プリセット</Button>
                <div className={styles.listHeading}>プリセット</div>
                {presets.length === 0 && !editingPreset ? (
                    <EmptyState
                        icon={<LayoutList size={28} />}
                        title="プリセットがありません"
                        description="卓で毎回使うチャンネル構成をテンプレとして登録できます"
                    />
                ) : (
                    <div className={`${styles.list} stagger`}>
                        {editingPreset && !presets.some(p => p.presetId === editingPreset.presetId) && (
                            <div className={`${styles.presetRow} ${styles.selected}`}>
                                <span className={styles.presetName}>{editingPreset.presetName}</span>
                                <Badge tone="warning">未保存</Badge>
                            </div>
                        )}
                        {presets.map((p, i) => (
                            <div
                                key={p.presetId}
                                className={`${styles.presetRow} ${selectedPresetId === p.presetId ? styles.selected : ''}`}
                                style={{ '--i': i } as CSSProperties}
                                onClick={() => handleSelect(p.presetId)}
                            >
                                <span className={styles.presetName}>{p.presetName}</span>
                                <div className={styles.rowActions}>
                                    <IconButton size="sm" title="複製" onClick={(e) => handleDuplicate(p, e)}>
                                        <Copy size={13} />
                                    </IconButton>
                                    <IconButton size="sm" tone="danger" title="削除" onClick={(e) => requestDeletePreset(p.presetId, e)}>
                                        <Trash2 size={13} />
                                    </IconButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main: Editor */}
            <div className={styles.editorPane}>
                {editingPreset ? (
                    <>
                        <div className={styles.editorScroll}>
                            <div className={styles.editorInner}>
                                <Field label="プリセット名">
                                    <Input
                                        className={styles.nameInput}
                                        value={editingPreset.presetName}
                                        onChange={e => setEditingPreset({ ...editingPreset, presetName: e.target.value })}
                                        placeholder="例：クトゥルフ 1卓用テンプレ"
                                    />
                                </Field>

                                {/* Channels Section */}
                                <Card
                                    header="チャンネル構成"
                                    actions={
                                        <>
                                            <Button variant="secondary" size="sm" icon={<Hash size={16} />} onClick={() => setEditingPreset(p => p && editor.addChannel(p, 'text'))}>テキスト</Button>
                                            <Button variant="secondary" size="sm" icon={<Volume2 size={16} />} onClick={() => setEditingPreset(p => p && editor.addChannel(p, 'voice'))}>ボイス</Button>
                                        </>
                                    }
                                >
                                    <div className={styles.cardHint}>
                                        チャンネル名はそのまま Discord に作られます。秘匿 ＝ 参加者には見せず GM だけが見えるチャンネル（例: GM用メモ）。
                                    </div>
                                    {editingPreset.channels.length === 0 ? (
                                        <div className={styles.emptyChannels}>チャンネルがありません</div>
                                    ) : (
                                        <div className={styles.channelList}>
                                            {editingPreset.channels.map((ch, idx) => (
                                                <div
                                                    key={ch.key}
                                                    className={`${styles.channelRow} ${draggedIdx === idx ? styles.dragging : ''}`}
                                                    draggable
                                                    onDragStart={() => setDraggedIdx(idx)}
                                                    onDragEnd={() => setDraggedIdx(null)}
                                                    onDragOver={e => {
                                                        e.preventDefault();
                                                        if (draggedIdx !== null && draggedIdx !== idx) {
                                                            moveChannel(draggedIdx, idx);
                                                            setDraggedIdx(idx);
                                                        }
                                                    }}
                                                >
                                                    <span className={styles.grip}><GripVertical size={16} /></span>
                                                    <div className={styles.typeSelect}>
                                                        <Select
                                                            value={ch.type || 'text'}
                                                            onChange={e => setEditingPreset(p => p && editor.updateChannel(p, idx, { type: e.target.value as 'text' | 'voice' }))}
                                                        >
                                                            <option value="text">テキスト</option>
                                                            <option value="voice">ボイス</option>
                                                        </Select>
                                                    </div>
                                                    <Input
                                                        value={ch.name}
                                                        onChange={e => setEditingPreset(p => p && editor.updateChannel(p, idx, { name: e.target.value }))}
                                                    />
                                                    <button
                                                        className={`${styles.hiddenToggle} ${ch.isHidden ? styles.hidden : ''}`}
                                                        onClick={() => setEditingPreset(p => p && editor.updateChannel(p, idx, { isHidden: !ch.isHidden }))}
                                                        title={ch.isHidden ? '秘匿チャンネル（クリックで公開に変更）' : '公開チャンネル（クリックで秘匿に変更）'}
                                                    >
                                                        {ch.isHidden ? <Lock size={13} /> : <Unlock size={13} />}
                                                        {ch.isHidden ? '秘匿' : '公開'}
                                                    </button>
                                                    {ch.type === 'voice' && <span className={styles.noPost}>投稿なし</span>}
                                                    <IconButton tone="danger" title="削除" onClick={() => setConfirmDeleteChannel(idx)}>
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {/* Posts Section */}
                                {editingPreset.channels.filter(ch => ch.type !== 'voice').map(ch => {
                                    const postDef = editingPreset.posts.find(p => p.targetChannelKey === ch.key);
                                    const items = postDef ? postDef.items : [];

                                    return (
                                        <Card
                                            key={ch.key}
                                            header={<><Hash size={16} /> {ch.name} への投稿内容</>}
                                        >
                                            <div className={styles.cardHint}>
                                                卓を立てたとき、このチャンネルに自動で投稿される内容です（上から順に投稿）。
                                            </div>
                                            <div className={styles.postList}>
                                                {items.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`${styles.postItem} ${draggedPostItem?.channelKey === ch.key && draggedPostItem.idx === idx ? styles.dragging : ''}`}
                                                        draggable
                                                        onDragStart={() => setDraggedPostItem({ channelKey: ch.key, idx })}
                                                        onDragEnd={() => setDraggedPostItem(null)}
                                                        onDragOver={e => {
                                                            e.preventDefault();
                                                            if (
                                                                draggedPostItem &&
                                                                draggedPostItem.channelKey === ch.key &&
                                                                draggedPostItem.idx !== idx
                                                            ) {
                                                                movePostItem(ch.key, draggedPostItem.idx, idx);
                                                                setDraggedPostItem({ channelKey: ch.key, idx });
                                                            }
                                                        }}
                                                    >
                                                        <span className={styles.grip}><GripVertical size={16} /></span>
                                                        <div className={styles.postBody}>
                                                            {item.type === 'text' ? (
                                                                <>
                                                                    <div className={styles.postLabel}>テキスト</div>
                                                                    <Textarea
                                                                        rows={3}
                                                                        value={item.content || ''}
                                                                        onChange={e => updatePostItem(ch.key, idx, { content: e.target.value })}
                                                                        placeholder="例：はじめまして、GM の〇〇です。このチャンネルではシナリオの概要を…"
                                                                    />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className={styles.postLabel}>画像ファイル</div>
                                                                    <div className={styles.fileRow}>
                                                                        <input
                                                                            type="file"
                                                                            hidden
                                                                            ref={el => { fileInputs.current[`${ch.key}-${idx}`] = el; }}
                                                                            onChange={e => handleFileUpload(e, ch.key, idx)}
                                                                        />
                                                                        <Button
                                                                            variant="secondary"
                                                                            size="sm"
                                                                            icon={<ImagePlus size={16} />}
                                                                            onClick={() => fileInputs.current[`${ch.key}-${idx}`]?.click()}
                                                                        >
                                                                            画像を選択
                                                                        </Button>
                                                                        {item.filename && <Badge tone="success">{item.filename}</Badge>}
                                                                    </div>
                                                                    <div className={styles.postLabel}>キャプション (任意)</div>
                                                                    <Input
                                                                        value={item.caption || ''}
                                                                        onChange={e => updatePostItem(ch.key, idx, { caption: e.target.value })}
                                                                        placeholder="画像と一緒に送る一言（任意）"
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                        <IconButton size="sm" tone="danger" title="削除" onClick={() => removePostItem(ch.key, idx)}>
                                                            <X size={16} />
                                                        </IconButton>
                                                    </div>
                                                ))}

                                                <div className={styles.postAddRow}>
                                                    <Button variant="ghost" size="sm" icon={<Type size={16} />} onClick={() => addPostItem(ch.key, 'text')}>テキストを追加</Button>
                                                    <Button variant="ghost" size="sm" icon={<ImagePlus size={16} />} onClick={() => addPostItem(ch.key, 'file')}>画像を追加</Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Fixed Action Bar at bottom */}
                        <div className={styles.footerBar}>
                            {isDirty && <Badge tone="warning">未保存の変更</Badge>}
                            <Button size="lg" icon={<Save size={18} />} loading={loading} onClick={handleSave}>
                                保存
                            </Button>
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon={<MousePointerClick size={28} />}
                        title="プリセットを選択または作成"
                        description="左からプリセットを選ぶか、新規作成してください"
                    />
                )}
            </div>

            {pendingDiscard && (
                <ConfirmDialog
                    title="未保存の変更"
                    message="保存していない変更があります。破棄して続けますか？"
                    confirmLabel="破棄して続ける"
                    tone="danger"
                    onConfirm={() => { const action = pendingDiscard; setPendingDiscard(null); action(); }}
                    onCancel={() => setPendingDiscard(null)}
                />
            )}

            {confirmDeletePreset && (
                <ConfirmDialog
                    title="プリセットの削除"
                    message="このプリセットを削除しますか？"
                    confirmLabel="削除する"
                    tone="danger"
                    loading={loading}
                    onConfirm={() => handleDeleteById(confirmDeletePreset)}
                    onCancel={() => setConfirmDeletePreset(null)}
                />
            )}

            {confirmDeleteChannel !== null && (
                <ConfirmDialog
                    title="チャンネルの削除"
                    message="チャンネルを削除しますか？"
                    confirmLabel="削除する"
                    tone="danger"
                    onConfirm={() => deleteChannel(confirmDeleteChannel)}
                    onCancel={() => setConfirmDeleteChannel(null)}
                />
            )}
        </div>
    );
}
