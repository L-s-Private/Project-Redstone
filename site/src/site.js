// サイト全体で使う決まりごと。公開前に空のところを埋める（空のあいだは、ページに「未定」の印が出る）
export const SITE = {
  name: 'STATIC ARC',
  /** サイトの住所（最後の / なし）。リンクを貼ったときの絵や、検索エンジン向けの一覧に使う。ドメインを取ったらここを変える */
  siteUrl: 'https://static-arc.pages.dev',
  /** 提供者として出す名前 */
  provider: 'STATIC ARC',
  /** 問い合わせのメールアドレス（Minecraft のガイドライン上、必ず載せる） */
  contactEmail: '',
  /** Discord の招待リンク（期限なしで作ったもの）。空のあいだは「未定」の印が出る */
  discordUrl: '',
  /** exe のダウンロード先（誰でも取れる場所）。空のあいだは、ボタンが「準備中」になる */
  downloadUrl: '',
  /** 利用規約・プライバシーポリシーの施行日（例: 2026年11月1日） */
  effectiveDate: '',
  /** 利用規約の裁判所（提供者の住所を担当する地方裁判所） */
  court: '',
};

export const MINECRAFT_VERSION = '26.3';

// 上のメニュー（ダウンロードのボタンは別に出す）
export const NAV = [
  { href: '/features/', label: 'できること' },
  { href: '/guide/', label: '使い方ガイド' },
  { href: '/news/', label: 'お知らせ' },
  { href: '/#faq', label: 'よくある質問' },
];

// 下のメニュー（全ページ）
export const FOOTER_NAV = [
  { href: '/', label: 'トップ' },
  { href: '/features/', label: 'できること' },
  { href: '/guide/', label: '使い方ガイド' },
  { href: '/news/', label: 'お知らせ・更新履歴' },
  { href: '/contact/', label: 'お問い合わせ' },
  { href: '/terms/', label: '利用規約' },
  { href: '/privacy/', label: 'プライバシーポリシー' },
];
