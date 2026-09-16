import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type Props = {
    tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'accent';
    children: ReactNode;
};

export default function Badge({ tone = 'neutral', children }: Props) {
    return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
