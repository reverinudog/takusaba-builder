import { useState } from 'react';
import {
    LayoutList, Play, Trash2, Settings2, Stethoscope,
    ChevronRight, ExternalLink, FolderOpen
} from 'lucide-react';
import * as api from '../api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Callout from '../ui/Callout';
import CheckList from './setup/CheckList';
import { errMsg } from '../ui/toastContext';
import styles from './Help.module.css';

type Props = {
    onOpenSetup: () => void;
    status: api.SetupStatus | null;
};

const FLOW = [
    { icon: <LayoutList size={18} />, title: 'テンプレを作る', desc: '卓で毎回使うチャンネル構成（概要・日程調整・雑談・キャラシ提出…）と、最初に投稿する案内文や画像を「プリセット」として登録します。' },
    { icon: <Play size={18} />, title: '卓を立てる', desc: 'プリセットを選び、卓名（カテゴリ名）と参加者（PL）を選ぶだけ。参加者だけが見えるカテゴリとチャンネルが一括で作られます。' },
    { icon: <Trash2 size={18} />, title: '片付ける', desc: '終わった卓は、カテゴリごとチャンネルをまとめて削除できます。' }
];

export default function Help({ onOpenSetup, status }: Props) {
    const [checks, setChecks] = useState<api.SetupCheckItem[] | null>(null);
    const [checking, setChecking] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    const runCheck = async () => {
        setChecking(true);
        setCheckError(null);
        try {
            const res = await api.runSetupCheck();
            setChecks(res.checks);
        } catch (e) {
            setCheckError(errMsg(e));
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                <h2>ヘルプ</h2>

                <Card header="使い方の流れ">
                    <div className={styles.flowGrid}>
                        {FLOW.map((f, i) => (
                            <div key={i} className={styles.flowCard}>
                                <div className={styles.flowHead}>
                                    <span className={styles.flowNum}>{i + 1}</span>
                                    {f.icon}
                                    {f.title}
                                </div>
                                <div className={styles.flowDesc}>{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card
                    header="接続状態"
                    actions={
                        <Button size="sm" icon={<Settings2 size={16} />} onClick={onOpenSetup}>
                            セットアップをやり直す
                        </Button>
                    }
                >
                    <CheckList checks={checks} loading={checking} />
                    {checkError && <Callout tone="danger">{checkError}</Callout>}
                    <div className={styles.checkRow}>
                        <Button variant="secondary" size="sm" icon={<Stethoscope size={16} />} loading={checking} onClick={runCheck}>
                            診断を実行
                        </Button>
                    </div>
                </Card>

                <Card header="よくあるトラブル">
                    <div className={styles.faq}>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> メンバー一覧が空 / 取得できない</summary>
                            <div className={styles.faqBody}>
                                Developer Portal → Bot → SERVER MEMBERS INTENT が ON か確認 → Save Changes → 上の「診断を実行」。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> チャンネル作成に失敗する</summary>
                            <div className={styles.faqBody}>
                                Bot の権限不足が原因です。上の診断で不足権限を確認してください。招待リンクをもう一度開くと権限が更新されます。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> 卓を立てたのに参加者から見えないと言われた</summary>
                            <div className={styles.faqBody}>
                                実行時に参加者を選んだか確認してください。選び忘れた場合は、Discord でそのカテゴリを右クリック →「カテゴリの編集」→「権限」からメンバーを追加できます。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> 招待先の一覧にサーバーが出ない</summary>
                            <div className={styles.faqBody}>
                                そのサーバーであなたに「管理者」または「サーバー管理」権限が必要です。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> トークンを他人に見られた / 漏れたかも</summary>
                            <div className={styles.faqBody}>
                                Developer Portal → Bot → Reset Token で無効化し、「セットアップをやり直す」から新しいトークンを保存してください。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> Mac で「開発元を検証できないため開けません」と出る</summary>
                            <div className={styles.faqBody}>
                                Finder でアプリを右クリック →「開く」。それでも開けない場合は システム設定 → プライバシーとセキュリティ → 下部の「このまま開く」。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> セキュリティソフトに止められる</summary>
                            <div className={styles.faqBody}>
                                このアプリを「許可」に設定してください。このツールは Discord へのアクセスだけを行い、それ以外の通信はしません。
                            </div>
                        </details>
                        <details className={styles.faqItem}>
                            <summary><ChevronRight size={16} /> 別のパソコンに移したい</summary>
                            <div className={styles.faqBody}>
                                下の「データフォルダを開く」で開くフォルダごと、新しいパソコンにコピーしてください。
                            </div>
                        </details>
                    </div>
                </Card>

                <Card
                    header="データの保存場所"
                    actions={
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<FolderOpen size={16} />}
                            onClick={() => api.openDataDir().catch(e => setCheckError(errMsg(e)))}
                        >
                            データフォルダを開く
                        </Button>
                    }
                >
                    <p><code className={styles.mono}>{status?.dataDir ?? 'data'}</code></p>
                    <div className={styles.dataNote}>
                        <Callout tone="warning">
                            <code className={styles.mono}>data/config.json</code> にはトークンが保存されています。<code className={styles.mono}>data</code> フォルダを他人に渡さないでください。プリセットと画像は <code className={styles.mono}>data/presets.json</code> と <code className={styles.mono}>data/assets/</code> にあります。
                        </Callout>
                    </div>
                </Card>

                <Card header="参考リンク">
                    <div className={styles.linkList}>
                        <a className={styles.linkItem} href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> Discord Developer Portal
                        </a>
                        <a className={styles.linkItem} href="https://docs.discord.com/developers/quick-start/getting-started" target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> Discord 公式「Botの作り方」ドキュメント
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
}
