import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import type { SetupCheckItem } from '../../api';
import Spinner from '../../ui/Spinner';
import { useI18n, type MsgKey } from '../../i18n';
import styles from './CheckList.module.css';

const REMEDY_IDS = new Set(['token', 'intent_members', 'guild', 'permissions', 'members_fetch']);
const CHECK_IDS = new Set(['token', 'intent_members', 'guild', 'permissions', 'members_fetch', 'config']);

type Props = {
    checks: SetupCheckItem[] | null;
    loading?: boolean;
    showRemedies?: boolean;
};

export default function CheckList({ checks, loading, showRemedies = true }: Props) {
    const { t } = useI18n();

    if (loading && !checks) {
        return (
            <div className={styles.loading}>
                <Spinner size={18} />
                <span>{t('check.loading')}</span>
            </div>
        );
    }
    if (!checks) return null;

    const labelOf = (c: SetupCheckItem): string => {
        if (CHECK_IDS.has(c.id)) return t(`check.${c.id}` as MsgKey);
        return c.label;
    };

    const permNames = (permKeys?: string): string | null => {
        if (!permKeys) return null;
        return permKeys.split(',').map(k => {
            const key = `perm.${k.trim()}` as MsgKey;
            const v = t(key);
            return v === key ? k.trim() : v;
        }).join(', ');
    };

    const detailOf = (c: SetupCheckItem): string | undefined => {
        const p = c.detailParams;
        switch (c.detailCode) {
            case 'admin': return t('checkdetail.admin');
            case 'missing_perms': {
                const names = permNames(p?.permKeys) ?? p?.perms ?? '';
                return t('checkdetail.missing', { perms: names });
            }
            case 'skipped': return t('checkdetail.skipped');
            case 'intent_off': return t('checkdetail.intent');
            case 'guild_name': return p?.name ?? c.detail;
            case 'error': return p?.message ?? c.detail;
            default: return c.detail;
        }
    };

    const remedyOf = (c: SetupCheckItem): string | null => {
        if (c.ok || !showRemedies || !REMEDY_IDS.has(c.id)) return null;
        return t(`remedy.${c.id}` as MsgKey);
    };

    const missingShort = (c: SetupCheckItem): string | null => {
        if (c.id !== 'permissions' || c.detailCode !== 'missing_perms') return null;
        const names = permNames(c.detailParams?.permKeys) ?? c.detailParams?.perms;
        return names ? t('checkdetail.missingShort', { perms: names }) : null;
    };

    return (
        <div className={styles.list}>
            {checks.map((c, i) => {
                const detail = detailOf(c);
                const remedy = remedyOf(c);
                const missing = missingShort(c);
                return (
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
                            <span className={styles.label}>{labelOf(c)}</span>
                            {detail && <span className={styles.detail}>{detail}</span>}
                        </div>
                        {remedy && (
                            <div className={styles.remedy}>
                                <span className={styles.remedyLabel}>{t('checkdetail.remedy')}</span>
                                {remedy}
                                {missing ?? ''}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
