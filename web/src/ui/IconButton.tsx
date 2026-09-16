import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    title: string;
    size?: 'sm' | 'md';
    tone?: 'default' | 'danger';
    children: ReactNode;
};

export default function IconButton({ title, size = 'md', tone = 'default', className = '', children, ...rest }: Props) {
    return (
        <button
            className={`${styles.btn} ${styles[size]} ${styles[tone]} ${className}`}
            title={title}
            aria-label={title}
            {...rest}
        >
            {children}
        </button>
    );
}
