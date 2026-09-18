import Modal from '../ui/Modal';
import Button from '../ui/Button';
import * as api from '../api';
import { useI18n } from '../i18n';

type Props = {
    update: api.UpdateState;
    onLater: () => void;
    onGoHelp: () => void;
};

export default function UpdateModal({ update, onLater, onGoHelp }: Props) {
    const { t } = useI18n();
    const latest = update.latestVersion ?? '';

    const primary = () => {
        if (update.status === 'available' && update.manual) {
            return (
                <Button onClick={() => window.open(update.releaseUrl, '_blank', 'noreferrer')}>
                    {t('update.openPage')}
                </Button>
            );
        }
        if (update.status === 'available') {
            return (
                <Button onClick={() => { api.applyUpdate().catch(() => { }); }}>
                    {t('update.applyNow')}
                </Button>
            );
        }
        if (update.status === 'downloaded') {
            return (
                <Button onClick={() => { api.installUpdate().catch(() => { }); }}>
                    {t('update.restart')}
                </Button>
            );
        }
        return null; // 'downloading' — progress shown in body
    };

    const busy = update.status === 'downloading';

    return (
        <Modal
            title={t('update.modal.title', { latest })}
            onClose={onLater}
            footer={
                <>
                    <Button variant="ghost" onClick={onGoHelp} disabled={busy}>
                        {t('update.modal.help')}
                    </Button>
                    <Button variant="secondary" onClick={onLater} disabled={busy}>
                        {t('update.later')}
                    </Button>
                    {!busy && primary()}
                </>
            }
        >
            <p>{t('update.modal.body')}</p>
            {!update.manual && <p>{t('update.applyNote')}</p>}
            <p>
                v{update.currentVersion} → v{latest}
                {busy && ` — ${t('update.downloading', { n: update.progress ?? 0 })}`}
            </p>
        </Modal>
    );
}
