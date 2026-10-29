import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, Share2, Flame, X, ChevronRight, MessageCircle, ExternalLink, Video } from 'lucide-react';
import { Reel } from '../types';
import { parseVideoSource, resolveReelThumbnail, getFallbackReelCover, useTransparentLogo } from '../lib/media';

interface ReelsWidgetProps {
  reels: Reel[];
}

export default function ReelsWidget({ reels }: ReelsWidgetProps) {
  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [activeReelIndex, setActiveReelIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [likedReels, setLikedReels] = useState<{ [id: string]: boolean }>({});
  const [failedThumbs, setFailedThumbs] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [id: string]: { author: string; text: string }[] }>({
    'reel-1': [
      { author: 'Светлана К.', text: 'Праздновали у вас на прошлой неделе, сын просто в восторге! 🔥' },
      { author: 'Игорь И.', text: 'Крутые сценарии! Обязательно придем еще.' }
    ],
    'reel-2': [
      { author: 'Юлия Т.', text: 'Для корпоратива действительно классная разрядка 👍' },
      { author: 'Павел С.', text: 'Битва отделов — это было легендарно!' }
    ],
    'reel-3': [
      { author: 'Анна Д.', text: 'Полигон в лесу супер! Спецэффекты и дым огонь!' }
    ]
  });
  const [newComment, setNewComment] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logoSrc = useTransparentLogo();

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

  const toggleLike = (reelId: string) => {
    setLikedReels(prev => ({
      ...prev,
      [reelId]: !prev[reelId]
    }));
  };

  const handleAddComment = (reelId: string) => {
    if (!newComment.trim()) return;
    setComments(prev => ({
      ...prev,
      [reelId]: [...(prev[reelId] || []), { author: 'Гость клуба', text: newComment }]
    }));
    setNewComment('');
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
            const fallbackCover = getFallbackReelCover(reel, idx);
            const coverSrc = failedThumbs[reel.id]
              ? fallbackCover
              : resolveReelThumbnail(reel, idx);
            const isAutoCover = coverSrc.startsWith('data:image/svg+xml');

            return (
              <div 
                key={reel.id}
                className="group relative h-[430px] rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 bg-zinc-900 hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-950/30 transition-all duration-300"
                onClick={() => handleOpenReel(reel, idx)}
              >
                {/* Image Preview with resilient fallback */}
                <img 
                  src={coverSrc} 
                  alt={reel.title}
                  onError={() => {
                    if (!failedThumbs[reel.id]) {
                      setFailedThumbs(prev => ({ ...prev, [reel.id]: true }));
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* If auto-generated tactical cover, also show club shield emblem */}
                {isAutoCover && (
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

                {/* Top Right: Heart count and play counter */}
                <div className="absolute top-4 right-4 flex items-center gap-2.5 text-white text-xs font-bold bg-zinc-950/75 border border-zinc-800 backdrop-blur-md px-2.5 py-1 rounded-lg tabular-nums">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                    {(Number(reel.likes) || 0) + (likedReels[reel.id] ? 1 : 0)}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>{reel.plays || '1.2K'}</span>
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
                  <div className="mt-2 flex items-center justify-between text-xs text-orange-400 font-bold group-hover:text-orange-300 transition-colors">
                    <span className="flex items-center">
                      Смотреть {parsed.label} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px] bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                      {reel.duration || '0:15'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Reels / VK Clips Modal Player */}
      {activeReel && activeParsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
          <div className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row h-[88vh] max-h-[740px] shadow-2xl">
            {/* Close Button */}
            <button 
              onClick={handleCloseReel}
              className="absolute top-3.5 right-3.5 z-50 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-orange-600 border border-zinc-700 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="Закрыть плеер"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Vertical Video / VK Clip Embed Player */}
            <div className="relative flex-1 bg-black flex flex-col items-center justify-center h-[58%] md:h-full overflow-hidden">
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
                  {/* Direct link bar in case user prefers native VK app or clip has strict embed settings */}
                  <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400 font-semibold truncate">
                      {activeParsed.label}: {activeReel.title}
                    </span>
                    <a
                      href={activeParsed.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Открыть в {activeParsed.type === 'vk' ? 'VK' : 'плеере'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
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
                  <p className="text-xs text-zinc-400 mb-5">
                    Этот видеоролик размещен напрямую на странице сообщества ВКонтакте.
                  </p>
                  <a
                    href={activeParsed.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg"
                  >
                    <span>Смотреть клип ВКонтакте</span>
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
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                  {/* Controls inside MP4 video */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-orange-600 border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
                      </button>
                      <button 
                        onClick={toggleMute}
                        className="w-10 h-10 rounded-full bg-black/70 hover:bg-orange-600 border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-orange-400" />}
                      </button>
                    </div>

                    <div className="text-xs bg-black/70 px-2.5 py-1.5 rounded-md font-mono border border-zinc-800">
                      {activeReel.duration}
                    </div>
                  </div>

                  {/* Top badge */}
                  <div className="absolute top-4 left-4 z-10 bg-zinc-950/85 border border-orange-500/40 px-3 py-1 rounded-lg text-xs font-extrabold text-orange-400">
                    ЛАЗЕР КВЕСТ • СОЧИ
                  </div>
                </>
              )}
            </div>

            {/* Right Side: Comments & Interaction */}
            <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col justify-between bg-zinc-950 h-[42%] md:h-full">
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center gap-3">
                <img src={logoSrc} alt="Лазер Квест" className="w-10 h-10 object-contain shrink-0" />
                <div className="min-w-0 pr-10">
                  <h4 className="text-sm font-extrabold text-white truncate">Лазер Квест Сочи</h4>
                  <p className="text-xs text-zinc-400 truncate">{activeReel.title}</p>
                </div>
              </div>

              {/* Interactive buttons */}
              <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-900 flex justify-around items-center">
                <button 
                  onClick={() => toggleLike(activeReel.id)}
                  className="flex flex-col items-center gap-1 group/btn cursor-pointer"
                >
                  <Heart className={`w-6 h-6 transition-transform group-hover/btn:scale-110 ${likedReels[activeReel.id] ? 'text-orange-500 fill-orange-500' : 'text-zinc-400'}`} />
                  <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                    {(Number(activeReel.likes) || 0) + (likedReels[activeReel.id] ? 1 : 0)}
                  </span>
                </button>

                <div className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-6 h-6 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{comments[activeReel.id]?.length || 0}</span>
                </div>

                <button 
                  onClick={() => {
                    navigator.clipboard?.writeText(activeParsed.directUrl || window.location.href);
                    setCopiedId(activeReel.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="flex flex-col items-center gap-1 group/btn cursor-pointer"
                >
                  <Share2 className="w-6 h-6 text-zinc-400 group-hover/btn:text-orange-400 transition-colors" />
                  <span className="text-[10px] font-bold text-zinc-400">
                    {copiedId === activeReel.id ? 'Скопировано!' : 'Поделиться'}
                  </span>
                </button>
              </div>

              {/* Comments Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Комментарии игроков</div>
                {(comments[activeReel.id] || []).length === 0 ? (
                  <p className="text-xs text-zinc-500">Пока нет комментариев. Напишите первый!</p>
                ) : (
                  (comments[activeReel.id] || []).map((c, i) => (
                    <div key={i} className="text-xs bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800">
                      <div className="font-bold text-orange-400 mb-1">{c.author}</div>
                      <div className="text-zinc-300 leading-relaxed">{c.text}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-900/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Написать комментарий..."
                    className="flex-1 bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(activeReel.id);
                    }}
                  />
                  <button 
                    onClick={() => handleAddComment(activeReel.id)}
                    className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
