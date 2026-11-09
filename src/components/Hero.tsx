import React from 'react';
import { Flame, ChevronDown, Crosshair, CheckCircle2, MessageCircle } from 'lucide-react';
import { ContactInfo } from '../types';
import { DEFAULT_ADVANTAGES } from '../data';
import { useTransparentLogo } from '../lib/media';

interface HeroProps {
  onExplore: () => void;
  onOpenBooking: () => void;
  heroTitle: string;
  heroSubtitle: string;
  promoBadge?: string;
  contacts?: ContactInfo;
}

export default function Hero({ 
  onExplore, 
  onOpenBooking, 
  heroTitle,
  heroSubtitle,
  promoBadge,
  contacts
}: HeroProps) {
  const logoSrc = useTransparentLogo();

  const maxUrl = contacts?.maxUrl?.trim() || 'https://clck.ru/3WWJke';
  const whatsappUrl = contacts?.whatsappUrl?.trim() || 'https://clck.ru/3WsHUN';
  const siteBookingUrl = contacts?.siteBookingUrl?.trim() || '';

  const advantagesList =
    contacts?.advantages && contacts.advantages.length > 0
      ? contacts.advantages
      : DEFAULT_ADVANTAGES;

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center bg-zinc-950 overflow-hidden py-14 sm:py-20 border-b border-zinc-900">
      
      {/* Tactical Grid & Radial Orange/Steel Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_45%,#000_70%,transparent_100%)] opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[340px] bg-orange-600/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Tactical Laser Beams in Orange & Steel Gray */}
      <div className="absolute top-[18%] left-[-10%] w-[45%] h-[2px] bg-orange-500/40 blur-[2px] rotate-12 transform" />
      <div className="absolute bottom-[25%] right-[-15%] w-[50%] h-[2px] bg-orange-600/35 blur-[2px] -rotate-12 transform" />
      <div className="absolute top-[48%] left-[25%] w-[35%] h-[1px] bg-zinc-400/25 blur-[1px] -rotate-45 transform" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 flex flex-col items-center">
        
        {/* Dynamic Promo Badge */}
        {promoBadge && (
          <div className="inline-flex items-center gap-2 bg-zinc-900/90 border border-orange-500/40 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-orange-400 mb-6 shadow-lg shadow-orange-950/30">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500/30 shrink-0" />
            <span>{promoBadge}</span>
          </div>
        )}

        {/* Official Tactical Shield Emblem */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full scale-90 pointer-events-none" />
          <img 
            src={logoSrc} 
            alt="Лазер Квест — Лазерная перестрелка на ваш праздник" 
            className="relative w-36 h-36 sm:w-44 sm:h-44 object-contain mx-auto drop-shadow-[0_12px_24px_rgba(249,115,22,0.25)]"
          />
        </div>

        {/* Hero Title with Orange & Metallic Gray Tactical Hierarchy */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-5xl [text-wrap:balance]">
          {heroTitle.split(' ').map((word, i) => (
            <span 
              key={i} 
              className={
                /лазертаг|квест|лазер/i.test(word) 
                  ? "text-orange-500 " 
                  : /сочи|адлер/i.test(word)
                  ? "text-zinc-300 "
                  : ""
              }
            >
              {word}{' '}
            </span>
          ))}
        </h1>

        {/* Description Subtitle */}
        <p className="mt-5 text-base sm:text-lg lg:text-xl text-zinc-400 max-w-3xl leading-relaxed">
          {heroSubtitle}
        </p>

        {/* 3 Action Booking Buttons (Max, WhatsApp, Site) */}
        <div className="mt-9 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3.5 w-full max-w-md sm:max-w-4xl">
          {/* 1. Забронировать в Макс */}
          <a
            href={maxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 hover:bg-zinc-800 text-white border border-orange-500/50 hover:border-orange-500 text-xs sm:text-sm font-black uppercase tracking-wider px-6 py-4 rounded-xl transition-all shadow-lg shadow-black/40 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-md bg-orange-500 text-zinc-950 font-black text-[11px] flex items-center justify-center shrink-0">
              M
            </span>
            <span>Забронировать в Макс</span>
          </a>

          {/* 2. Забронировать в Вацап */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 hover:bg-zinc-800 text-white border border-orange-500/50 hover:border-orange-500 text-xs sm:text-sm font-black uppercase tracking-wider px-6 py-4 rounded-xl transition-all shadow-lg shadow-black/40 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <span>Забронировать в Вацап</span>
          </a>

          {/* 3. Забронировать на сайте */}
          {siteBookingUrl ? (
            <a
              href={siteBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider px-7 py-4 rounded-xl transition-all shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Crosshair className="w-5 h-5 shrink-0" />
              <span>Забронировать на сайте</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onOpenBooking}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider px-7 py-4 rounded-xl transition-all shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Crosshair className="w-5 h-5 shrink-0" />
              <span>Забронировать на сайте</span>
            </button>
          )}
        </div>

        {/* Editable Advantages Section */}
        {advantagesList.length > 0 && (
          <div className="mt-14 w-full max-w-5xl bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 text-left shadow-xl">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-6">
              <div className="w-2 h-6 bg-orange-500 rounded-full" />
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                Наши <span className="text-orange-500">преимущества</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {advantagesList.map((adv, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-zinc-950/80 border border-zinc-800/90 hover:border-orange-500/40 rounded-xl p-3.5 sm:p-4 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-100 leading-snug">
                    {adv.replace(/^✅\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Scroll Action */}
        <button 
          type="button"
          onClick={onExplore}
          className="mt-12 text-zinc-400 hover:text-orange-400 cursor-pointer transition-colors flex flex-col items-center gap-1 text-xs font-bold uppercase tracking-widest"
        >
          <span>К услугам и прайс-листу</span>
          <ChevronDown className="w-4 h-4 text-orange-500" />
        </button>

      </div>
    </div>
  );
}

