import type { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

type Props = {
    title: ReactNode;
    message: ReactNode;
    confirmLabel?: string;
    tone?: 'default' | 'danger';
    loading?: boolean;
    hideCancel?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    title,
    message,
    confirmLabel = '確認',
    tone = 'default',
    loading,
    hideCancel,
    onConfirm,
    onCancel
}: Props) {
    return (
        <Modal
            title={title}
            onClose={onCancel}
            footer={
                <>
                    {!hideCancel && <Button variant="secondary" onClick={onCancel}>キャンセル</Button>}
                    <Button
                        variant={tone === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className={styles.message}>{message}</div>
        </Modal>
    );
}
