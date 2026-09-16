import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import type { SetupCheckItem } from '../../api';
import Spinner from '../../ui/Spinner';
import styles from './CheckList.module.css';

const REMEDIES: Record<string, string> = {
    token: 'トークンが無効です。ステップ2に戻ってもう一度貼り付けてください。',
    intent_members: 'Developer Portal → 左メニュー「Bot」→「SERVER MEMBERS INTENT」を ON →「Save Changes」→ ここで「再チェック」。',
    guild: 'Bot がこのサーバーに参加していません。ステップ3の招待リンクから招待してください。',
    permissions: 'Bot の権限が足りません。招待リンクをもう一度開いて同じサーバーを選び直すと権限が更新されます。それでも直らない場合は Discord のサーバー設定 →「ロール」→ Bot の名前のロールに不足権限を付与してください。',
    members_fetch: 'メンバー一覧を取得できません。上の Intent と権限の両方を確認してください。'
};

type Props = {
    checks: SetupCheckItem[] | null;
    loading?: boolean;
    showRemedies?: boolean;
};

export default function CheckList({ checks, loading, showRemedies = true }: Props) {
    if (loading && !checks) {
        return (
            <div className={styles.loading}>
                <Spinner size={18} />
                <span>診断を実行しています…</span>
            </div>
        );
    }
    if (!checks) return null;

    return (
        <div className={styles.list}>
            {checks.map((c, i) => (
                <div key={c.id} className={styles.item} style={{ '--i': i } as CSSProperties}>
                    <div className={styles.row}>
                        <span className={`${styles.mark} ${c.ok ? styles.ok : styles.ng}`}>
                            {c.ok ? (
                                <svg viewBox="0 0 16 16" width="11" height="11" className={styles.drawCheck}>
                                    <path d="M3 8.5l3.2 3.2L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <X size={11} />
                            )}
                        </span>
                        <span className={styles.label}>{c.label}</span>
                        {c.detail && <span className={styles.detail}>{c.detail}</span>}
                    </div>
                    {!c.ok && showRemedies && REMEDIES[c.id] && (
                        <div className={styles.remedy}>
                            <span className={styles.remedyLabel}>対処法</span>
                            {REMEDIES[c.id]}
                            {c.id === 'permissions' && c.detail ? `（不足: ${c.detail}）` : ''}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

