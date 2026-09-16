import type { ReactNode } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import styles from './Callout.module.css';

type Props = {
    tone: 'warning' | 'danger' | 'info';
    children: ReactNode;
};

const ICONS = {
    warning: <AlertTriangle size={18} />,
    danger: <AlertCircle size={18} />,
    info: <Info size={18} />
};

export default function Callout({ tone, children }: Props) {
    return (
        <div className={`${styles.callout} ${styles[tone]}`}>
            <span className={styles.icon}>{ICONS[tone]}</span>
            <div className={styles.content}>{children}</div>
        </div>
    );
}
