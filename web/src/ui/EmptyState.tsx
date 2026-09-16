import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

type Props = {
    icon: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
};

export default function EmptyState({ icon, title, description, action }: Props) {
    return (
        <div className={styles.empty}>
            <div className={styles.icon}>{icon}</div>
            <div className={styles.title}>{title}</div>
            {description && <div className={styles.desc}>{description}</div>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
