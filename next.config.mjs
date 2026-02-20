import createNextIntlPlugin from 'next-intl/plugin';

// ★ ここが重要：request.ts を明示
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};

export default withNextIntl(nextConfig);

