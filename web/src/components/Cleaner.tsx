import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Check, FolderX } from 'lucide-react';
import * as api from '../api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Callout from '../ui/Callout';
import EmptyState from '../ui/EmptyState';
import { useToast, errMsg } from '../ui/toastContext';
import styles from './Cleaner.module.css';

export default function Cleaner() {
    const toast = useToast();
    const [categories, setCategories] = useState<api.Category[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [managedOnly, setManagedOnly] = useState(true);

    // UI State
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [result, setResult] = useState<api.RunDeleteResult | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (e) {
            toast(errMsg(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const visible = managedOnly ? categories.filter(c => c.managed) : categories;

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const allSelected = visible.length > 0 && visible.every(c => selectedIds.has(c.id));

    const selectedCategories = categories.filter(c => selectedIds.has(c.id));

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await api.runDelete(Array.from(selectedIds));
            setResult(res);
            setShowConfirm(false);
            // Refresh list
            await loadData();
            // Clear selection of deleted items
            const deleted = new Set(res.filter(r => r.success).map(r => r.categoryId));
            const newSet = new Set(selectedIds);
            deleted.forEach(id => newSet.delete(id));
            setSelectedIds(newSet);
        } catch (e) {
            toast(errMsg(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                <div className={styles.headRow}>
                    <h2>卓の片付け（カテゴリ削除）</h2>
                    <div className={styles.headActions}>
                        <button
                            role="switch"
                            aria-checked={managedOnly}
                            className={`${styles.managedToggle} ${managedOnly ? styles.on : ''}`}
                            onClick={() => setManagedOnly(v => !v)}
                        >
                            <span className={styles.switchDot} />
                            このツールで作った卓だけ表示
                        </button>
                        <Button variant="secondary" icon={<RefreshCw size={16} />} loading={loading} onClick={loadData}>
                            更新
                        </Button>
                        <Button
                            variant="danger"
                            icon={<Trash2 size={16} />}
                            disabled={selectedIds.size === 0}
                            loading={loading}
                            onClick={() => setShowConfirm(true)}
                        >
                            削除 ({selectedIds.size})
                        </Button>
                    </div>
                </div>

                <Callout tone="warning">
                    カテゴリを削除すると、その卓のチャンネル（ログを含む）が<strong>すべて</strong>消えます。<br />
                    この操作は元に戻せません。残したいログがある場合は先にコピーしてください。
                </Callout>

                <Card flush className={styles.tableCard}>
                    {visible.length === 0 ? (
                        <EmptyState
                            icon={<FolderX size={28} />}
                            title="削除可能なカテゴリが見つかりません"
                            description={managedOnly ? 'このツールで作った卓が見つかりません。他のカテゴリも表示するには上のスイッチを切ってください' : undefined}
                        />
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.checkCol}>
                                        <button
                                            className={`${styles.checkbox} ${allSelected ? styles.checked : ''}`}
                                            onClick={() => {
                                                if (allSelected) setSelectedIds(new Set());
                                                else setSelectedIds(new Set(visible.map(c => c.id)));
                                            }}
                                            aria-label="全選択"
                                        >
                                            <Check size={12} />
                                        </button>
                                    </th>
                                    <th>カテゴリ名</th>
                                    <th>ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(c => (
                                    <tr
                                        key={c.id}
                                        className={`${styles.row} ${selectedIds.has(c.id) ? styles.selected : ''}`}
                                        onClick={() => toggleSelect(c.id)}
                                    >
                                        <td>
                                            <button
                                                className={`${styles.checkbox} ${selectedIds.has(c.id) ? styles.checked : ''}`}
                                                onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}
                                                aria-label={`${c.name} を選択`}
                                            >
                                                <Check size={12} />
                                            </button>
                                        </td>
                                        <td>
                                            <div className={styles.nameCell}>
                                                <span className={`${styles.catName} ${c.managed ? '' : styles.foreign}`}>{c.name}</span>
                                                <Badge tone="neutral">{c.childCount} ch</Badge>
                                                {c.managed && <Badge tone="accent">このツール</Badge>}
                                            </div>
                                        </td>
                                        <td><code className={styles.catId}>{c.id}</code></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            </div>

            {/* Confirm Modal */}
            {showConfirm && (
                <Modal
                    title="削除の最終確認"
                    width={500}
                    onClose={() => setShowConfirm(false)}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)}>キャンセル</Button>
                            <Button variant="danger" onClick={handleDelete} loading={loading}>
                                本当に削除する
                            </Button>
                        </>
                    }
                >
                    <div className={styles.confirmBox}>
                        <div className={styles.confirmCount}>
                            選択した <strong>{selectedIds.size}</strong> 個のカテゴリを削除します。
                        </div>
                        <ul className={styles.confirmList}>
                            {selectedCategories.slice(0, 8).map(c => (
                                <li key={c.id}>{c.name}</li>
                            ))}
                            {selectedCategories.length > 8 && (
                                <li>ほか {selectedCategories.length - 8} 件</li>
                            )}
                        </ul>
                        <div className={styles.confirmWarn}>
                            <strong>配下のチャンネルも全て完全に削除されます。</strong><br />
                            この操作はDiscord上からデータを直接消去するため、復元はできません。
                        </div>
                    </div>
                </Modal>
            )}

            {/* Result Modal */}
            {result && (
                <Modal
                    title="削除完了"
                    description="指定されたカテゴリの削除処理が終了しました。"
                    width={600}
                >
                    <div className={styles.resultTable}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>カテゴリID</th>
                                    <th className={styles.right}>ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.map(r => (
                                    <tr key={r.categoryId}>
                                        <td><code className={styles.catId}>{r.categoryId}</code></td>
                                        <td className={styles.right}>
                                            {r.success ? (
                                                <Badge tone="success">成功</Badge>
                                            ) : (
                                                <>
                                                    <Badge tone="danger">失敗</Badge>
                                                    <span className={styles.resultError}>{r.error}</span>
                                                </>
                                            )}
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
