import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Flame, X, ChevronRight, ExternalLink, Video } from 'lucide-react';
import { Reel } from '../types';
import {
  parseVideoSource,
  resolveReelThumbnail,
  getFallbackReelCover,
  getProxiedImageUrl,
  extractVideoThumbnail,
  isGeneratedPresetCover,
  useTransparentLogo
} from '../lib/media';
import { saveReel } from '../lib/db';

interface ReelsWidgetProps {
  reels: Reel[];
}

export default function ReelsWidget({ reels }: ReelsWidgetProps) {
  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [activeReelIndex, setActiveReelIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  // 0 = direct, 1 = proxied via wsrv.nl, 2 = fallback cover
  const [thumbStage, setThumbStage] = useState<{ [id: string]: number }>({});
  const [autoThumbs, setAutoThumbs] = useState<{ [id: string]: string }>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logoSrc = useTransparentLogo();

  // Close player on Escape key
  useEffect(() => {
    if (!activeReel) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveReel(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeReel]);

  // Automatically extract first-frame previews for any clip that doesn't have a custom photo
  useEffect(() => {
    let cancelled = false;
    reels.forEach((reel) => {
      if (!reel.videoUrl) return;
      if (!isGeneratedPresetCover(reel.thumbnailUrl) || autoThumbs[reel.id]) return;

      extractVideoThumbnail(reel.videoUrl).then((extracted) => {
        if (cancelled || !extracted) return;
        setAutoThumbs((prev) => ({ ...prev, [reel.id]: extracted }));
        setThumbStage((prev) => ({ ...prev, [reel.id]: 0 }));
        // Save the extracted frame to storage so subsequent visits have it immediately
        saveReel({ ...reel, thumbnailUrl: extracted }).catch(() => {});
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reels]);

  const handleOpenReel = (reel: Reel, idx: number) => {
    setActiveReel(reel);
    setActiveReelIndex(idx);
    setIsPlaying(true);
    setIsMuted(false);
  };

  const handleCloseReel = () => {
    setActiveReel(null);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const activeParsed = activeReel ? parseVideoSource(activeReel.videoUrl) : null;

  return (
    <section className="py-14 bg-zinc-950 border-t border-b border-zinc-900 overflow-hidden" id="atmosphere-vibe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-400 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              ЖИВЫЕ ЭМОЦИИ ПРАЗДНИКА
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              АТМОСФЕРА ДРАЙВА В <span className="text-orange-500">VK КЛИПАХ И REELS</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg text-zinc-400 max-w-2xl">
              Посмотрите, как проходят наши тактические квесты и лазертаг-битвы. Настоящие эмоции, командный драйв и неподдельный азарт!
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl uppercase tracking-wider font-bold">
              Нажмите на клип для просмотра 🔊
            </span>
          </div>
        </div>

        {/* Reels grid preview styled like vertical stories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reels.map((reel, idx) => {
            const parsed = parseVideoSource(reel.videoUrl);
            const effectiveReel: Reel = autoThumbs[reel.id]
              ? { ...reel, thumbnailUrl: autoThumbs[reel.id] }
              : reel;
            const primaryCover = resolveReelThumbnail(effectiveReel, idx);
            const proxiedCover = getProxiedImageUrl(primaryCover, 600);
            const fallbackCover = getFallbackReelCover(effectiveReel, idx);
            const stage = thumbStage[reel.id] || 0;

            const coverSrc =
              stage === 0
                ? primaryCover
                : stage === 1 && proxiedCover
                ? proxiedCover
                : fallbackCover;

            const isAutoCover = coverSrc.startsWith('data:image/svg+xml');
            const showLiveMp4FirstFrame =
              parsed.type === 'mp4' && Boolean(parsed.embedUrl) && isAutoCover;

            return (
              <div 
                key={reel.id}
                className="group relative h-[430px] rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 bg-zinc-900 hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-950/30 transition-all duration-300"
                onClick={() => handleOpenReel(effectiveReel, idx)}
              >
                {/* Image Preview with resilient fallback */}
                <img 
                  src={coverSrc} 
                  alt={reel.title}
                  onError={() => {
                    setThumbStage(prev => {
                      const current = prev[reel.id] || 0;
                      if (current === 0 && proxiedCover) return { ...prev, [reel.id]: 1 };
                      if (current < 2) return { ...prev, [reel.id]: 2 };
                      return prev;
                    });
                  }}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* If it's a direct MP4/WebM video without a captured dataUrl cover, render the live video seeked to 0.5s as the first-frame preview */}
                {showLiveMp4FirstFrame && (
                  <video
                    src={parsed.embedUrl.includes('#') ? parsed.embedUrl : `${parsed.embedUrl}#t=0.5`}
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      try {
                        if (e.currentTarget.currentTime < 0.2) {
                          e.currentTarget.currentTime = 0.5;
                        }
                      } catch {
                        // Ignore seek error
                      }
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                  />
                )}

                {/* If auto-generated tactical cover and not live video, also show club shield emblem */}
                {isAutoCover && !showLiveMp4FirstFrame && (
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none opacity-90 transition-transform duration-300 group-hover:scale-105">
                    <img src={logoSrc} alt="" className="w-24 h-24 object-contain drop-shadow-lg" />
                  </div>
                )}

                {/* Contrast scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-zinc-950/25 group-hover:via-zinc-950/15 transition-colors duration-300" />

                {/* Bottom orange accent bar */}
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                {/* Top Left: Tag & Platform Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <span className="bg-zinc-950/85 backdrop-blur-md text-orange-400 border border-orange-500/40 px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-wide">
                    {reel.tag || 'Клип'}
                  </span>
                  {parsed.type === 'vk' && (
                    <span className="bg-orange-600 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow">
                      VK КЛИП
                    </span>
                  )}
                </div>

                {/* Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-orange-600/85 group-hover:bg-orange-500 border-2 border-white/80 flex items-center justify-center backdrop-blur-sm transition-all duration-200 transform group-hover:scale-110 shadow-xl shadow-black/60">
                    <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Title & CTA at bottom */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white text-base font-extrabold line-clamp-2 leading-snug drop-shadow-md">
                    {reel.title}
                  </h3>
                  <div className="mt-2 flex items-center text-xs text-orange-400 font-bold group-hover:text-orange-300 transition-colors">
                    <span className="flex items-center">
                      Смотреть {parsed.label} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clean Video Player Modal (without likes, views, comments, or share sidebar) */}
      {activeReel && activeParsed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4"
          onClick={handleCloseReel}
        >
          <div
            className="relative w-full max-w-md bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col h-[85vh] max-h-[760px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean Top Bar with Title & Close Button */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={logoSrc} alt="" className="w-7 h-7 object-contain shrink-0" />
                <h4 className="text-sm font-extrabold text-white truncate">
                  {activeReel.title}
                </h4>
              </div>
              <button 
                type="button"
                onClick={handleCloseReel}
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-orange-600 border border-zinc-700 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                aria-label="Закрыть плеер"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Area */}
            <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden">
              {activeParsed.type === 'vk' || activeParsed.type === 'youtube' || activeParsed.type === 'rutube' ? (
                <div className="relative w-full h-full flex flex-col bg-black">
                  <iframe
                    key={activeParsed.embedUrl}
                    src={activeParsed.embedUrl}
                    title={activeReel.title}
                    className="w-full flex-1 border-0"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;"
                    allowFullScreen
                  />
                </div>
              ) : activeParsed.type === 'external' ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full max-w-sm">
                  <img 
                    src={resolveReelThumbnail(activeReel, activeReelIndex)} 
                    alt={activeReel.title}
                    className="w-36 h-48 object-cover rounded-xl border border-zinc-700 mb-5 shadow-lg"
                  />
                  <Video className="w-10 h-10 text-orange-500 mb-3" />
                  <h4 className="text-base font-black text-white mb-2">{activeReel.title}</h4>
                  <a
                    href={activeParsed.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                  >
                    <span>Открыть видео</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={activeParsed.embedUrl}
                    poster={resolveReelThumbnail(activeReel, activeReelIndex)}
                    className="w-full h-full object-cover"
                    autoPlay={isPlaying}
                    loop
                    muted={isMuted}
                    playsInline
                    onClick={togglePlay}
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                  {/* Minimal Player Controls for MP4 video */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-start text-white z-10">
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-orange-600 border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
                      </button>
                      <button 
                        type="button"
                        onClick={toggleMute}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-orange-600 border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-orange-400" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

