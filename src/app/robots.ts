import { type MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/test-auth'],
    },
     sitemap: 'https://studio--bingo-salesmate.us-central1.hosted.app/sitemap.xml',
  }
}
