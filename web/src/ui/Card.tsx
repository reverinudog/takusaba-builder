import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

type Props = HTMLAttributes<HTMLDivElement> & {
    header?: ReactNode;
    actions?: ReactNode;
    flush?: boolean;
};

export default function Card({ header, actions, flush, className = '', children, ...rest }: Props) {
    return (
        <div className={`${styles.card} ${flush ? styles.flush : ''} ${className}`} {...rest}>
            {(header || actions) && (
                <div className={styles.header}>
                    <div className={styles.headerContent}>{header}</div>
                    {actions && <div className={styles.actions}>{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
