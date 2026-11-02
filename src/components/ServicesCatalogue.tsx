import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ChevronRight, ShoppingBag, Flame, X, FileText, ExternalLink } from 'lucide-react';
import { Service } from '../types';
import { resolveServiceImage, getFallbackServiceImage, getProxiedImageUrl } from '../lib/media';

interface ServicesCatalogueProps {
  services: Service[];
  onBookService: (serviceName: string, servicePrice?: number) => void;
}

/**
 * Converts plain-text URLs (https://..., vk.com/..., t.me/..., www....) and markdown links [text](url)
 * inside service descriptions into clickable <a> tags that open in a new tab.
 */
function renderDescriptionWithLinks(text: string): React.ReactNode {
  if (!text) return null;

  const linkRegex =
    /(\[[^\]]+\]\((?:https?:\/\/|www\.)[^\s)]+\)|(?:https?:\/\/|www\.)[^\s<>"]+|(?:vk\.com|vkvideo\.ru|t\.me|wa\.me|rutube\.ru|youtube\.com|youtu\.be|disk\.yandex\.(?:ru|com)|yadi\.sk)\/[^\s<>"]+)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const matchStart = match.index;
    let rawToken = match[0];

    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // Check if it's a markdown link [label](url)
    const mdMatch = rawToken.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (mdMatch) {
      const label = mdMatch[1];
      const rawHref = mdMatch[2].trim();
      const href = /^https?:\/\//i.test(rawHref) ? rawHref : `https://${rawHref}`;
      parts.push(
        <a
          key={`link-${matchStart}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-orange-400 hover:text-orange-300 underline underline-offset-2 font-semibold inline-flex items-center gap-1 break-all"
        >
          {label}
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
      lastIndex = matchStart + rawToken.length;
      continue;
    }

    // Strip trailing sentence punctuation (.,!?;:)) from raw URL
    let trailingPunct = '';
    const punctMatch = rawToken.match(/([.,!?;:)]+)$/);
    if (punctMatch) {
      trailingPunct = punctMatch[1];
      rawToken = rawToken.slice(0, -trailingPunct.length);
    }

    const href = /^https?:\/\//i.test(rawToken) ? rawToken : `https://${rawToken}`;

    parts.push(
      <a
        key={`link-${matchStart}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-orange-400 hover:text-orange-300 underline underline-offset-2 font-semibold inline-flex items-center gap-1 break-all"
      >
        {rawToken}
        <ExternalLink className="w-3 h-3 shrink-0 inline" />
      </a>
    );

    if (trailingPunct) {
      parts.push(trailingPunct);
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function ServicesCatalogue({ services, onBookService }: ServicesCatalogueProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Все');
  // 0 = direct, 1 = proxied via wsrv.nl, 2 = fallback preset
  const [imageStage, setImageStage] = useState<Record<string, number>>({});
  const [selectedService, setSelectedService] = useState<{ service: Service; idx: number } | null>(null);

  useEffect(() => {
    if (!selectedService) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedService(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedService]);

  // Dynamically extract unique categories
  const categories = ['Все', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

  const filteredServices = services.filter(s => {
    if (activeCategory === 'Все') return true;
    return s.category === activeCategory;
  });

  const getServiceImgSrc = (service: Service, idx: number) => {
    const primarySrc = resolveServiceImage(service, idx);
    const proxiedSrc = getProxiedImageUrl(primarySrc, 800);
    const fallbackSrc = getFallbackServiceImage(service, idx);
    const stage = imageStage[service.id] || 0;

    const imgSrc =
      stage === 0
        ? primarySrc
        : stage === 1 && proxiedSrc
        ? proxiedSrc
        : fallbackSrc;

    const handleImageError = () => {
      setImageStage(prev => {
        const current = prev[service.id] || 0;
        if (current === 0 && proxiedSrc) return { ...prev, [service.id]: 1 };
        if (current < 2) return { ...prev, [service.id]: 2 };
        return prev;
      });
    };

    return { imgSrc, handleImageError };
  };

  return (
    <section className="py-16 bg-zinc-950 border-t border-zinc-900" id="services-catalogue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-orange-950/40 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">
              <ShoppingBag className="w-3.5 h-3.5" />
              Каталог цен и развлечений
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              НАШИ УСЛУГИ И <span className="text-orange-500">ПРАЙС-ЛИСТ</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg text-zinc-400 max-w-2xl">
              Выбирайте готовые пакеты приключений или комбинируйте дополнительные шоу-программы для вашего идеального праздника. Нажмите на любую услугу, чтобы прочитать полное описание.
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl font-medium">
              Актуальный прайс-лист клуба • Сочи и Адлер
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer whitespace-nowrap shrink-0 ${
                activeCategory === category
                  ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-950/40'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500 text-sm">В этой категории услуг пока нет.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service, idx) => {
              const { imgSrc, handleImageError } = getServiceImgSrc(service, idx);

              return (
                <div 
                  key={service.id}
                  onClick={() => setSelectedService({ service, idx })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedService({ service, idx });
                    }
                  }}
                  className="group relative bg-zinc-900/60 border border-zinc-800 hover:border-orange-500/50 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-orange-950/20 transition-all duration-300 cursor-pointer text-left"
                >
                  {/* Image Section with resilient fallback */}
                  <div className="relative h-52 overflow-hidden bg-zinc-950">
                    <img 
                      src={imgSrc} 
                      alt={service.name}
                      onError={handleImageError}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent" />
                    
                    {/* Popular badge */}
                    {service.isPopular && (
                      <div className="absolute top-3.5 left-3.5 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        Хит продаж
                      </div>
                    )}

                    {/* Category label */}
                    <div className="absolute bottom-3.5 left-3.5 bg-zinc-950/90 border border-zinc-700/80 px-2.5 py-1 rounded-md text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                      {service.category}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-white group-hover:text-orange-400 transition-colors leading-snug">
                        {service.name}
                      </h3>
                      {service.description && (
                        <div className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                          {renderDescriptionWithLinks(service.description)}
                        </div>
                      )}
                      <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:text-orange-300 transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                        Подробнее об услуге
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800/80">
                      {/* Meta info */}
                      <div className="flex items-center flex-wrap gap-3 text-xs text-zinc-400 mb-4">
                        {service.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            {service.duration}
                          </span>
                        )}
                        {service.availability && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
                            {service.availability}
                          </span>
                        )}
                      </div>

                      {/* Price and Action */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          {service.oldPrice && (
                            <span className="block text-xs text-zinc-500 line-through tabular-nums">
                              {Number(service.oldPrice).toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                          <span className="text-xl font-black text-orange-400 tabular-nums">
                            {Number(service.price || 0).toLocaleString('ru-RU')} ₽
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookService(service.name, service.price);
                          }}
                          className="bg-zinc-950 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/40 hover:border-orange-500 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Заказать
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Service Description Modal */}
      {selectedService && (() => {
        const { service, idx } = selectedService;
        const { imgSrc, handleImageError } = getServiceImgSrc(service, idx);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedService(null)}
          >
            <div
              className="relative bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header Image */}
              <div className="relative h-56 sm:h-72 bg-zinc-950 shrink-0 overflow-hidden">
                <img
                  src={imgSrc}
                  alt={service.name}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-950/85 hover:bg-orange-500 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-orange-500 flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                  {service.isPopular && (
                    <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      Хит продаж
                    </div>
                  )}
                  {service.category && (
                    <div className="bg-zinc-950/90 border border-zinc-700/80 px-3 py-1 rounded-lg text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      {service.category}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Body with Full Description */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {service.name}
                  </h3>

                  {/* Duration & Availability badges */}
                  {(service.duration || service.availability) && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-300">
                      {service.duration && (
                        <span className="inline-flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
                          <Clock className="w-4 h-4 text-orange-400" />
                          {service.duration}
                        </span>
                      )}
                      {service.availability && (
                        <span className="inline-flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-orange-400" />
                          {service.availability}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Full Un-truncated Description */}
                <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-4 sm:p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Полное описание услуги
                  </div>
                  <div className="text-sm sm:text-base text-zinc-200 whitespace-pre-line leading-relaxed">
                    {service.description
                      ? renderDescriptionWithLinks(service.description)
                      : 'Подробное описание программы уточняйте у администратора клуба.'}
                  </div>
                </div>
              </div>

              {/* Modal Footer with Price & Order Button */}
              <div className="p-5 sm:px-8 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <span className="block text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    Стоимость услуги
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-orange-400 tabular-nums">
                      {Number(service.price || 0).toLocaleString('ru-RU')} ₽
                    </span>
                    {service.oldPrice && (
                      <span className="text-sm text-zinc-500 line-through tabular-nums">
                        {Number(service.oldPrice).toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Закрыть
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetService = service;
                      setSelectedService(null);
                      onBookService(targetService.name, targetService.price);
                    }}
                    className="flex-1 sm:flex-initial bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-950/50 transition-all cursor-pointer"
                  >
                    Заказать услугу
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}

