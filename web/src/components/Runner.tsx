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
import { useToast } from '../ui/toastContext';
import { useI18n, apiErrMsg } from '../i18n';
import styles from './Runner.module.css';

export default function Runner({ guildId }: { guildId: string }) {
    const toast = useToast();
    const { t } = useI18n();
    const errMsg = (e: unknown) => apiErrMsg(t, e);
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
                <Card header={<><Play size={16} /> {t('run.title')}</>}>
                    <div className={styles.grid2}>
                        <Field
                            label={t('run.preset')}
                            required
                            error={touched.preset && !isPresetValid ? t('run.presetErr') : undefined}
                        >
                            <Select
                                value={selectedPresetId}
                                onChange={e => setSelectedPresetId(e.target.value)}
                                onBlur={() => setTouched({ ...touched, preset: true })}
                                invalid={touched.preset && !isPresetValid}
                            >
                                <option value="">{t('run.presetPick')}</option>
                                {presets.map(p => (
                                    <option key={p.presetId} value={p.presetId}>{p.presetName}</option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label={t('run.category')}
                            required
                            error={touched.category && !isCategoryValid ? t('run.categoryErr') : undefined}
                        >
                            <Input
                                value={categoryName}
                                onChange={e => setCategoryName(e.target.value)}
                                onBlur={() => setTouched({ ...touched, category: true })}
                                placeholder={t('run.categoryPh')}
                                invalid={touched.category && !isCategoryValid}
                            />
                        </Field>
                    </div>

                    {selectedPreset && (
                        <div className={styles.presetSummary}>
                            <div className={styles.summaryLabel}>{t('run.summary')}</div>
                            <div className={styles.chipRow}>
                                {selectedPreset.channels.map(ch => {
                                    const postCount = selectedPreset.posts.find(p => p.targetChannelKey === ch.key)?.items.length ?? 0;
                                    return (
                                        <span key={ch.key} className={styles.chip}>
                                            {ch.type === 'voice' ? <Volume2 size={13} /> : <Hash size={13} />}
                                            {ch.name}
                                            {ch.isHidden && <Lock size={11} />}
                                            {postCount > 0 && <span className={styles.chipPosts}>{t('run.posts', { n: postCount })}</span>}
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
                            {t('run.members')}
                            <Badge tone="accent">{t('run.membersBadge', { n: selectedMembers.size })}</Badge>
                        </>
                    }
                    actions={
                        <IconButton
                            title={t('run.logTitle')}
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
                            placeholder={t('run.searchPh')}
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
                                {t('run.noMembersWarn')}
                            </Callout>
                        </div>
                    )}

                    {debugLog && (
                        <div className={styles.debugLog}>
                            <div className={styles.debugHead}>
                                <span>Debug Log</span>
                                <Button variant="ghost" size="sm" onClick={() => setDebugLog(null)}>{t('common.close')}</Button>
                            </div>
                            <pre className={styles.debugPre}>{debugLog}</pre>
                        </div>
                    )}
                </Card>

                <div className={styles.runRow}>
                    <Button size="lg" icon={<ArrowRight size={18} />} onClick={handleConfirmClick} loading={loading}>
                        {t('run.check')}
                    </Button>
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirm && selectedPreset && (
                <Modal
                    title={t('run.confirm.title')}
                    description={t('run.confirm.desc')}
                    width={560}
                    onClose={() => setShowConfirm(false)}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('common.cancel')}</Button>
                            <Button onClick={handleRun} loading={loading}>{t('run.confirm.go')}</Button>
                        </>
                    }
                >
                    <div className={styles.defList}>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>{t('run.confirm.name')}</span>
                            <span className={styles.defValue}>{categoryName}</span>
                        </div>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>{t('run.confirm.preset')}</span>
                            <span className={styles.defValue}>{selectedPreset.presetName}</span>
                        </div>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>{t('run.confirm.channels')}</span>
                            <span className={styles.defValue}>{t('run.confirm.channelsVal', { n: selectedPreset.channels.length })}</span>
                        </div>
                        <div className={styles.defRow}>
                            <span className={styles.defLabel}>{t('run.confirm.members')}</span>
                            <span className={styles.defValue}>{t('run.confirm.membersVal', { n: selectedMembers.size })}</span>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Result Modal */}
            {result && (
                <Modal
                    title={t('run.result.title')}
                    description={t('run.result.desc')}
                    width={660}
                >
                    <div className={styles.resultCatId}>
                        <a
                            className={styles.openLink}
                            href={`https://discord.com/channels/${guildId}/${result.category.id}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink size={14} /> {t('run.result.open')}
                        </a>
                        <code className={styles.catId}>{result.category.id}</code>
                    </div>

                    {result.errors.length > 0 && (
                        <>
                            <div className={styles.sectionLabel}>{t('run.result.errors')}</div>
                            <Callout tone="danger">
                                <Textarea
                                    readOnly
                                    value={result.errors.join('\n')}
                                    rows={6}
                                />
                            </Callout>
                        </>
                    )}

                    <div className={styles.sectionLabel}>{t('run.result.channels')}</div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{t('run.th.name')}</th>
                                    <th>{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.channels.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.name}</td>
                                        <td>
                                            {c.success
                                                ? <Badge tone="success">{t('common.success')}</Badge>
                                                : <Badge tone="danger">{t('common.failure')}</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.resultFooter}>
                        <Button onClick={() => setResult(null)}>{t('common.close')}</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
