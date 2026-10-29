import React, { useState } from 'react';
import { Star, MapPin, Globe, Plus, MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react';
import { Review } from '../types';

interface ReviewsBlockProps {
  reviews: Review[];
  onAddReview: (review: Review) => void;
}

export default function ReviewsBlock({ reviews, onAddReview }: ReviewsBlockProps) {
  const [filter, setFilter] = useState<'all' | 'yandex' | 'vk' | 'manual'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [source, setSource] = useState<'yandex' | 'vk' | 'manual'>('manual');
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const filteredReviews = reviews.filter(r => filter === 'all' || r.source === filter);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;

    const newReview: Review = {
      id: `rev-custom-${Date.now()}`,
      author,
      date: new Date().toLocaleDateString('ru-RU'),
      rating,
      text,
      source,
    };

    onAddReview(newReview);
    
    // Reset Form
    setAuthor('');
    setRating(5);
    setText('');
    setSource('manual');
    setShowAddForm(false);
  };

  return (
    <section className="py-16 bg-zinc-950 border-t border-zinc-900" id="reviews-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-orange-950/40 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Проверенные отзывы клиентов
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ОТЗЫВЫ О НАШЕМ <span className="text-orange-500">КВЕСТ-КЛУБЕ</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg text-zinc-400 max-w-2xl">
              Нас ценят за крутую тактическую атмосферу, профессиональную команду ведущих и высокий уровень организации детских и взрослых праздников.
            </p>
          </div>

          {/* Rating Summary Card */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 self-start lg:self-center">
            <div className="text-center sm:text-left sm:border-r sm:border-zinc-800 sm:pr-6">
              <div className="text-5xl font-black text-white tabular-nums">{averageRating}</div>
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-1 text-orange-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Средняя оценка по отзывам</div>
            </div>

            <div className="flex flex-col gap-2">
              <a 
                href="https://yandex.ru/maps/org/lazertag_kvest/156008228304/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-zinc-200 hover:text-orange-400 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 px-4 py-2 rounded-xl transition-all"
              >
                <Globe className="w-4 h-4 text-orange-500" />
                Яндекс Карты (Филиал 1) <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://yandex.com/maps/org/lazertag_kvest/28570908147/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-zinc-200 hover:text-orange-400 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 px-4 py-2 rounded-xl transition-all"
              >
                <MapPin className="w-4 h-4 text-orange-400" />
                Яндекс Карты (Филиал 2) <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-950/30'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Все отзывы ({reviews.length})
            </button>
            <button
              onClick={() => setFilter('yandex')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                filter === 'yandex'
                  ? 'bg-orange-600 border-orange-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Яндекс Карты
            </button>
            <button
              onClick={() => setFilter('vk')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                filter === 'vk'
                  ? 'bg-zinc-200 border-zinc-200 text-zinc-950'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              ВКонтакте
            </button>
            <button
              onClick={() => setFilter('manual')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                filter === 'manual'
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              Оставленные на сайте
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all self-stretch sm:self-auto justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Оставить свой отзыв
          </button>
        </div>

        {/* Inline Add Review Form */}
        {showAddForm && (
          <form 
            onSubmit={handleSubmit} 
            className="mb-10 bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl max-w-xl"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-400" />
              Ваш отзыв о клубе «Лазер Квест»
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Как вас зовут</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Мария Иванова"
                  className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Оценка</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (Отлично)</option>
                    <option value={4}>⭐⭐⭐⭐ (Хорошо)</option>
                    <option value={3}>⭐⭐⭐ (Удовлетворительно)</option>
                    <option value={2}>⭐⭐ (Плохо)</option>
                    <option value={1}>⭐ (Ужасно)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Источник</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="manual">Сайт клуба</option>
                    <option value="yandex">Яндекс Карты</option>
                    <option value="vk">ВКонтакте</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Текст отзыва</label>
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Поделитесь вашими впечатлениями от игры, работы инструктора или организации праздника..."
                  rows={4}
                  className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:brightness-110 cursor-pointer"
              >
                Опубликовать отзыв
              </button>
            </div>
          </form>
        )}

        {/* Reviews Grid */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500 text-sm">В этой категории отзывов пока нет.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReviews.map((review) => {
              const initials = (review.author || 'К').trim().slice(0, 2).toUpperCase();
              const showAvatarImg = review.avatarUrl && !failedAvatars[review.id];

              return (
                <div 
                  key={review.id} 
                  className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between hover:border-orange-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {showAvatarImg ? (
                          <img 
                            src={review.avatarUrl} 
                            alt={review.author}
                            onError={() => setFailedAvatars(prev => ({ ...prev, [review.id]: true }))}
                            className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-orange-500/40 text-orange-400 flex items-center justify-center font-black text-xs">
                            {initials}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-white">{review.author}</h4>
                          <span className="text-[11px] text-zinc-500">{review.date}</span>
                        </div>
                      </div>

                      {/* Source & Rating */}
                      <div className="flex flex-col items-end">
                        <div className="flex gap-0.5 text-orange-400 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${
                                i < review.rating ? 'fill-current' : 'text-zinc-700'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {review.source === 'yandex' ? 'Яндекс.Карты' : review.source === 'vk' ? 'ВКонтакте' : 'Сайт клуба'}
                        </span>
                      </div>
                    </div>

                    <p className="text-zinc-300 text-sm leading-relaxed">
                      «{review.text}»
                    </p>
                  </div>

                  {review.sourceUrl && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/80 flex justify-end">
                      <a 
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-orange-400 transition-colors"
                      >
                        Смотреть оригинал <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
