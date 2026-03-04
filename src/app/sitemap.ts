import { MetadataRoute } from 'next';

/**
 * @file sitemap.ts
 * @description Generates the XML sitemap for ContextRiver.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://contextriver.ai';
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
