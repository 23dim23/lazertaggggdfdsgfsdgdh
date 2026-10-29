import { useState, useEffect } from 'react';
import { Service, Reel } from '../types';

export const BRAND_LOGO_RAW = '/assets/aistudio/____________f0bb9d05.png';

let cachedTransparentLogo: string | null = null;
let pendingLogoPromise: Promise<string> | null = null;

/**
 * Loads the uploaded brand shield logo and removes the outer white background
 * via corner flood-fill on an offscreen canvas so it sits cleanly on dark surfaces.
 */
export function loadTransparentLogo(): Promise<string> {
  if (cachedTransparentLogo) return Promise.resolve(cachedTransparentLogo);
  if (pendingLogoPromise) return pendingLogoPromise;

  pendingLogoPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(BRAND_LOGO_RAW);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(BRAND_LOGO_RAW);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const pushCorner = (x: number, y: number) => {
          const idx = y * w + x;
          if (!visited[idx]) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };

        pushCorner(0, 0);
        pushCorner(w - 1, 0);
        pushCorner(0, h - 1);
        pushCorner(w - 1, h - 1);

        while (head < tail) {
          const idx = queue[head++];
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];

          if (r > 215 && g > 215 && b > 215) {
            data[p + 3] = 0;
            const x = idx % w;
            const y = (idx / w) | 0;

            const neighbors = [
              x > 0 ? idx - 1 : -1,
              x < w - 1 ? idx + 1 : -1,
              y > 0 ? idx - w : -1,
              y < h - 1 ? idx + w : -1,
            ];

            for (let i = 0; i < 4; i++) {
              const nIdx = neighbors[i];
              if (nIdx !== -1 && !visited[nIdx]) {
                visited[nIdx] = 1;
                const np = nIdx * 4;
                const nr = data[np];
                const ng = data[np + 1];
                const nb = data[np + 2];
                if (nr > 205 && ng > 205 && nb > 205) {
                  queue[tail++] = nIdx;
                } else if (nr > 170 && ng > 170 && nb > 170 && Math.abs(nr - ng) < 25) {
                  // Feather anti-aliased edge
                  const avg = (nr + ng + nb) / 3;
                  data[np + 3] = Math.max(0, Math.min(255, Math.round((240 - avg) * 3.2)));
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        cachedTransparentLogo = canvas.toDataURL('image/png');
        resolve(cachedTransparentLogo);
      } catch {
        resolve(BRAND_LOGO_RAW);
      }
    };
    img.onerror = () => resolve(BRAND_LOGO_RAW);
    img.src = BRAND_LOGO_RAW;
  });

  return pendingLogoPromise;
}

export function useTransparentLogo(): string {
  const [logoSrc, setLogoSrc] = useState<string>(cachedTransparentLogo || BRAND_LOGO_RAW);

  useEffect(() => {
    let mounted = true;
    loadTransparentLogo().then((url) => {
      if (mounted) setLogoSrc(url);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return logoSrc;
}

/**
 * Generates high-contrast Tactical Laser Quest SVG cover illustrations (Black / Steel Gray / Flame Orange)
 * so every service card and VK clip has an immediate, crisp visual even offline or without external URLs.
 */
function createTacticalSvgDataUri(config: {
  title: string;
  subtitle: string;
  accentPrimary: string;
  accentSecondary: string;
  iconSvg: string;
  aspect?: '4:3' | '9:16';
}): string {
  const isVertical = config.aspect === '9:16';
  const w = isVertical ? 540 : 800;
  const h = isVertical ? 960 : 600;
  const cx = w / 2;
  const cy = isVertical ? h * 0.42 : h * 0.46;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="${config.accentPrimary}" stop-opacity="0.28"/>
        <stop offset="55%" stop-color="#18181b" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#09090b" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${config.accentPrimary}"/>
        <stop offset="100%" stop-color="${config.accentSecondary}"/>
      </linearGradient>
      <linearGradient id="steelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e4e4e7"/>
        <stop offset="50%" stop-color="#a1a1aa"/>
        <stop offset="100%" stop-color="#52525b"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" stroke-width="1" stroke-opacity="0.55"/>
      </pattern>
      <pattern id="diag" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="16" stroke="${config.accentPrimary}" stroke-width="1" stroke-opacity="0.08"/>
      </pattern>
    </defs>

    <!-- Base Carbon Black & Grid -->
    <rect width="${w}" height="${h}" fill="#09090b"/>
    <rect width="${w}" height="${h}" fill="url(#grid)"/>
    <rect width="${w}" height="${h}" fill="url(#diag)"/>
    <rect width="${w}" height="${h}" fill="url(#bgGlow)"/>

    <!-- Tactical Laser Beams -->
    <line x1="-50" y1="${h * 0.2}" x2="${w + 50}" y2="${h * 0.65}" stroke="${config.accentPrimary}" stroke-width="3" stroke-opacity="0.45"/>
    <line x1="-50" y1="${h * 0.78}" x2="${w + 50}" y2="${h * 0.25}" stroke="${config.accentSecondary}" stroke-width="2" stroke-opacity="0.35"/>
    <circle cx="${w * 0.2}" cy="${h * 0.28}" r="4" fill="${config.accentPrimary}" opacity="0.7"/>
    <circle cx="${w * 0.82}" cy="${h * 0.35}" r="3" fill="${config.accentSecondary}" opacity="0.6"/>
    <circle cx="${w * 0.75}" cy="${h * 0.7}" r="5" fill="${config.accentPrimary}" opacity="0.4"/>

    <!-- Tactical Shield / Hex Frame -->
    <polygon points="${cx},${cy - 115} ${cx + 105},${cy - 60} ${cx + 90},${cy + 80} ${cx},${cy + 125} ${cx - 90},${cy + 80} ${cx - 105},${cy - 60}"
      fill="#121215" stroke="url(#orangeGrad)" stroke-width="4" opacity="0.95"/>
    <polygon points="${cx},${cy - 103} ${cx + 93},${cy - 52} ${cx + 80},${cy + 70} ${cx},${cy + 112} ${cx - 80},${cy + 70} ${cx - 93},${cy - 52}"
      fill="none" stroke="#52525b" stroke-width="1.5" stroke-dasharray="8 4"/>

    <!-- Center Thematic Icon -->
    <g transform="translate(${cx}, ${cy - 6})">
      ${config.iconSvg}
    </g>

    <!-- HUD Corner Brackets -->
    <path d="M 24 52 L 24 24 L 52 24" fill="none" stroke="${config.accentPrimary}" stroke-width="3"/>
    <path d="M ${w - 24} 52 L ${w - 24} 24 L ${w - 52} 24" fill="none" stroke="${config.accentPrimary}" stroke-width="3"/>
    <path d="M 24 ${h - 52} L 24 ${h - 24} L 52 ${h - 24}" fill="none" stroke="#52525b" stroke-width="3"/>
    <path d="M ${w - 24} ${h - 52} L ${w - 24} ${h - 24} L ${w - 52} ${h - 24}" fill="none" stroke="#52525b" stroke-width="3"/>

    <!-- Top HUD Label -->
    <rect x="${cx - 95}" y="22" width="190" height="26" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
    <text x="${cx}" y="39" text-anchor="middle" fill="#f97316" font-family="Arial, sans-serif" font-weight="900" font-size="11" letter-spacing="2">ЛАЗЕР КВЕСТ • СОЧИ</text>

    <!-- Bottom Caption Banner -->
    <rect x="60" y="${cy + 142}" width="${w - 120}" height="64" rx="12" fill="#09090b" fill-opacity="0.82" stroke="#27272a" stroke-width="1.5"/>
    <text x="${cx}" y="${cy + 170}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-weight="900" font-size="18" letter-spacing="1.5">${config.title}</text>
    <text x="${cx}" y="${cy + 192}" text-anchor="middle" fill="#a1a1aa" font-family="Arial, sans-serif" font-weight="700" font-size="12" letter-spacing="1">${config.subtitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface PresetImageOption {
  id: string;
  label: string;
  keywords: RegExp;
  url: string;
}

export const SERVICE_PRESET_GALLERY: PresetImageOption[] = [
  {
    id: 'tactical-polygon',
    label: 'Тактический полигон',
    keywords: /полигон|верхневесел|черновицк|арен|тактич|бой|битв|основн|лазертаг/i,
    url: createTacticalSvgDataUri({
      title: 'ТАКТИЧЕСКИЙ ПОЛИГОН',
      subtitle: 'ЛАЗЕРТАГ-БИТВА И ЗАХВАТ БАЗ',
      accentPrimary: '#f97316',
      accentSecondary: '#fb923c',
      iconSvg: `
        <circle cx="0" cy="0" r="46" fill="none" stroke="#f97316" stroke-width="3"/>
        <circle cx="0" cy="0" r="20" fill="none" stroke="#e4e4e7" stroke-width="2" stroke-dasharray="5 4"/>
        <circle cx="0" cy="0" r="5" fill="#f97316"/>
        <line x1="-62" y1="0" x2="-26" y2="0" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="26" y1="0" x2="62" y2="0" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="0" y1="-62" x2="0" y2="-26" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="0" y1="26" x2="0" y2="62" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>
      `,
    }),
  },
  {
    id: 'forest-base',
    label: 'Лесная база / Волковка',
    keywords: /волковк|космическ|лес|природ|папин|дагомыс|пластунк|джапаридзе/i,
    url: createTacticalSvgDataUri({
      title: 'ЛЕСНОЙ ПОЛИГОН И БАЗА',
      subtitle: 'ИГРЫ НА СВЕЖЕМ ВОЗДУХЕ В СОЧИ',
      accentPrimary: '#ea580c',
      accentSecondary: '#f59e0b',
      iconSvg: `
        <polygon points="0,-58 -42,10 -18,10 -48,50 48,50 18,10 42,10" fill="none" stroke="#f97316" stroke-width="3.5" stroke-linejoin="round"/>
        <line x1="0" y1="-25" x2="0" y2="60" stroke="#e4e4e7" stroke-width="3" stroke-linecap="round"/>
        <circle cx="0" cy="-58" r="5" fill="#f97316"/>
      `,
    }),
  },
  {
    id: 'quest-show',
    label: 'Квест / Шоу-программа',
    keywords: /квест|кальмар|squid|шоу|among|майнкрафт|minecraft|сталкер|зомби|прятки|актер|анимац/i,
    url: createTacticalSvgDataUri({
      title: 'ЭКШН-КВЕСТ И ШОУ',
      subtitle: 'СЮЖЕТНОЕ ПРИКЛЮЧЕНИЕ С ВЕДУЩИМИ',
      accentPrimary: '#f97316',
      accentSecondary: '#ef4444',
      iconSvg: `
        <circle cx="-34" cy="18" r="18" fill="none" stroke="#f97316" stroke-width="3.5"/>
        <polygon points="0,-38 -20,-2 20,-2" fill="none" stroke="#e4e4e7" stroke-width="3.5" stroke-linejoin="round"/>
        <rect x="16" y="0" width="34" height="34" fill="none" stroke="#f97316" stroke-width="3.5"/>
      `,
    }),
  },
  {
    id: 'birthday-vip',
    label: 'День рождения / Пакет',
    keywords: /рожд|пакет|праздник|именин|vip|драйв|детск|выпускн|мега/i,
    url: createTacticalSvgDataUri({
      title: 'ПРАЗДНИК ПОД КЛЮЧ',
      subtitle: 'ДЕНЬ РОЖДЕНИЯ И ВЫПУСКНОЙ',
      accentPrimary: '#f97316',
      accentSecondary: '#fbbf24',
      iconSvg: `
        <polygon points="0,-52 15,-18 52,-12 25,14 32,50 0,32 -32,50 -25,14 -52,-12 -15,-18" fill="none" stroke="#f97316" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="0" cy="2" r="12" fill="#e4e4e7"/>
      `,
    }),
  },
  {
    id: 'gazebo-bbq',
    label: 'Беседка и Мангал',
    keywords: /беседк|мангал|пикник|банкет|стол|отдых|шашлык|баня|бассейн|дом/i,
    url: createTacticalSvgDataUri({
      title: 'БЕСЕДКА И ЗОНА ОТДЫХА',
      subtitle: 'КОМФОРТНЫЙ ПИКНИК С МАНГАЛОМ',
      accentPrimary: '#ea580c',
      accentSecondary: '#fb923c',
      iconSvg: `
        <polygon points="-55,-10 0,-52 55,-10" fill="none" stroke="#f97316" stroke-width="4" stroke-linejoin="round"/>
        <line x1="-40" y1="-10" x2="-40" y2="45" stroke="#e4e4e7" stroke-width="3.5"/>
        <line x1="40" y1="-10" x2="40" y2="45" stroke="#e4e4e7" stroke-width="3.5"/>
        <line x1="-52" y1="45" x2="52" y2="45" stroke="#f97316" stroke-width="3.5"/>
        <path d="M -12 32 C -12 12, 12 12, 12 32 Z" fill="#f97316"/>
      `,
    }),
  },
  {
    id: 'photo-media',
    label: 'Фото / Видео / VR',
    keywords: /фото|видео|съемк|фотограф|репортаж|vr|виртуальн|дым|гранат|тир/i,
    url: createTacticalSvgDataUri({
      title: 'ФОТО И СПЕЦЭФФЕКТЫ',
      subtitle: 'ЯРКИЕ КАДРЫ И ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ',
      accentPrimary: '#f97316',
      accentSecondary: '#a1a1aa',
      iconSvg: `
        <rect x="-48" y="-28" width="96" height="68" rx="12" fill="none" stroke="#e4e4e7" stroke-width="3.5"/>
        <path d="M -20 -28 L -12 -42 L 12 -42 L 20 -28" fill="none" stroke="#f97316" stroke-width="3.5"/>
        <circle cx="0" cy="6" r="20" fill="none" stroke="#f97316" stroke-width="3.5"/>
        <circle cx="0" cy="6" r="7" fill="#f97316"/>
      `,
    }),
  },
  {
    id: 'corporate-team',
    label: 'Корпоратив / Тимбилдинг',
    keywords: /корпорат|тимбилдинг|команд|компани|взросл|турнир/i,
    url: createTacticalSvgDataUri({
      title: 'КОМАНДНЫЙ ТИМБИЛДИНГ',
      subtitle: 'ТАКТИЧЕСКИЕ МИССИИ И ТУРНИРЫ',
      accentPrimary: '#f97316',
      accentSecondary: '#d4d4d8',
      iconSvg: `
        <path d="M -36 -38 L 36 -38 L 28 8 C 28 32 0 48 0 48 C 0 48 -28 32 -28 8 Z" fill="none" stroke="#f97316" stroke-width="3.5" stroke-linejoin="round"/>
        <polygon points="0,-22 6,-6 22,-6 9,4 14,20 0,10 -14,20 -9,4 -22,-6 -6,-6" fill="#e4e4e7"/>
      `,
    }),
  },
  {
    id: 'away-mobile',
    label: 'Выездная игра',
    keywords: /выезд|доставк|территор|школ|двор|парк|мобильн|укрыт/i,
    url: createTacticalSvgDataUri({
      title: 'ВЫЕЗДНОЙ ЛАЗЕРТАГ',
      subtitle: 'МОБИЛЬНЫЙ ПОЛИГОН НА ВАШЕЙ ПЛОЩАДКЕ',
      accentPrimary: '#ea580c',
      accentSecondary: '#f97316',
      iconSvg: `
        <path d="M 0 -52 C -26 -52 -44 -34 -44 -10 C -44 20 0 54 0 54 C 0 54 44 20 44 -10 C 44 -34 26 -52 0 -52 Z" fill="none" stroke="#f97316" stroke-width="3.5"/>
        <circle cx="0" cy="-10" r="15" fill="none" stroke="#e4e4e7" stroke-width="3.5"/>
      `,
    }),
  },
];

export const REEL_PRESET_COVERS: PresetImageOption[] = [
  {
    id: 'reel-cover-1',
    label: 'Обложка: Лазерный Бой',
    keywords: /бой|арен|общ/i,
    url: createTacticalSvgDataUri({
      title: 'ЛАЗЕРТАГ ДРАЙВ',
      subtitle: 'VK КЛИПЫ • ЖИВЫЕ ЭМОЦИИ',
      accentPrimary: '#f97316',
      accentSecondary: '#fb923c',
      aspect: '9:16',
      iconSvg: `
        <polygon points="-18,-36 32,0 -18,36" fill="#f97316"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#e4e4e7" stroke-width="3" stroke-dasharray="8 6"/>
      `,
    }),
  },
  {
    id: 'reel-cover-2',
    label: 'Обложка: День Рождения',
    keywords: /рожд|праздник|дет/i,
    url: createTacticalSvgDataUri({
      title: 'ДЕНЬ РОЖДЕНИЯ',
      subtitle: 'VK КЛИПЫ • ЭМОЦИИ ИМЕНИННИКА',
      accentPrimary: '#ea580c',
      accentSecondary: '#fbbf24',
      aspect: '9:16',
      iconSvg: `
        <polygon points="0,-52 15,-18 52,-12 25,14 32,50 0,32 -32,50 -25,14 -52,-12 -15,-18" fill="none" stroke="#f97316" stroke-width="4"/>
        <polygon points="-8,-14 16,2 -8,18" fill="#e4e4e7"/>
      `,
    }),
  },
  {
    id: 'reel-cover-3',
    label: 'Обложка: Спецмиссия',
    keywords: /атмосфер|квест|корпорат|отзыв/i,
    url: createTacticalSvgDataUri({
      title: 'СПЕЦМИССИЯ В ЛЕСУ',
      subtitle: 'VK КЛИПЫ • ТАКТИЧЕСКИЙ КВЕСТ',
      accentPrimary: '#f97316',
      accentSecondary: '#a1a1aa',
      aspect: '9:16',
      iconSvg: `
        <circle cx="0" cy="0" r="48" fill="none" stroke="#f97316" stroke-width="3.5"/>
        <line x1="-64" y1="0" x2="64" y2="0" stroke="#e4e4e7" stroke-width="2.5"/>
        <line x1="0" y1="-64" x2="0" y2="64" stroke="#e4e4e7" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="10" fill="#f97316"/>
      `,
    }),
  },
];

/**
 * Cleans and normalizes image URLs from Excel imports or manual input.
 */
export function normalizeImageUrl(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let trimmed = raw.trim();
  if (!trimmed) return '';

  // Data URLs or local assets are always valid
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('/assets/') || trimmed.startsWith('/src/')) {
    return trimmed;
  }

  // If Excel cell has multiple URLs separated by comma, semicolon, or whitespace/newlines, grab the first URL
  const urlMatch = trimmed.match(/https?:\/\/[^\s,;'"<>]+/i);
  if (urlMatch) {
    trimmed = urlMatch[0];
  }

  // Reject video page URLs accidentally pasted into image fields
  if (/vk\.com\/(clip|video|clips)|vkvideo\.ru|youtube\.com\/(watch|shorts)|youtu\.be|rutube\.ru/i.test(trimmed)) {
    return '';
  }

  // Replace old cyan-theme template Unsplash placeholders with the new Orange/Gray/Black tactical covers
  if (
    /images\.unsplash\.com\/photo-(1511512578047|1509198397868|1514525253161|1516035069371|1538481199705)/i.test(
      trimmed
    )
  ) {
    return '';
  }

  // Convert Google Drive sharing links to direct image render links
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }

  return trimmed;
}

/**
 * Picks a deterministic, context-matching fallback image for any service.
 */
export function getFallbackServiceImage(service: Partial<Service>, index = 0): string {
  const haystack = `${service.name || ''} ${service.category || ''} ${service.description || ''}`;
  for (const preset of SERVICE_PRESET_GALLERY) {
    if (preset.keywords.test(haystack)) {
      return preset.url;
    }
  }
  return SERVICE_PRESET_GALLERY[index % SERVICE_PRESET_GALLERY.length].url;
}

/**
 * Resolves the primary image to display for a service, falling back to thematic artwork if empty.
 */
export function resolveServiceImage(service: Partial<Service>, index = 0): string {
  const normalized = normalizeImageUrl(service.image);
  if (normalized) {
    return normalized;
  }
  return getFallbackServiceImage(service, index);
}

/**
 * Parses VK Clips, VK Video, Rutube, YouTube Shorts, or direct MP4 URLs into an embeddable player configuration.
 */
export interface ParsedVideoSource {
  type: 'vk' | 'rutube' | 'youtube' | 'mp4' | 'external';
  embedUrl: string;
  directUrl: string;
  label: string;
  clipKey?: string;
  autoThumbnail?: string;
}

export function parseVideoSource(rawInput?: string): ParsedVideoSource {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      type: 'mp4',
      embedUrl: '',
      directUrl: '',
      label: 'Видео',
    };
  }

  let input = rawInput.trim();

  // 1. If user pasted full <iframe ... src="..."> code from VK or elsewhere, extract src
  const iframeSrcMatch = input.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch) {
    input = iframeSrcMatch[1].replace(/&amp;/g, '&').trim();
  }

  if (input.startsWith('//')) {
    input = 'https:' + input;
  }

  // 2. Check if already a VK video_ext.php embed link
  if (/video_ext\.php/i.test(input)) {
    try {
      const urlObj = new URL(input.startsWith('http') ? input : `https://${input}`);
      const oid = urlObj.searchParams.get('oid');
      const id = urlObj.searchParams.get('id');
      const hash = urlObj.searchParams.get('hash');
      if (oid && id) {
        const embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1${hash ? `&hash=${hash}` : ''}`;
        return {
          type: 'vk',
          embedUrl,
          directUrl: `https://vk.com/clip${oid}_${id}`,
          label: 'VK Клип',
          clipKey: `${oid}_${id}`,
        };
      }
    } catch {
      // Fallback to raw input
    }
    return {
      type: 'vk',
      embedUrl: input,
      directUrl: input,
      label: 'VK Клип',
    };
  }

  // 3. Check standard VK Clip / VK Video URL formats:
  // Examples:
  // - https://vk.com/clip-21123456_456239017
  // - https://vkvideo.ru/clip-21123456_456239017
  // - https://vk.com/video-21123456_456239017
  // - https://vk.com/clips-21123456?z=clip-21123456_456239017
  const vkMatch = input.match(/(?:clip|video)(-?\d+)_(\d+)/i);
  if (vkMatch) {
    const oid = vkMatch[1];
    const id = vkMatch[2];
    const hashMatch = input.match(/[?&]hash=([a-zA-Z0-9_-]+)/i);
    const hashParam = hashMatch ? `&hash=${hashMatch[1]}` : '';
    return {
      type: 'vk',
      embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1${hashParam}`,
      directUrl: `https://vk.com/clip${oid}_${id}`,
      label: 'VK Клип',
      clipKey: `${oid}_${id}`,
    };
  }

  // 4. YouTube Shorts or standard YouTube URLs
  const ytMatch = input.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    const ytId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`,
      directUrl: `https://www.youtube.com/shorts/${ytId}`,
      label: 'YouTube Shorts',
      clipKey: ytId,
      autoThumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  // 5. Rutube Shorts or Video URLs
  const rutubeMatch = input.match(/rutube\.ru\/(?:shorts|video|play\/embed)\/([a-zA-Z0-9]+)/i);
  if (rutubeMatch) {
    const rtId = rutubeMatch[1];
    return {
      type: 'rutube',
      embedUrl: `https://rutube.ru/play/embed/${rtId}`,
      directUrl: input,
      label: 'Rutube Клип',
      clipKey: rtId,
    };
  }

  // 6. General VK link without specific clip ID (e.g., vk.com/clips/club...)
  if (/vk\.com|vkvideo\.ru/i.test(input)) {
    return {
      type: 'external',
      embedUrl: input,
      directUrl: input,
      label: 'ВКонтакте',
    };
  }

  // 7. Direct MP4 / WebM video stream
  return {
    type: 'mp4',
    embedUrl: input,
    directUrl: input,
    label: 'Видео HD',
  };
}

export function getFallbackReelCover(reel: Partial<Reel>, index = 0): string {
  const parsed = parseVideoSource(reel.videoUrl);
  if (parsed.autoThumbnail) return parsed.autoThumbnail;

  const haystack = `${reel.title || ''} ${reel.tag || ''}`;
  for (const preset of REEL_PRESET_COVERS) {
    if (preset.keywords.test(haystack)) {
      return preset.url;
    }
  }
  return REEL_PRESET_COVERS[index % REEL_PRESET_COVERS.length].url;
}

export function resolveReelThumbnail(reel: Partial<Reel>, index = 0): string {
  const rawThumb = reel.thumbnailUrl?.trim() || '';
  // Ignore old generic unsplash default if it was auto-assigned or if empty
  const isOldGenericDefault =
    !rawThumb ||
    rawThumb.includes('photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300');

  if (!isOldGenericDefault) {
    const normalized = normalizeImageUrl(rawThumb);
    if (normalized) return normalized;
  }

  return getFallbackReelCover(reel, index);
}

/**
 * Compresses an uploaded image file via HTML5 Canvas into a compact JPEG Data URL (~40-80KB)
 * suitable for storing directly in Firestore documents.
 */
export function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}
