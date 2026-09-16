import { useEffect, useState } from 'react';
import { Hash, LayoutList, Play, Trash2, Settings2, LifeBuoy } from 'lucide-react';
import PresetEditor from './components/PresetEditor';
import Runner from './components/Runner';
import Cleaner from './components/Cleaner';
import Help from './components/Help';
import SetupWizard from './components/setup/SetupWizard';
import { ToastProvider } from './ui/Toast';
import { useToast } from './ui/toastContext';
import { UnsavedProvider, useUnsaved } from './ui/unsavedContext';
import ConfirmDialog from './ui/ConfirmDialog';
import Spinner from './ui/Spinner';
import * as api from './api';
import styles from './App.module.css';

type Tab = 'presets' | 'runner' | 'cleaner' | 'setup' | 'help';

const NAV_TOP: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'presets', label: 'プリセット', icon: <LayoutList size={18} /> },
    { id: 'runner', label: '実行', icon: <Play size={18} /> },
    { id: 'cleaner', label: 'カテゴリ削除', icon: <Trash2 size={18} /> }
];

const NAV_BOTTOM: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'setup', label: 'セットアップ', icon: <Settings2 size={18} /> },
    { id: 'help', label: 'ヘルプ', icon: <LifeBuoy size={18} /> }
];

function Shell() {
    const toast = useToast();
    const { isDirty } = useUnsaved();
    const [activeTab, setActiveTab] = useState<Tab>('presets');
    const [prevTab, setPrevTab] = useState<Tab>('presets');
    const [pendingTab, setPendingTab] = useState<Tab | null>(null);
    const [status, setStatus] = useState<api.SetupStatus | null>(null);
    const [statusLoaded, setStatusLoaded] = useState(false);

    const refreshStatus = () =>
        api.getSetupStatus()
            .then(s => setStatus(s))
            .catch(() => setStatus(null))
            .finally(() => setStatusLoaded(true));

    useEffect(() => {
        refreshStatus();
    }, []);

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
        toast('セットアップが完了しました', 'success');
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

    // Initial setup: full-screen wizard, no sidebar
    if (status && !status.configured) {
        return (
            <div className={styles.initial}>
                <div className={styles.initialBrand}>
                    <div className={styles.logo}><Hash size={17} /></div>
                    <div>
                        <div className={styles.brandName}>Session Room Builder</div>
                        <div className={styles.brandSub}>TRPG session room builder</div>
                    </div>
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
        </button>
    );

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div className={styles.logo}><Hash size={17} /></div>
                    <div>
                        <div className={styles.brandName}>Session Room Builder</div>
                        <div className={styles.brandSub}>TRPG session room builder</div>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {NAV_TOP.map(renderNavItem)}
                </nav>
                <nav className={styles.navBottom}>
                    {NAV_BOTTOM.map(renderNavItem)}
                </nav>

                <div className={styles.status}>
                    <span className={`${styles.dot} ${status?.configured ? styles.on : ''}`} />
                    <div>
                        <div>{status?.configured ? '接続設定済み' : '未設定'}</div>
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
                    title="未保存の変更"
                    message="保存していない変更があります。破棄して続けますか？"
                    confirmLabel="破棄して続ける"
                    tone="danger"
                    onConfirm={() => { const tab = pendingTab; setPendingTab(null); doSwitchTab(tab); }}
                    onCancel={() => setPendingTab(null)}
                />
            )}
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <UnsavedProvider>
                <Shell />
            </UnsavedProvider>
        </ToastProvider>
    );
}

export default App;
