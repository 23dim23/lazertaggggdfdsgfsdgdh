import React, { useState } from 'react';
import { Clock, CheckCircle2, ChevronRight, ShoppingBag, Flame } from 'lucide-react';
import { Service } from '../types';
import { resolveServiceImage, getFallbackServiceImage } from '../lib/media';

interface ServicesCatalogueProps {
  services: Service[];
  onBookService: (serviceName: string, servicePrice?: number) => void;
}

export default function ServicesCatalogue({ services, onBookService }: ServicesCatalogueProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Все');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Dynamically extract unique categories
  const categories = ['Все', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

  const filteredServices = services.filter(s => {
    if (activeCategory === 'Все') return true;
    return s.category === activeCategory;
  });

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
              Выбирайте готовые пакеты приключений или комбинируйте дополнительные шоу-программы для вашего идеального праздника.
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
              const fallbackSrc = getFallbackServiceImage(service, idx);
              const imgSrc = failedImages[service.id]
                ? fallbackSrc
                : resolveServiceImage(service, idx);

              return (
                <div 
                  key={service.id}
                  className="group relative bg-zinc-900/60 border border-zinc-800 hover:border-orange-500/50 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:shadow-orange-950/20 transition-all duration-300"
                >
                  {/* Image Section with resilient fallback */}
                  <div className="relative h-52 overflow-hidden bg-zinc-950">
                    <img 
                      src={imgSrc} 
                      alt={service.name}
                      onError={() => {
                        if (!failedImages[service.id]) {
                          setFailedImages(prev => ({ ...prev, [service.id]: true }));
                        }
                      }}
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
                      <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                        {service.description}
                      </p>
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
                          onClick={() => onBookService(service.name, service.price)}
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
    </section>
  );
}
