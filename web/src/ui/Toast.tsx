import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext, type ToastTone } from './toastContext';
import { useI18n } from '../i18n';
import styles from './Toast.module.css';

type Toast = { id: number; message: string; tone: ToastTone };

const ICONS: Record<ToastTone, ReactNode> = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
    const { t } = useI18n();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [paused, setPaused] = useState(false);

    const dismiss = useCallback((id: number) => {
        setToasts(ts => ts.filter(t => t.id !== id));
    }, []);

    const push = useCallback((message: string, tone: ToastTone = 'info') => {
        const id = nextId++;
        setToasts(ts => [...ts, { id, message, tone }]);
        setTimeout(() => {
            setToasts(ts => (paused ? ts : ts.filter(t => t.id !== id)));
        }, 4000);
    }, [paused]);

    return (
        <ToastContext.Provider value={push}>
            {children}
            {createPortal(
                <div
                    className={styles.stack}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {toasts.map(toast => (
                        <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
                            <span className={styles.icon}>{ICONS[toast.tone]}</span>
                            <span className={styles.msg}>{toast.message}</span>
                            <button className={styles.close} onClick={() => dismiss(toast.id)} aria-label={t('common.close')}>
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}
