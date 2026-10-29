import React from 'react';
import { Play, Flame, ChevronDown, Crosshair, Gift, Users } from 'lucide-react';
import { useTransparentLogo } from '../lib/media';

interface HeroProps {
  onExplore: () => void;
  onOpenBooking: () => void;
  onOpenAtmosphere: () => void;
  heroTitle: string;
  heroSubtitle: string;
  promoBadge?: string;
}

export default function Hero({ 
  onExplore, 
  onOpenBooking, 
  onOpenAtmosphere,
  heroTitle,
  heroSubtitle,
  promoBadge
}: HeroProps) {
  const logoSrc = useTransparentLogo();

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

        {/* Action Button Cluster */}
        <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full max-w-md sm:max-w-none">
          <button
            onClick={onOpenBooking}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-black uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Crosshair className="w-5 h-5" />
            Рассчитать праздник
          </button>

          <button
            onClick={onOpenAtmosphere}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 hover:border-orange-500/50 text-sm font-black uppercase tracking-wider px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-orange-400 fill-current ml-0.5" />
            </div>
            Смотреть VK Клипы
          </button>
        </div>

        {/* Tactical Feature Cards (Gray / Orange / Black) */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-zinc-900/70 border border-zinc-800 hover:border-orange-500/40 p-6 rounded-2xl flex flex-col items-center text-center transition-colors">
            <div className="w-11 h-11 bg-orange-950/50 border border-orange-500/30 text-orange-400 rounded-xl flex items-center justify-center mb-4">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wider">Праздник «Под Ключ»</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Квесты, беседки с мангалом, шоу-программы и подарки. Всё организовано за вас.
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 hover:border-orange-500/40 p-6 rounded-2xl flex flex-col items-center text-center transition-colors">
            <div className="w-11 h-11 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wider">Игры от 6 до 60 лет</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Индивидуальные сценарии по возрасту: от детских миссий до взрослых спец-операций.
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 hover:border-orange-500/40 p-6 rounded-2xl flex flex-col items-center text-center transition-colors">
            <div className="w-11 h-11 bg-orange-950/50 border border-orange-500/30 text-orange-400 rounded-xl flex items-center justify-center mb-4">
              <Crosshair className="w-5 h-5" />
            </div>
            <h3 className="text-white text-sm font-extrabold uppercase tracking-wider">Новое снаряжение</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Легкие беспроводные тагеры, сенсорная экипировка и электронные базы захвата.
            </p>
          </div>
        </div>

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
