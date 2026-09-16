import type { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useI18n } from '../i18n';
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
    confirmLabel,
    tone = 'default',
    loading,
    hideCancel,
    onConfirm,
    onCancel
}: Props) {
    const { t } = useI18n();
    return (
        <Modal
            title={title}
            onClose={onCancel}
            footer={
                <>
                    {!hideCancel && <Button variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>}
                    <Button
                        variant={tone === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel ?? t('common.confirm')}
                    </Button>
                </>
            }
        >
            <div className={styles.message}>{message}</div>
        </Modal>
    );
}
