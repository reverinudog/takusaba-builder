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
import { errMsg } from '../../ui/toastContext';
import styles from './SetupWizard.module.css';

const PORTAL_URL = 'https://discord.com/developers/applications';
const STEPS = ['はじめに', 'Bot を作る', 'トークンを貼り付け', 'サーバーに招待', '接続チェック'];

type Props = {
    mode: 'initial' | 'reconfigure';
    onComplete: () => void;
    onCancel?: () => void;
};

export default function SetupWizard({ mode, onComplete, onCancel }: Props) {
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
        const t = token.trim();
        if (!t || verifying) return;
        setVerifying(true);
        setVerifyError(null);
        try {
            const res = await api.verifyToken(t);
            if (res.ok) setVerify(res);
            else setVerifyError(res.message);
        } catch (e) {
            setVerifyError(errMsg(e));
        } finally {
            setVerifying(false);
        }
    };

    const loadGuilds = async () => {
        const t = token.trim();
        if (!t) return;
        setGuildsLoading(true);
        setGuildsError(null);
        try {
            const res = await api.listGuilds(t);
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
                        <Callout tone="info">現在の接続設定を上書きします。</Callout>
                        {onCancel && <Button variant="ghost" onClick={onCancel}>戻る</Button>}
                    </div>
                )}
                <div key={step} className="anim-rise">
                    <Card className={styles.stepCard}>
                        {step === 0 && (
                            <>
                                <h2 className={styles.stepTitle}>TRPG 卓の準備をはじめましょう</h2>
                                <p className={styles.lead}>
                                    このツールは、TRPG のセッションごとに必要な Discord のチャンネル一式（概要・日程調整・雑談・キャラシ提出など）をワンクリックで作成し、終わったらまとめて片付けるためのものです。
                                    動かすには「Bot（ボット）」という、あなた専用の自動操作アカウントを Discord 上で1つ作る必要があります。
                                </p>
                                <ul className={styles.prepList}>
                                    <li><Check size={16} /> Discord アカウント（ログイン済みのブラウザ）</li>
                                    <li><Check size={16} /> 卓を立てる Discord サーバーの管理者権限（自分が作ったサーバーならOK）</li>
                                    <li><Check size={16} /> 所要時間 約5分</li>
                                </ul>
                                <Callout tone="info">
                                    作業は Discord の公式サイト（Developer Portal）とこの画面を行ったり来たりします。この画面は閉じずに進めてください。
                                </Callout>
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <h2 className={styles.stepTitle}>Bot を作る</h2>
                                <div>
                                    <Button
                                        icon={<ExternalLink size={16} />}
                                        onClick={() => window.open(PORTAL_URL, '_blank', 'noreferrer')}
                                    >
                                        Developer Portal を開く
                                    </Button>
                                    <p className={`${styles.stepNote} ${styles.portalNote}`}>
                                        Discord のログインを求められたら、普段のアカウントでログインしてください。
                                    </p>
                                </div>
                                <ol className={styles.steps}>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>
                                                右上の <strong>「New Application」</strong> を押し、名前を入力（例: サーバーセットアップ君）→ 利用規約にチェック → <strong>「Create」</strong>
                                            </span>
                                            <span className={styles.stepNote}>この名前が Bot の表示名になります。後から変更できます。</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>左メニューの <strong>「Bot」</strong> を開く</span>
                                            <span className={styles.stepNote}>Bot は自動で作成済みです。「Add Bot」ボタンは現在ありません。</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>
                                                下にスクロールし <strong>「Privileged Gateway Intents」</strong> の <strong>「SERVER MEMBERS INTENT」</strong> を ON にし、画面下の <strong>「Save Changes」</strong>
                                            </span>
                                            <span className={styles.stepNote}>メンバー一覧を取得するために必要です。これを忘れると次の画面で止まります。</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>
                                                同じページ上部の <strong>「Reset Token」</strong> → <strong>「Yes, do it!」</strong>（2段階認証を設定している場合は認証アプリのコードを入力）→ 表示された文字列の <strong>「Copy」</strong> を押す
                                            </span>
                                        </div>
                                    </li>
                                </ol>
                                <Callout tone="warning">
                                    トークンは<strong>パスワードと同じ</strong>です。誰にも見せず、画面にも一度しか表示されません。コピーし忘れたら、もう一度「Reset Token」を押せば新しいものが作れます。
                                </Callout>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <h2 className={styles.stepTitle}>トークンを貼り付け</h2>
                                <Field label="Bot トークン">
                                    <div className={styles.tokenRow}>
                                        <div className={styles.tokenInput}>
                                            <Input
                                                type={showToken ? 'text' : 'password'}
                                                value={token}
                                                placeholder="コピーしたトークンを貼り付け"
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
                                                    title={showToken ? '隠す' : '表示'}
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
                                            確認
                                        </Button>
                                    </div>
                                </Field>

                                {verifyError && (
                                    <>
                                        <Callout tone="danger">
                                            トークンが正しくありません。コピー漏れや前後の空白がないか確認し、手順1-4 の Reset Token からやり直してください。
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
                                                Server Members Intent: {verify.intents.guildMembers ? '有効' : '無効'}
                                            </div>
                                        </div>
                                        <Badge tone="success">認証OK</Badge>
                                    </div>
                                )}

                                {verify && !verify.intents.guildMembers && (
                                    <>
                                        <Callout tone="danger">
                                            SERVER MEMBERS INTENT が OFF です。Developer Portal の Bot ページで ON にして Save Changes を押し、もう一度「確認」を押してください。
                                        </Callout>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={<ExternalLink size={13} />}
                                            onClick={() => window.open(PORTAL_URL, '_blank', 'noreferrer')}
                                        >
                                            Developer Portal を開く
                                        </Button>
                                    </>
                                )}
                            </>
                        )}

                        {step === 3 && verify && (
                            <>
                                <h2 className={styles.stepTitle}>サーバーに招待</h2>
                                <p className={styles.lead}>作った Bot を、チャンネルを作りたいサーバーに参加させます。</p>
                                <div>
                                    <Button
                                        icon={<ExternalLink size={16} />}
                                        onClick={() => window.open(verify.inviteUrl, '_blank', 'noreferrer')}
                                    >
                                        招待リンクを開く
                                    </Button>
                                </div>
                                <ol className={styles.steps}>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>
                                                開いたページで <strong>「サーバーを追加」</strong> のプルダウンから対象サーバーを選ぶ → <strong>「はい」</strong>
                                            </span>
                                            <span className={styles.stepNote}>自分が管理者のサーバーだけ表示されます。</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>権限の一覧が表示されたら、そのまま <strong>「認証」</strong></span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>「ロボットではありません」の確認が出たらチェック</span>
                                        </div>
                                    </li>
                                    <li>
                                        <div className={styles.stepBody}>
                                            <span className={styles.stepMain}>この画面に戻り <strong>「サーバー一覧を更新」</strong></span>
                                        </div>
                                    </li>
                                </ol>

                                <div className={styles.guildToolbar}>
                                    <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} loading={guildsLoading} onClick={loadGuilds}>
                                        サーバー一覧を更新
                                    </Button>
                                </div>

                                {guildsError && <Callout tone="danger">{guildsError}</Callout>}

                                {guilds !== null && guilds.length === 0 && !guildsLoading && (
                                    <EmptyState
                                        icon={<ServerOff size={28} />}
                                        title="Bot が参加しているサーバーがまだありません"
                                        description="招待リンクから招待したあと、更新を押してください"
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
                                    招待先のサーバーで、あなた自身に「サーバー管理」または「管理者」権限が必要です。他人のサーバーの場合は管理者に招待をお願いしてください。
                                </Callout>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <h2 className={styles.stepTitle}>接続チェック</h2>
                                {saveError ? (
                                    <>
                                        <Callout tone="danger">設定の保存に失敗しました: {saveError}</Callout>
                                        <div>
                                            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={runCheck}>再試行</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CheckList checks={checks} loading={checksLoading} />
                                        <div className={styles.recheckRow}>
                                            <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} loading={checksLoading} onClick={runCheck}>
                                                再チェック
                                            </Button>
                                        </div>
                                        {allOk && (
                                            <div className={styles.startRow}>
                                                <Button size="lg" icon={<ArrowRight size={18} />} onClick={onComplete} className="anim-scale">
                                                    はじめる
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
                                <Button variant="ghost" onClick={back} disabled={step === 0}>戻る</Button>
                                <Button onClick={next} disabled={!canNext}>
                                    {step === 1 ? 'トークンをコピーしたら次へ' : step === 3 ? 'このサーバーで設定を保存' : '次へ'}
                                </Button>
                            </div>
                        )}
                        {step === 4 && (
                            <div className={styles.footerRow}>
                                <Button variant="ghost" onClick={back}>戻る</Button>
                                <span />
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
