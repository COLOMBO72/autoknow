const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  const staticEntries = [{ url: siteUrl, lastModified: new Date(), priority: 1 }];

  try {
    const res = await fetch(`${API_BASE}/catalog/brands`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticEntries;
    const catalog = await res.json();

    const modelEntries = Object.entries(catalog).flatMap(([brand, models]) =>
      models.map((model) => ({
        url: `${siteUrl}/report?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}&yearFrom=2021`,
        lastModified: new Date(),
        priority: 0.7,
      })),
    );

    return [...staticEntries, ...modelEntries];
  } catch {
    // Бэкенд недоступен во время сборки — не роняем сборку сайта из-за этого,
    // просто отдаём карту только с главной страницей.
    return staticEntries;
  }
}
