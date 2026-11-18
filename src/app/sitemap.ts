import type { MetadataRoute } from 'next';

const siteOrigin = 'https://idealab-mec-web.vercel.app';
const publicPaths = ['/', '/explore', '/lab', '/projects', '/events'];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map(path => ({
    url: new URL(path, siteOrigin).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
