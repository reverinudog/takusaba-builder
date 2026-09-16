import { useState } from 'react';
import {
    LayoutList, Play, Trash2, Settings2, Stethoscope,
    ChevronRight, ExternalLink, FolderOpen
} from 'lucide-react';
import * as api from '../api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Callout from '../ui/Callout';
import CheckList from './setup/CheckList';
import { useI18n, apiErrMsg, type MsgKey } from '../i18n';
import styles from './Help.module.css';

type Props = {
    onOpenSetup: () => void;
    status: api.SetupStatus | null;
};

export default function Help({ onOpenSetup, status }: Props) {
    const { t } = useI18n();
    const [checks, setChecks] = useState<api.SetupCheckItem[] | null>(null);
    const [checking, setChecking] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    const FLOW = [
        { icon: <LayoutList size={18} />, title: t('help.flow1.t'), desc: t('help.flow1.d') },
        { icon: <Play size={18} />, title: t('help.flow2.t'), desc: t('help.flow2.d') },
        { icon: <Trash2 size={18} />, title: t('help.flow3.t'), desc: t('help.flow3.d') }
    ];

    const FAQS: { q: MsgKey; a: MsgKey }[] = [
        { q: 'help.faq1.q', a: 'help.faq1.a' },
        { q: 'help.faq2.q', a: 'help.faq2.a' },
        { q: 'help.faq3.q', a: 'help.faq3.a' },
        { q: 'help.faq4.q', a: 'help.faq4.a' },
        { q: 'help.faq5.q', a: 'help.faq5.a' },
        { q: 'help.faq6.q', a: 'help.faq6.a' },
        { q: 'help.faq7.q', a: 'help.faq7.a' },
        { q: 'help.faq8.q', a: 'help.faq8.a' }
    ];

    const runCheck = async () => {
        setChecking(true);
        setCheckError(null);
        try {
            const res = await api.runSetupCheck();
            setChecks(res.checks);
        } catch (e) {
            setCheckError(apiErrMsg(t, e));
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                <h2>{t('help.title')}</h2>

                <Card header={t('help.flow')}>
                    <div className={styles.flowGrid}>
                        {FLOW.map((f, i) => (
                            <div key={i} className={styles.flowCard}>
                                <div className={styles.flowHead}>
                                    <span className={styles.flowNum}>{i + 1}</span>
                                    {f.icon}
                                    {f.title}
                                </div>
                                <div className={styles.flowDesc}>{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card
                    header={t('help.status')}
                    actions={
                        <Button size="sm" icon={<Settings2 size={16} />} onClick={onOpenSetup}>
                            {t('help.reconfig')}
                        </Button>
                    }
                >
                    <CheckList checks={checks} loading={checking} />
                    {checkError && <Callout tone="danger">{checkError}</Callout>}
                    <div className={styles.checkRow}>
                        <Button variant="secondary" size="sm" icon={<Stethoscope size={16} />} loading={checking} onClick={runCheck}>
                            {t('help.runCheck')}
                        </Button>
                    </div>
                </Card>

                <Card header={t('help.faq')}>
                    <div className={styles.faq}>
                        {FAQS.map((f, i) => (
                            <details key={i} className={styles.faqItem}>
                                <summary><ChevronRight size={16} /> {t(f.q)}</summary>
                                <div className={styles.faqBody}>
                                    {t(f.a)}
                                </div>
                            </details>
                        ))}
                    </div>
                </Card>

                <Card
                    header={t('help.data')}
                    actions={
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<FolderOpen size={16} />}
                            onClick={() => api.openDataDir().catch(e => setCheckError(apiErrMsg(t, e)))}
                        >
                            {t('help.data.open')}
                        </Button>
                    }
                >
                    <p><code className={styles.mono}>{status?.dataDir ?? 'data'}</code></p>
                    <div className={styles.dataNote}>
                        <Callout tone="warning">
                            {t('help.data.note')}
                        </Callout>
                    </div>
                </Card>

                <Card header={t('help.links')}>
                    <div className={styles.linkList}>
                        <a className={styles.linkItem} href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> {t('help.link.portal')}
                        </a>
                        <a className={styles.linkItem} href="https://docs.discord.com/developers/quick-start/getting-started" target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> {t('help.link.docs')}
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
}
