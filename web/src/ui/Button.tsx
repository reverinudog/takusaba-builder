import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: ReactNode;
    loading?: boolean;
};

export default function Button({
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    disabled,
    className = '',
    children,
    ...rest
}: Props) {
    return (
        <button
            className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
            disabled={disabled || loading}
            {...rest}
        >
            {loading ? <Loader2 size={18} className={styles.spin} /> : icon}
            {children}
        </button>
    );
}
