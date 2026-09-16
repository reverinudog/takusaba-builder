import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

type Props = {
    title: ReactNode;
    description?: ReactNode;
    footer?: ReactNode;
    width?: number | string;
    onClose?: () => void;
    children: ReactNode;
};

export default function Modal({ title, description, footer, width = 480, onClose, children }: Props) {
    useEffect(() => {
        if (!onClose) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return createPortal(
        <div className={`${styles.overlay} anim-fade`} onClick={onClose}>
            <div
                className={`${styles.panel} anim-scale`}
                style={{ width }}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <h2 className={styles.title}>{title}</h2>
                {description && <p className={styles.description}>{description}</p>}
                <div className={styles.body}>{children}</div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>,
        document.body
    );
}
