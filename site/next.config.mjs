// サーバーを持たず、ビルドしたときに全ページを HTML にしておく（out/ に出る。置くだけで公開できる）
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
