import React, { useState } from 'react';
import { Section, ContactInfo } from '../types';
import { 
  Clock, Users, Check, Flame, Calendar, Phone, MapPin, 
  ShieldCheck, HeartHandshake
} from 'lucide-react';
import { SERVICE_PRESET_GALLERY } from '../lib/media';

interface SectionViewerProps {
  section: Section;
  contacts: ContactInfo;
  onBookPackage: (packageName: string, price: number) => void;
  onOpenBooking: () => void;
}

export default function SectionViewer({ 
  section, 
  contacts, 
  onBookPackage, 
  onOpenBooking 
}: SectionViewerProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const getSectionCover = (id: string) => {
    if (id === 'birthdays') return SERVICE_PRESET_GALLERY[3].url;
    if (id === 'corporates') return SERVICE_PRESET_GALLERY[6].url;
    if (id === 'graduations') return SERVICE_PRESET_GALLERY[2].url;
    if (id === 'away-games') return SERVICE_PRESET_GALLERY[7].url;
    return SERVICE_PRESET_GALLERY[0].url;
  };
  
  if (section.id === 'contacts') {
    return (
      <div className="py-16 bg-zinc-950 border-t border-zinc-900" id="contacts-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column: Info & Details */}
            <div className="space-y-8">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-orange-400 bg-orange-950/40 border border-orange-500/30 px-3 py-1 rounded-lg">
                  Контакты клуба
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
                  ЖДЕМ ВАС НА <span className="text-orange-500">ТАКТИЧЕСКИХ ПОЛИГОНАХ</span>
                </h2>
                <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                  Мы работаем без выходных в Сочи, Адлере и Дагомысе, чтобы дарить вам яркие эмоции! Вы можете приехать к нам на полигон, заказать выездное мероприятие на свою площадку или забронировать время праздника по телефону.
                </p>
              </div>

              {/* Contacts cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
                  <div className="w-9 h-9 rounded-lg bg-orange-950/50 border border-orange-500/30 text-orange-400 flex items-center justify-center mb-3">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Телефон для брони</span>
                  <a href={`tel:${contacts.phone}`} className="block text-white font-extrabold text-base mt-1 hover:text-orange-400 transition-colors">
                    {contacts.phone}
                  </a>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-orange-400 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Часы работы</span>
                  <span className="block text-white font-extrabold text-sm mt-1">
                    {contacts.workingHours}
                  </span>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl sm:col-span-2">
                  <div className="w-9 h-9 rounded-lg bg-orange-950/50 border border-orange-500/30 text-orange-400 flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Адреса полигонов</span>
                  <span className="block text-white font-extrabold text-sm mt-1 leading-relaxed">
                    {contacts.address}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={onOpenBooking}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-orange-950/50 flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  Заказать обратный звонок
                </button>
              </div>
            </div>

            {/* Right Column: Yandex Interactive Map Widget */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[400px] sm:h-[450px] relative shadow-lg">
              <iframe
                src={contacts.yandexMapWidgetUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen={true}
                className="w-full h-full grayscale opacity-85 hover:grayscale-0 transition-all duration-300"
                title="Yandex Maps Location"
              />
              {/* Floating Map info tag */}
              <div className="absolute top-4 left-4 bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5 shadow">
                <MapPin className="w-3.5 h-3.5 text-orange-500 fill-current" />
                <span>Лазер Квест • Сочи и Адлер</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-zinc-950 border-t border-zinc-900" id={`section-${section.id}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 bg-orange-950/40 text-orange-400 border border-orange-500/30 px-3.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-4">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            Разделы сайта · {section.title}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-snug">
            {section.heroTitle}
          </h2>
          <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed">
            {section.heroSubtitle}
          </p>
        </div>

        {/* Section Detailed Description & Core details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16 pb-12 border-b border-zinc-900">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              Как мы создаем <span className="text-orange-500">лучшие приключения</span>
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {section.description}
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {section.contentMarkdown}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-orange-950/80 border border-orange-500/30 flex items-center justify-center text-orange-400 mt-0.5 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">100% Безопасность</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Легкие тагеры и безопасные ИК-лучи без боли</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-orange-400 mt-0.5 shrink-0">
                  <HeartHandshake className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Опытные ведущие</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Профессиональные маршалы и аниматоры</p>
                </div>
              </div>
            </div>
          </div>

          {/* Graphic Vibe banner */}
          <div className="relative h-[280px] sm:h-[350px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <img 
              src={imgFailed ? getSectionCover(section.id) : getSectionCover(section.id)} 
              alt={section.title}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
            
            {/* Visual float badge */}
            <div className="absolute bottom-5 left-5 bg-zinc-950/90 border border-zinc-800 px-4 py-2.5 rounded-xl">
              <span className="block text-[10px] font-black text-orange-400 uppercase tracking-widest">Полигоны клуба</span>
              <span className="block text-white text-xs font-black uppercase tracking-wider mt-0.5">Сочи • Адлер • Дагомыс</span>
            </div>
          </div>
        </div>

        {/* Packages Grid (Tariffs) */}
        {section.packages && section.packages.length > 0 && (
          <div>
            <h3 className="text-2xl font-black text-center text-white tracking-tight mb-10">
              СТОИМОСТЬ ПАКЕТОВ <span className="text-orange-500">«ПОД КЛЮЧ»</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {section.packages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`group relative rounded-2xl p-6 bg-zinc-900/60 border flex flex-col justify-between hover:shadow-xl hover:shadow-orange-950/20 transition-all duration-300 ${
                    pkg.isPopular 
                      ? 'border-orange-500/60 shadow-lg shadow-orange-950/15' 
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Popular Indicator Tag */}
                  {pkg.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-md">
                      Хит выбора ★
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="mb-6">
                      <h4 className="text-lg font-black text-white uppercase tracking-wide group-hover:text-orange-400 transition-colors">
                        {pkg.name}
                      </h4>
                      
                      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-orange-400" />
                          {pkg.duration}
                        </span>
                        <span className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                          <Users className="w-3.5 h-3.5 text-zinc-300" />
                          {pkg.playersCount}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 mb-8">
                      {pkg.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-snug">
                          <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-6 border-t border-zinc-800/80 mt-auto">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-xs text-zinc-400">Итоговая стоимость:</span>
                      <div className="text-right tabular-nums">
                        {pkg.oldPrice && (
                          <span className="block text-xs text-zinc-500 line-through">
                            {pkg.oldPrice.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                        <span className="text-2xl font-black text-orange-400">
                          {pkg.price.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onBookPackage(pkg.name, pkg.price)}
                      className={`w-full text-center py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        pkg.isPopular
                          ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-950/40'
                          : 'bg-zinc-950 hover:bg-orange-500 border border-zinc-700 hover:border-orange-500 text-white'
                      }`}
                    >
                      Забронировать пакет
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
