import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {SEO_PAGES, SITE_DOMAIN} from './src/data/seoPages';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function seoStaticPagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-seo-static-pages',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) return;

      const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

      for (const page of SEO_PAGES) {
        const canonicalUrl = `${SITE_DOMAIN}/${page.slug}/`;
        const safeTitle = escapeHtml(page.title);
        const safeDesc = escapeHtml(page.metaDescription);
        const safeKeywords = escapeHtml(page.keywords);

        const jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SportsActivityLocation',
              name: 'Лазер Квест — Лазертаг в Сочи и Адлере',
              url: canonicalUrl,
              telephone: '+7 (985) 132-83-22',
              description: page.metaDescription,
              areaServed: ['Сочи', 'Адлер', 'Дагомыс', 'Красная Поляна', 'Сириус'],
              priceRange: `от ${page.priceFrom} ₽`,
            },
            {
              '@type': 'FAQPage',
              mainEntity: page.faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            },
          ],
        });

        const relatedLinksHtml = page.relatedSlugs
          .map((relSlug) => {
            const rel = SEO_PAGES.find((p) => p.slug === relSlug);
            if (!rel) return '';
            return `<li><a href="/${rel.slug}/">${escapeHtml(rel.h1)}</a></li>`;
          })
          .filter(Boolean)
          .join('');

        const prerenderedBody = `
          <main style="background:#09090b;color:#f4f4f5;font-family:sans-serif;padding:32px;max-width:960px;margin:0 auto;">
            <a href="/">← Лазер Квест (Главная)</a>
            <h1>${escapeHtml(page.h1)}</h1>
            <p>${escapeHtml(page.subtitle)}</p>
            <p>${escapeHtml(page.intro)}</p>
            <h2>Преимущества и площадки (${escapeHtml(page.district)})</h2>
            <ul>${page.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
            <ul>${page.locations.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
            <h2>Сценарии игр</h2>
            <ul>${page.scenarios.map((s) => `<li><strong>${escapeHtml(s.name)}</strong>: ${escapeHtml(s.desc)}</li>`).join('')}</ul>
            <h2>Частые вопросы</h2>
            ${page.faq.map((f) => `<section><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></section>`).join('')}
            <nav><ul>${relatedLinksHtml}</ul></nav>
          </main>
        `.trim();

        let pageHtml = baseHtml
          .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
          .replace(
            /<meta\s+name="description"[\s\S]*?\/>/i,
            `<meta name="description" content="${safeDesc}" />`
          )
          .replace(
            /<meta\s+name="keywords"[\s\S]*?\/>/i,
            `<meta name="keywords" content="${safeKeywords}" />`
          )
          .replace(
            /<link\s+rel="canonical"[\s\S]*?\/>/i,
            `<link rel="canonical" href="${canonicalUrl}" />`
          )
          .replace(
            /<meta\s+property="og:url"[\s\S]*?\/>/i,
            `<meta property="og:url" content="${canonicalUrl}" />`
          )
          .replace(
            /<meta\s+property="og:title"[\s\S]*?\/>/i,
            `<meta property="og:title" content="${safeTitle}" />`
          )
          .replace(
            /<meta\s+property="og:description"[\s\S]*?\/>/i,
            `<meta property="og:description" content="${safeDesc}" />`
          )
          .replace(
            /<meta\s+name="twitter:title"[\s\S]*?\/>/i,
            `<meta name="twitter:title" content="${safeTitle}" />`
          )
          .replace(
            /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
            `<meta name="twitter:description" content="${safeDesc}" />`
          )
          .replace(
            /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
            `<script type="application/ld+json">${jsonLd}</script>`
          )
          .replace(
            /<div id="root"><\/div>/i,
            `<div id="root">${prerenderedBody}</div>`
          );

        const pageDir = path.join(distDir, page.slug);
        fs.mkdirSync(pageDir, {recursive: true});
        fs.writeFileSync(path.join(pageDir, 'index.html'), pageHtml, 'utf-8');
      }
    },
  };
}

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), seoStaticPagesPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
