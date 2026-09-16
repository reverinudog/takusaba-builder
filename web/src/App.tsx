import { useEffect, useRef, useState } from 'react';
import { Hash, LayoutList, Play, Trash2, Settings2, LifeBuoy, Languages } from 'lucide-react';
import PresetEditor from './components/PresetEditor';
import Runner from './components/Runner';
import Cleaner from './components/Cleaner';
import Help from './components/Help';
import SetupWizard from './components/setup/SetupWizard';
import { ToastProvider } from './ui/Toast';
import { useToast } from './ui/toastContext';
import { UnsavedProvider, useUnsaved } from './ui/unsavedContext';
import ConfirmDialog from './ui/ConfirmDialog';
import Modal from './ui/Modal';
import Spinner from './ui/Spinner';
import { I18nProvider, useI18n, LANGS, storedLang, type Lang } from './i18n';
import * as api from './api';
import styles from './App.module.css';

type Tab = 'presets' | 'runner' | 'cleaner' | 'setup' | 'help';

const VALID_LANGS = new Set<string>(LANGS.map(l => l.code));

function LangCards({ selected, onSelect }: { selected: Lang; onSelect: (l: Lang) => void }) {
    return (
        <div className={styles.langGrid}>
            {LANGS.map(l => (
                <button
                    key={l.code}
                    className={`${styles.langCard} ${selected === l.code ? styles.langCardOn : ''}`}
                    onClick={() => onSelect(l.code)}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
}

function LangPickScreen({ onDone }: { onDone: () => void }) {
    const { lang, setLang, t } = useI18n();
    const handleDone = () => {
        // First-run seed: writes sample presets in the chosen language,
        // only when the user has no presets yet (server-side guard).
        api.seedPresets(lang).catch(() => { /* best-effort */ });
        onDone();
    };
    return (
        <div className={styles.langScreen}>
            <div className={styles.langScreenInner}>
                <div className={styles.logo}><Hash size={17} /></div>
                <h1 className={styles.langTitle}>{t('lang.title')}</h1>
                <LangCards selected={lang} onSelect={setLang} />
                <button className={styles.langConfirm} onClick={handleDone}>
                    {t('lang.confirm')}
                </button>
            </div>
        </div>
    );
}

function Shell() {
    const toast = useToast();
    const { isDirty } = useUnsaved();
    const { lang, setLang, t } = useI18n();
    const [activeTab, setActiveTab] = useState<Tab>('presets');
    const [prevTab, setPrevTab] = useState<Tab>('presets');
    const [pendingTab, setPendingTab] = useState<Tab | null>(null);
    const [status, setStatus] = useState<api.SetupStatus | null>(null);
    const [statusLoaded, setStatusLoaded] = useState(false);
    const [langPicked, setLangPicked] = useState(false);
    const [langModalOpen, setLangModalOpen] = useState(false);
    const [updatePending, setUpdatePending] = useState(false);
    const updateNotifiedRef = useRef<string | null>(null);
    const updatePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll update status: first check 30s after startup, then every 10 minutes
    useEffect(() => {
        const poll = () => api.getUpdateStatus().then(u => {
            const ready = u.status === 'available' || u.status === 'downloaded';
            setUpdatePending(ready);
            if (ready) {
                const key = `${u.status}:${u.latestVersion ?? ''}`;
                if (updateNotifiedRef.current !== key) {
                    updateNotifiedRef.current = key;
                    toast(t('update.toast', { latest: u.latestVersion ?? '' }), 'info');
                }
            }
        }).catch(() => { });
        const first = setTimeout(() => {
            poll();
            updatePollRef.current = setInterval(poll, 10 * 60 * 1000);
        }, 30000);
        return () => {
            clearTimeout(first);
            if (updatePollRef.current) clearInterval(updatePollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshStatus = () =>
        api.getSetupStatus()
            .then(s => setStatus(s))
            .catch(() => setStatus(null))
            .finally(() => setStatusLoaded(true));

    useEffect(() => {
        refreshStatus();
    }, []);

    // Server-saved language wins over localStorage once status is known
    useEffect(() => {
        if (status?.language && VALID_LANGS.has(status.language) && status.language !== lang) {
            setLang(status.language as Lang);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    // Warn before closing the app window with unsaved edits
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const doSwitchTab = (tab: Tab) => {
        setPrevTab(activeTab === 'setup' ? prevTab : activeTab);
        setActiveTab(tab);
    };

    const switchTab = (tab: Tab) => {
        if (isDirty && tab !== activeTab) setPendingTab(tab);
        else doSwitchTab(tab);
    };

    const handleSetupComplete = () => {
        refreshStatus();
        setActiveTab('presets');
        toast(t('toast.setupDone'), 'success');
    };

    // Loading
    if (!statusLoaded) {
        return (
            <div className={styles.boot}>
                <div className={styles.logo}><Hash size={17} /></div>
                <Spinner size={22} />
            </div>
        );
    }

    // First-run language selection: only when neither server nor localStorage has a language
    if (!langPicked && status?.language == null && !storedLang()) {
        return <LangPickScreen onDone={() => setLangPicked(true)} />;
    }

    const NAV_TOP: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'presets', label: t('nav.presets'), icon: <LayoutList size={18} /> },
        { id: 'runner', label: t('nav.runner'), icon: <Play size={18} /> },
        { id: 'cleaner', label: t('nav.cleaner'), icon: <Trash2 size={18} /> }
    ];

    const NAV_BOTTOM: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'setup', label: t('nav.setup'), icon: <Settings2 size={18} /> },
        { id: 'help', label: t('nav.help'), icon: <LifeBuoy size={18} /> }
    ];

    // Initial setup: full-screen wizard, no sidebar
    if (status && !status.configured) {
        return (
            <div className={styles.initial}>
                <div className={styles.initialBrand}>
                    <div className={styles.logo}><Hash size={17} /></div>
                    <div className={`${styles.brandName} ${styles.brandNameXl}`}>{t('app.name')}</div>
                </div>
                <div className={styles.initialBody}>
                    <SetupWizard mode="initial" onComplete={handleSetupComplete} />
                </div>
            </div>
        );
    }

    const renderNavItem = (item: { id: Tab; label: string; icon: React.ReactNode }) => (
        <button
            key={item.id}
            className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
            onClick={() => switchTab(item.id)}
        >
            {item.icon}
            {item.label}
            {item.id === 'help' && updatePending && <span className={styles.navDot} />}
        </button>
    );

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div className={styles.logo}><Hash size={17} /></div>
                    <div className={styles.brandName}>{t('app.name')}</div>
                </div>

                <nav className={styles.nav}>
                    {NAV_TOP.map(renderNavItem)}
                </nav>
                <nav className={styles.navBottom}>
                    <button className={styles.navItem} onClick={() => setLangModalOpen(true)}>
                        <Languages size={18} />
                        {t('nav.language')}
                    </button>
                    {NAV_BOTTOM.map(renderNavItem)}
                </nav>

                <div className={styles.status}>
                    <span className={`${styles.dot} ${status?.configured ? styles.on : ''}`} />
                    <div>
                        <div>{status?.configured ? t('status.configured') : t('status.unset')}</div>
                        {(status?.guildName || status?.guildId) && (
                            <div className={styles.statusGuild}>{status.guildName || status.guildId}</div>
                        )}
                    </div>
                </div>
            </aside>

            <main className={styles.main}>
                <div key={activeTab} className={`anim-rise ${styles.tabPane}`}>
                    {activeTab === 'presets' && <PresetEditor />}
                    {activeTab === 'runner' && <Runner guildId={status?.guildId ?? ''} />}
                    {activeTab === 'cleaner' && <Cleaner />}
                    {activeTab === 'help' && <Help status={status} onOpenSetup={() => switchTab('setup')} />}
                    {activeTab === 'setup' && (
                        <SetupWizard
                            mode="reconfigure"
                            onCancel={() => setActiveTab(prevTab)}
                            onComplete={handleSetupComplete}
                        />
                    )}
                </div>
            </main>

            {pendingTab && (
                <ConfirmDialog
                    title={t('unsaved.title')}
                    message={t('unsaved.message')}
                    confirmLabel={t('unsaved.confirm')}
                    tone="danger"
                    onConfirm={() => { const tab = pendingTab; setPendingTab(null); doSwitchTab(tab); }}
                    onCancel={() => setPendingTab(null)}
                />
            )}

            {langModalOpen && (
                <Modal title={t('lang.pick')} onClose={() => setLangModalOpen(false)}>
                    <div className={styles.langList}>
                        {LANGS.map(l => (
                            <label key={l.code} className={styles.langRow}>
                                <input
                                    type="radio"
                                    name="lang"
                                    checked={lang === l.code}
                                    onChange={() => setLang(l.code)}
                                />
                                <span>{l.label}</span>
                            </label>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}

function App() {
    return (
        <I18nProvider>
            <ToastProvider>
                <UnsavedProvider>
                    <Shell />
                </UnsavedProvider>
            </ToastProvider>
        </I18nProvider>
    );
}

export default App;
