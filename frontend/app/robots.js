export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/admin', '/login', '/forgot-password', '/reset-password'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
