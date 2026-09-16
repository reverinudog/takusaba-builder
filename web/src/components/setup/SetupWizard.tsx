import { useEffect, useState } from 'react';
import {
    Check, ExternalLink, Eye, EyeOff, ShieldCheck, RefreshCw,
    ArrowRight, ServerOff
} from 'lucide-react';
import * as api from '../../api';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import Input from '../../ui/Input';
import Field from '../../ui/Field';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Avatar from '../../ui/Avatar';
import Callout from '../../ui/Callout';
import EmptyState from '../../ui/EmptyState';
import CheckList from './CheckList';
import { useI18n, apiErrMsg } from '../../i18n';
import styles from './SetupWizard.module.css';

const PORTAL_URL = 'https://discord.com/developers/applications';

type Props = {
    mode: 'initial' | 'reconfigure';
    onComplete: () => void;
    onCancel?: () => void;
};

export default function SetupWizard({ mode, onComplete, onCancel }: Props) {
    const { t } = useI18n();
    const errMsg = (e: unknown) => apiErrMsg(t, e);
    const STEPS = [t('wiz.step0'), t('wiz.step1'), t('wiz.step2'), t('wiz.step3'), t('wiz.step4')];
    const [step, setStep] = useState(0);
    const [token, setToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [verify, setVerify] = useState<Extract<api.VerifyTokenResult, { ok: true }> | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [guilds, setGuilds] = useState<{ id: string, name: string, icon: string | null }[] | null>(null);
    const [guildsLoading, setGuildsLoading] = useState(false);
    const [guildsError, setGuildsError] = useState<string | null>(null);
    const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
    const [checks, setChecks] = useState<api.SetupCheckItem[] | null>(null);
    const [checksLoading, setChecksLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const intentOk = verify?.intents.guildMembers === true;
    const canNext =
        step === 0 || step === 1 ||
        (step === 2 && !!verify && intentOk) ||
        (step === 3 && !!selectedGuildId);

    const handleVerify = async () => {
        const tok = token.trim();
        if (!tok || verifying) return;
        setVerifying(true);
        setVerifyError(null);
        try {
            const res = await api.verifyToken(tok);
            if (res.ok) setVerify(res);
            else setVerifyError(apiErrMsg(t, { code: res.code, message: res.message }));
        } catch (e) {
            setVerifyError(errMsg(e));
        } finally {
            setVerifying(false);
        }
    };

    const loadGuilds = async () => {
        const tok = token.trim();
        if (!tok) return;
        setGuildsLoading(true);
        setGuildsError(null);
        try {
            const res = await api.listGuilds(tok);
            if (res.ok) setGuilds(res.guilds);
            else setGuildsError(res.message);
        } catch (e) {
            setGuildsError(errMsg(e));
        } finally {
            setGuildsLoading(false);
        }
    };

    const runCheck = async () => {
        setChecksLoading(true);
        setSaveError(null);
        try {
            await api.saveSetup(token.trim(), selectedGuildId!);
            const res = await api.runSetupCheck();
            setChecks(res.checks);
        } catch (e) {
            setSaveError(errMsg(e));
        } finally {
            setChecksLoading(false);
        }
    };

    // Auto-load guilds when entering step 3, auto-save+check on step 4
    useEffect(() => {
        if (step === 3 && guilds === null && !guildsLoading) loadGuilds();
        if (step === 4 && checks === null && !checksLoading && !saveError) runCheck();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const next = () => {
        if (canNext && step < 4) setStep(step + 1);
    };
    const back = () => {
        if (step === 4) {
            setChecks(null);
            setSaveError(null);
        }
        if (step > 0) setStep(step - 1);
    };

    const allOk = !!checks && checks.every(c => c.ok);

    return (
        <div className={mode === 'initial' ? styles.layoutFull : styles.layout}>
            <div className={styles.rail}>
                {STEPS.map((label, i) => (
                    <div
                        key={i}
                        className={`${styles.railItem} ${i < step ? styles.done : ''} ${i === step ? styles.current : ''}`}
                    >
                        <span className={styles.railNum}>
                            {i < step ? <Check size={13} /> : i + 1}
                        </span>
                        <span className={styles.railLabel}>{label}</span>
                    </div>
                ))}
            </div>

            <div className={styles.body}>
                {mode === 'reconfigure' && (
                    <div className={styles.reconfigRow}>
                        <Callout tone="info">{t('wiz.reconfig')}</Callout>
                        {onCancel && <Button variant="ghost" onClick={onCancel}>{t('common.back')}</Button>}
                    </div>
                )}
                <div key={step} className="anim-rise">
                    <Card className={styles.stepCard}>
                        {step === 0 && (
                            <>
                                <h2 className={styles.stepTitle}>{t('wiz.s0.title')}</h2>
                                <p className={styles.lead}>
                                    {t('wiz.s0.lead')}
                                </p>
                                <ul className={styles.prepList}>
                                    <li><Check size={16} /> {t('wiz.s0.prep1')}</li>
                                    <li><Check size={16} /> {t('wiz.s0.prep2')}</li>
                                    <li><Check size={16} /> {t('wiz.s0.prep3')}</li>
                                </ul>
                                <Callout tone="info">
                                    {t('wiz.s0.note')}
                                </Callout>
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <h2 className={styles.stepTitle}>{t('wiz.s1.title')}</h2>
                                <div>
                                    <Button
                                        icon={<ExternalLink size={16} />}
                                        onClick={() => window.open(PORTAL_URL, '_blank', 'noreferrer')}
                                    >
                                        {t('wiz.s1.open')}
                                    </Button>
                                    <p className={`${styles.stepNote} ${styles.portalNote}`}>
                                        {t('wiz.s1.login')}
                                    </p>
                                    {t('wizard.step1.portalLangNote') !== '' && (
                                        <p className={styles.stepNote}>{t('wizard.step1.portalLangNote')}</p>
                                    )}
                                </div>
                                <ol className={styles.steps}>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s1.i1') }} />
                                            <span className={styles.stepNote}>{t('wiz.s1.i1n')}</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s1.i2') }} />
                                            <span className={styles.stepNote}>{t('wiz.s1.i2n')}</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s1.i3') }} />
                                            <span className={styles.stepNote}>{t('wiz.s1.i3n')}</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s1.i4') }} />
                                        </div>
                                    </li>
                                </ol>
                                <Callout tone="warning">
                                    {t('wiz.s1.warn')}
                                </Callout>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <h2 className={styles.stepTitle}>{t('wiz.s2.title')}</h2>
                                <Field label={t('wiz.s2.label')}>
                                    <div className={styles.tokenRow}>
                                        <div className={styles.tokenInput}>
                                            <Input
                                                type={showToken ? 'text' : 'password'}
                                                value={token}
                                                placeholder={t('wiz.s2.ph')}
                                                onChange={e => {
                                                    setToken(e.target.value);
                                                    setVerify(null);
                                                    setVerifyError(null);
                                                    setGuilds(null);
                                                    setSelectedGuildId(null);
                                                }}
                                                onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
                                            />
                                            <span className={styles.eyeBtn}>
                                                <IconButton
                                                    size="sm"
                                                    title={showToken ? t('wiz.s2.hide') : t('wiz.s2.show')}
                                                    onClick={() => setShowToken(!showToken)}
                                                >
                                                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </IconButton>
                                            </span>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            icon={<ShieldCheck size={16} />}
                                            loading={verifying}
                                            disabled={!token.trim()}
                                            onClick={handleVerify}
                                        >
                                            {t('wiz.s2.verify')}
                                        </Button>
                                    </div>
                                </Field>

                                {verifyError && (
                                    <>
                                        <Callout tone="danger">
                                            {t('wiz.s2.err')}
                                        </Callout>
                                        <div className={styles.errorMsg}>{verifyError}</div>
                                    </>
                                )}

                                {verify && (
                                    <div className={styles.botCard}>
                                        <Avatar
                                            src={verify.bot.avatar ? `https://cdn.discordapp.com/avatars/${verify.bot.id}/${verify.bot.avatar}.png` : null}
                                            name={verify.bot.username}
                                            size={40}
                                        />
                                        <div className={styles.botInfo}>
                                            <div className={styles.botName}>{verify.bot.username}</div>
                                            <div className={styles.botMeta}>
                                                Server Members Intent: {verify.intents.guildMembers ? t('wiz.s2.intentOn') : t('wiz.s2.intentOff')}
                                            </div>
                                        </div>
                                        <Badge tone="success">{t('wiz.s2.ok')}</Badge>
                                    </div>
                                )}

                                {verify && !verify.intents.guildMembers && (
                                    <>
                                        <Callout tone="danger">
                                            {t('wiz.s2.intentErr')}
                                        </Callout>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={<ExternalLink size={13} />}
                                            onClick={() => window.open(PORTAL_URL, '_blank', 'noreferrer')}
                                        >
                                            {t('wiz.s1.open')}
                                        </Button>
                                    </>
                                )}
                            </>
                        )}

                        {step === 3 && verify && (
                            <>
                                <h2 className={styles.stepTitle}>{t('wiz.s3.title')}</h2>
                                <p className={styles.lead}>{t('wiz.s3.lead')}</p>
                                <div>
                                    <Button
                                        icon={<ExternalLink size={16} />}
                                        onClick={() => window.open(verify.inviteUrl, '_blank', 'noreferrer')}
                                    >
                                        {t('wiz.s3.open')}
                                    </Button>
                                </div>
                                <ol className={styles.steps}>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s3.i1') }} />
                                            <span className={styles.stepNote}>{t('wiz.s3.i1n')}</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s3.i2') }} />
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>{t('wiz.s3.i3')}</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain} dangerouslySetInnerHTML={{ __html: t('wiz.s3.i4') }} />
                                        </div>
                                    </li>
                                </ol>

                                <div className={styles.guildToolbar}>
                                    <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} loading={guildsLoading} onClick={loadGuilds}>
                                        {t('wiz.s3.refresh')}
                                    </Button>
                                </div>

                                {guildsError && <Callout tone="danger">{guildsError}</Callout>}

                                {guilds !== null && guilds.length === 0 && !guildsLoading && (
                                    <EmptyState
                                        icon={<ServerOff size={28} />}
                                        title={t('wiz.s3.empty.t')}
                                        description={t('wiz.s3.empty.d')}
                                    />
                                )}

                                {guilds && guilds.length > 0 && (
                                    <div className={styles.guildGrid}>
                                        {guilds.map(g => (
                                            <div
                                                key={g.id}
                                                className={`${styles.guildCard} ${selectedGuildId === g.id ? styles.selected : ''}`}
                                                role="radio"
                                                aria-checked={selectedGuildId === g.id}
                                                onClick={() => setSelectedGuildId(g.id)}
                                            >
                                                <Avatar
                                                    src={g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null}
                                                    name={g.name}
                                                    size={32}
                                                />
                                                <span className={styles.guildName}>{g.name}</span>
                                                {selectedGuildId === g.id && (
                                                    <span className={styles.guildCheck}><Check size={11} /></span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Callout tone="info">
                                    {t('wiz.s3.note')}
                                </Callout>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <h2 className={styles.stepTitle}>{t('wiz.s4.title')}</h2>
                                {saveError ? (
                                    <>
                                        <Callout tone="danger">{t('wiz.s4.saveErr', { msg: saveError })}</Callout>
                                        <div>
                                            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={runCheck}>{t('common.retry')}</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CheckList checks={checks} loading={checksLoading} />
                                        <div className={styles.recheckRow}>
                                            <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} loading={checksLoading} onClick={runCheck}>
                                                {t('wiz.s4.recheck')}
                                            </Button>
                                        </div>
                                        {allOk && (
                                            <div className={styles.startRow}>
                                                <Button size="lg" icon={<ArrowRight size={18} />} onClick={onComplete} className="anim-scale">
                                                    {t('wiz.s4.start')}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Footer nav */}
                        {step < 4 && (
                            <div className={styles.footerRow}>
                                <Button variant="ghost" onClick={back} disabled={step === 0}>{t('common.back')}</Button>
                                <Button onClick={next} disabled={!canNext}>
                                    {step === 1 ? t('wiz.next1') : step === 3 ? t('wiz.next3') : t('common.next')}
                                </Button>
                            </div>
                        )}
                        {step === 4 && (
                            <div className={styles.footerRow}>
                                <Button variant="ghost" onClick={back}>{t('common.back')}</Button>
                                <span />
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
