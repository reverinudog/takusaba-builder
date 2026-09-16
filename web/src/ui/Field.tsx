import type { ReactNode } from 'react';
import styles from './Field.module.css';

type Props = {
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
};

export default function Field({ label, required, hint, error, children }: Props) {
    return (
        <div className={styles.field}>
            <label className={styles.label}>
                {label}
                {required && <span className={styles.req}>*</span>}
            </label>
            {children}
            {hint && !error && <div className={styles.hint}>{hint}</div>}
            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
}
