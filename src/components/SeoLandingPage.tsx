import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  Target,
  ChevronDown,
  MessageCircle,
  Calendar,
  ArrowLeft,
  Clock,
  Users,
  Check,
  Sparkles,
} from 'lucide-react';
import { SeoPageData, SEO_PAGES, SITE_DOMAIN } from '../data/seoPages';
import { ContactInfo, Section } from '../types';
import { DEFAULT_ADVANTAGES } from '../data';

interface SeoLandingPageProps {
  page: SeoPageData;
  contacts: ContactInfo;
  sections: Section[];
  onBookPackage: (packageName?: string, price?: number, district?: string) => void;
  onNavigateHome: () => void;
  onNavigateSeoPage: (slug: string) => void;
}

export default function SeoLandingPage({
  page,
  contacts,
  sections,
  onBookPackage,
  onNavigateHome,
  onNavigateSeoPage,
}: SeoLandingPageProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const maxUrl = contacts.maxUrl?.trim() || 'https://clck.ru/3WWJke';
  const whatsappUrl = contacts.whatsappUrl?.trim() || 'https://clck.ru/3WsHUN';
  const siteBookingUrl = contacts.siteBookingUrl?.trim();
  const advantages =
    contacts.advantages && contacts.advantages.length > 0
      ? contacts.advantages
      : DEFAULT_ADVANTAGES;

  const matchingSection = sections.find((s) => s.id === page.sectionIdForPackages);
  const packages = matchingSection?.packages || [];
  const relatedPages = page.relatedSlugs
    .map((slug) => SEO_PAGES.find((p) => p.slug === slug))
    .filter((p): p is SeoPageData => Boolean(p));

  // Inject dynamic FAQPage & LocalBusiness JSON-LD for this SEO landing page
  useEffect(() => {
    const scriptId = 'seo-landing-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SportsActivityLocation',
          name: 'Лазер Квест — Лазертаг в Сочи и Адлере',
          url: `${SITE_DOMAIN}/${page.slug}/`,
          telephone: contacts.phone,
          email: contacts.email,
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
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Главная',
              item: `${SITE_DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: page.h1,
              item: `${SITE_DOMAIN}/${page.slug}/`,
            },
          ],
        },
      ],
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [page, contacts.phone, contacts.email]);

  return (
    <main className="pt-24 pb-20 bg-zinc-950 text-zinc-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-900 pb-16 pt-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-orange-500/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400 mb-6 flex-wrap">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 hover:text-orange-400 transition-colors cursor-pointer font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              На главную
            </button>
            <span className="text-zinc-700">/</span>
            <span className="text-orange-400 font-semibold">{page.badge}</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-950/50 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {page.badge}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl">
            {page.h1}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-3xl">
            {page.subtitle}
          </p>

          {/* 3 Booking CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={maxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-orange-500/50 hover:border-orange-400 text-white px-5 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg"
            >
              <span className="w-5 h-5 rounded bg-orange-500 text-zinc-950 font-black text-[11px] flex items-center justify-center shrink-0">
                M
              </span>
              Забронировать в Макс
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-orange-500/60 text-white px-5 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg"
            >
              <MessageCircle className="w-4 h-4 text-orange-500" />
              Забронировать в Вацап
            </a>

            {siteBookingUrl ? (
              <a
                href={siteBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl shadow-orange-950/50"
              >
                <Calendar className="w-4 h-4" />
                Забронировать на сайте
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onBookPackage(page.h1, undefined, page.district)}
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl shadow-orange-950/50 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Забронировать на сайте
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content & Local Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
              Особенности формата и локаций
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{page.intro}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {page.highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-zinc-950 border border-zinc-800/90 rounded-xl p-4"
                >
                  <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-zinc-200 leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5 h-fit">
            <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              Доступные локации ({page.district})
            </h3>
            <ul className="space-y-2.5">
              {page.locations.map((loc, idx) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-zinc-300 flex items-center gap-2.5 bg-zinc-950 border border-zinc-800/70 rounded-xl px-3.5 py-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span>{loc}</span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-zinc-800">
              <div className="text-xs text-zinc-400">Стоимость участия</div>
              <div className="text-2xl font-black text-orange-400 mt-1 tabular-nums">
                от {page.priceFrom.toLocaleString('ru-RU')} ₽
              </div>
              <button
                type="button"
                onClick={() => onBookPackage(page.h1, page.priceFrom, page.district)}
                className="mt-4 w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-colors cursor-pointer"
              >
                Рассчитать праздник
              </button>
            </div>
          </aside>
        </div>

        {/* Popular Scenarios */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mb-6 flex items-center gap-2.5">
            <Target className="w-6 h-6 text-orange-500" />
            Популярные сценарии игр
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {page.scenarios.map((sc, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-6 transition-colors"
              >
                <div className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-2">
                  Сценарий #{idx + 1}
                </div>
                <h3 className="text-base font-black text-white mb-2">{sc.name}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{sc.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Packages from matching section */}
        {packages.length > 0 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mb-6">
              Готовые пакеты «Под ключ»
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl p-6 flex flex-col justify-between border ${
                    pkg.isPopular
                      ? 'bg-zinc-900 border-orange-500/70 shadow-xl shadow-orange-950/30'
                      : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div>
                    {pkg.isPopular && (
                      <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">
                        ХИТ ВЫБОРА ★
                      </div>
                    )}
                    <h3 className="text-lg font-black text-white uppercase">{pkg.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-300 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        {pkg.duration}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-300 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        {pkg.playersCount}
                      </span>
                    </div>
                    <ul className="mt-5 space-y-2">
                      {pkg.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                          <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-5 border-t border-zinc-800">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-xs text-zinc-400">Стоимость:</span>
                      <span className="text-2xl font-black text-orange-400 tabular-nums">
                        {pkg.price.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBookPackage(pkg.name, pkg.price, page.district)}
                      className="w-full bg-zinc-950 hover:bg-orange-600 border border-zinc-700 hover:border-orange-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Забронировать пакет
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Club Advantages */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mb-6">
            Почему выбирают «Лазер Квест»
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {advantages.map((adv, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 font-semibold"
              >
                <span className="text-orange-500 shrink-0">✅</span>
                <span>{adv}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Accordion */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mb-6">
            Частые вопросы
          </h2>
          <div className="space-y-3">
            {page.faq.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                  >
                    <span className="text-sm font-bold text-white">{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-orange-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/70 pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Internal Cross-Links between SEO Pages for Search Crawlers */}
        {relatedPages.length > 0 && (
          <div className="pt-6 border-t border-zinc-900">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
              Смотрите также другие площадки и форматы
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {relatedPages.map((rel) => (
                <a
                  key={rel.slug}
                  href={`/${rel.slug}/`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSeoPage(rel.slug);
                  }}
                  className="block bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-xl p-4 transition-all"
                >
                  <div className="text-[10px] font-black text-orange-400 uppercase tracking-wider mb-1">
                    {rel.badge}
                  </div>
                  <div className="text-xs font-bold text-zinc-200 leading-snug">{rel.h1}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
