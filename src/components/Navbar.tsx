import React, { useState } from 'react';
import { Menu, X, Calendar } from 'lucide-react';
import { Section } from '../types';
import { useTransparentLogo } from '../lib/media';

interface NavbarProps {
  sections: Section[];
  activeSectionId: string;
  onSectionChange: (id: string) => void;
  onOpenAdmin: () => void;
  onOpenBooking: () => void;
}

export default function Navbar({ 
  sections, 
  activeSectionId, 
  onSectionChange, 
  onOpenBooking 
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const logoSrc = useTransparentLogo();

  const activeSections = sections.filter(sec => sec.isActive);

  const handleNavClick = (id: string) => {
    onSectionChange(id);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16 sm:h-20">
          
          {/* Zone 1: Brand Logo & Single-Line Wordmark */}
          <button 
            type="button"
            className="flex items-center gap-3 cursor-pointer group whitespace-nowrap shrink-0 text-left focus:outline-none"
            onClick={() => handleNavClick('home')}
          >
            <img 
              src={logoSrc} 
              alt="Лазер Квест" 
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-base sm:text-lg font-black tracking-wider uppercase">
              <span className="text-orange-500">ЛАЗЕР</span>{' '}
              <span className="text-zinc-200 group-hover:text-white transition-colors">КВЕСТ</span>
            </span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {activeSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleNavClick(sec.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                  activeSectionId === sec.id
                    ? 'text-orange-400 bg-orange-950/40 border border-orange-500/40'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 border border-transparent'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Action Button */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenBooking}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-950/50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Забронировать
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none"
              aria-label="Открыть меню"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-2">
          {activeSections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleNavClick(sec.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSectionId === sec.id
                  ? 'text-orange-400 bg-orange-950/30 border border-orange-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {sec.title}
            </button>
          ))}

          <div className="pt-4 border-t border-zinc-900 flex flex-col gap-2">
            <button
              onClick={() => { setIsOpen(false); onOpenBooking(); }}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white text-center py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-orange-950/50"
            >
              <Calendar className="w-4 h-4" />
              Забронировать игру
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
