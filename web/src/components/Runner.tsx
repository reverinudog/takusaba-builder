import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { Play, Search, Bug, Check, ArrowRight, Hash, Volume2, Lock, ExternalLink } from 'lucide-react';
import type { Preset } from '../types';
import * as api from '../api';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Field from '../ui/Field';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Callout from '../ui/Callout';
import { useToast, errMsg } from '../ui/toastContext';
import styles from './Runner.module.css';

export default function Runner({ guildId }: { guildId: string }) {
    const toast = useToast();
    const [presets, setPresets] = useState<Preset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [categoryName, setCategoryName] = useState('');
    const [members, setMembers] = useState<api.Member[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState('');
    const [debugLog, setDebugLog] = useState<string | null>(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [result, setResult] = useState<api.RunCreateResult | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // Independent: a members failure must not hide the preset list
        const [presetsRes, membersRes] = await Promise.allSettled([
            api.getPresets(),
            api.getMembers(1000) // Fetch up to 1000 members
        ]);
        if (presetsRes.status === 'fulfilled') setPresets(presetsRes.value);
        else toast(errMsg(presetsRes.reason), 'error');
        if (membersRes.status === 'fulfilled') setMembers(membersRes.value);
        else toast(errMsg(membersRes.reason), 'error');
        setLoading(false);
    };

    const handleRun = async () => {
        if (!selectedPresetId || !categoryName) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await api.runCreate(selectedPresetId, categoryName, Array.from(selectedMembers));
            setResult(res);
            setShowConfirm(false);
        } catch (e) {
            toast(errMsg(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (id: string) => {
        const newSet = new Set(selectedMembers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedMembers(newSet);
    };

    // Validation
    const isPresetValid = !!selectedPresetId;
    const isCategoryValid = !!categoryName.trim();
    const isValid = isPresetValid && isCategoryValid;

    // Touched state to show errors only after interaction or attempt
    const [touched, setTouched] = useState({ preset: false, category: false });

    const handleConfirmClick = () => {
        setTouched({ preset: true, category: true });
        if (isValid) setShowConfirm(true);
    };

    const selectedPreset = presets.find(p => p.presetId === selectedPresetId);

    const filteredMembers = useMemo(() => members.filter(m =>
        m.username.toLowerCase().includes(filterText.toLowerCase()) ||
        (m.global_name && m.global_name.toLowerCase().includes(filterText.toLowerCase()))
    ), [members, filterText]);

    const avatarUrl = (m: api.Member) =>
        m.avatar ? `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png` : null;

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                <Card header={<><Play size={16} /> 卓を立てる</>}>
                    <div className={styles.grid2}>
                        <Field
                            label="使うプリセット"
                            required
                            error={touched.preset && !isPresetValid ? 'プリセットを選択してください' : undefined}
                        >
                            <Select
                                value={selectedPresetId}
                                onChange={e => setSelectedPresetId(e.target.value)}
                                onBlur={() => setTouched({ ...touched, preset: true })}
                                invalid={touched.preset && !isPresetValid}
                            >
                                <option value="">-- 選択してください --</option>
                                {presets.map(p => (
                                    <option key={p.presetId} value={p.presetId}>{p.presetName}</option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="卓名（カテゴリ名）"
                            required
                            error={touched.category && !isCategoryValid ? 'カテゴリ名を入力してください' : undefined}
                        >
                            <Input
                                value={categoryName}
                                onChange={e => setCategoryName(e.target.value)}
                                onBlur={() => setTouched({ ...touched, category: true })}
                                placeholder="例：2026-10-04 20:00 シナリオ名"
                                invalid={touched.category && !isCategoryValid}
                            />
                        </Field>
                    </div>

                    {selectedPreset && (
                        <div className={styles.presetSummary}>
                            <div className={styles.summaryLabel}>このプリセットで作成されるもの</div>
                            <div className={styles.chipRow}>
                                {selectedPreset.channels.map(ch => {
                                    const postCount = selectedPreset.posts.find(p => p.targetChannelKey === ch.key)?.items.length ?? 0;
                                    return (
                                        <span key={ch.key} className={styles.chip}>
                                            {ch.type === 'voice' ? <Volume2 size={13} /> : <Hash size={13} />}
                                            {ch.name}
                                            {ch.isHidden && <Lock size={11} />}
                                            {postCount > 0 && <span className={styles.chipPosts}>・投稿{postCount}件</span>}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>

                <Card
                    header={
                        <>
                            参加者（PL）を選ぶ
                            <Badge tone="accent">{selectedMembers.size}人選択中</Badge>
                        </>
                    }
                    actions={
                        <IconButton
                            title="ログ"
                            onClick={async () => {
                                try {
                                    const data = await api.getDebugMembersRaw();
                                    setDebugLog(JSON.stringify(data, null, 2));
                                } catch (e) {
                                    setDebugLog('Error: ' + errMsg(e));
                                }
                            }}
                        >
                            <Bug size={16} />
                        </IconButton>
                    }
                >
                    <div className={styles.searchWrap}>
                        <span className={styles.searchIcon}><Search size={16} /></span>
                        <Input
                            className={styles.searchInput}
                            placeholder="メンバーを検索... (ユーザー名)"
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                        />
                    </div>

                    <div className={`${styles.memberGrid} stagger`}>
                        {filteredMembers.map((m, i) => (
                            <div
                                key={m.id}
                                className={`${styles.memberCell} ${selectedMembers.has(m.id) ? styles.selected : ''}`}
                                style={{ '--i': i } as CSSProperties}
                                role="checkbox"
                                aria-checked={selectedMembers.has(m.id)}
                                onClick={() => toggleMember(m.id)}
                            >
                                <Avatar src={avatarUrl(m)} name={m.global_name || m.username} size={34} />
                                <div className={styles.memberInfo}>
                                    <div className={styles.memberName}>{m.global_name || m.username}</div>
                                    <div className={styles.memberUser}>@{m.username}</div>
                                </div>
                                {selectedMembers.has(m.id) && (
                                    <span className={styles.checkDot}><Check size={11} /></span>
                                )}
                            </div>
                        ))}
                    </div>

                    {selectedMembers.size === 0 && (
                        <div className={styles.warnRow}>
                            <Callout tone="warning">
                                参加者を選ばない場合、Bot と管理者だけが見えるカテゴリが作られます（あとから Discord 側で権限を付けることもできます）。
                            </Callout>
                        </div>
                    )}

                    {debugLog && (
                        <div className={styles.debugLog}>
                            <div className={styles.debugHead}>
                                <span>Debug Log</span>
                                <Button variant="ghost" size="sm" onClick={() => setDebugLog(null)}>閉じる</Button>
                            </div>
                            <pre className={styles.debugPre}>{debugLog}</pre>
                        </div>
                    )}
                </Card>

                <div className={styles.runRow}>
                    <Button size="lg" icon={<ArrowRight size={18} />} onClick={handleConfirmClick} loading={loading}>
                        実行内容を確認
                    </Button>
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirm && selectedPreset && (
                <Modal
                    title="この内容で卓を立てます"
                    description="Discord サーバーに、参加者だけが見えるカテゴリとチャンネルを作成します。"
                    width={560}
                    onClose={() => setShowConfirm(false)}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)}>キャンセル</Button>
                            <Button onClick={handleRun} loading={loading}>卓を立てる</Button>
                        </>
                    }
                >
                    <div className={styles.defList}>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>卓名</span>
                            <span className={styles.defValue}>{categoryName}</span>
                        </div>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>プリセット</span>
                            <span className={styles.defValue}>{selectedPreset.presetName}</span>
                        </div>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>作成するチャンネル数</span>
                            <span className={styles.defValue}>{selectedPreset.channels.length} チャンネル</span>
                        </div>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>参加者</span>
                            <span className={styles.defValue}>{selectedMembers.size} 人</span>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Result Modal */}
            {result && (
                <Modal
                    title="卓を立てました"
                    description="Discordへの操作が完了しました。詳細は以下の通りです。"
                    width={660}
                >
                    <div className={styles.resultCatId}>
                        <a
                            className={styles.openLink}
                            href={`https://discord.com/channels/${guildId}/${result.category.id}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink size={14} /> Discord で開く
                        </a>
                        <code className={styles.catId}>{result.category.id}</code>
                    </div>

                    {result.errors.length > 0 && (
                        <>
                            <div className={styles.sectionLabel}>エラー詳細 (コピー用)</div>
                            <Callout tone="danger">
                                <Textarea
                                    readOnly
                                    value={result.errors.join('\n')}
                                    rows={6}
                                />
                            </Callout>
                        </>
                    )}

                    <div className={styles.sectionLabel}>チャンネル作成状況</div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>チャンネル名</th>
                                    <th>ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.channels.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.name}</td>
                                        <td>
                                            {c.success
                                                ? <Badge tone="success">成功</Badge>
                                                : <Badge tone="danger">失敗</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.resultFooter}>
                        <Button onClick={() => setResult(null)}>閉じる</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
