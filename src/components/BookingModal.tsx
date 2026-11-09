import React, { useState } from 'react';
import { X, Calendar, Users, Phone, User, Check, Flame, MessageSquare, MapPin } from 'lucide-react';
import { saveLead } from '../lib/db';
import { sendLeadToTelegram } from '../lib/telegram';
import { Lead, ContactInfo } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName?: string;
  packagePrice?: number;
  contacts?: ContactInfo;
}

const DISTRICTS = ['Сочи', 'Адлер', 'Дагомыс', 'Красная Поляна'] as const;

export default function BookingModal({ isOpen, onClose, packageName, packagePrice, contacts }: BookingModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState<string>('Сочи');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('10');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const newLead: Lead = {
      id: 'lead_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name,
      phone,
      district,
      date: date || new Date().toISOString().split('T')[0],
      guests: guests || '10',
      comment: comment ? `[Район: ${district}] ${comment}` : `Район: ${district}`,
      packageName,
      packagePrice,
      createdAt: new Date().toISOString(),
      status: 'new'
    };

    try {
      await Promise.allSettled([
        saveLead(newLead),
        sendLeadToTelegram(newLead, contacts),
      ]);
      setLoading(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error saving lead to DB:', err);
      setLoading(false);
      setIsSubmitted(true);
    }
  };

  const handleReset = () => {
    setName('');
    setPhone('');
    setDistrict('Сочи');
    setDate('');
    setGuests('10');
    setComment('');
    setIsSubmitted(false);
    onClose();
  };

  const appendQuickComment = (option: string) => {
    setComment((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return option;
      if (trimmed.toLowerCase().includes(option.toLowerCase())) return trimmed;
      return `${trimmed}, ${option}`;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-auto">
        {/* Tactical orange header bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500" />

        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
            <div className="mb-5">
              <span className="text-xs font-black uppercase tracking-wider text-orange-400 px-2.5 py-1 bg-orange-950/50 border border-orange-500/30 rounded-lg">
                Бронирование игры
              </span>
              <h3 className="text-2xl font-black text-white mt-3">
                {packageName ? `Заказать «${packageName}»` : 'Забронировать лазертаг-квест'}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Оставьте ваши контакты, и наш координатор праздников свяжется с вами в течение 10 минут!
              </p>

              {packagePrice && (
                <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Стоимость программы:</span>
                  <span className="text-lg font-black text-orange-400 tabular-nums">{packagePrice.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Ваше Имя</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Александр"
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Номер Телефона</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* 3.1 District ("Ваш район") */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Ваш район
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                    <MapPin className="w-4 h-4 text-orange-500" />
                  </span>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Желаемая Дата</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Кол-во гостей</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Users className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      value={guests}
                      min="1"
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3.2 Comments */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Комментарий
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Поиграть', 'Беседку с мангалом', 'Кафе', 'Пикник'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => appendQuickComment(opt)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-800 hover:border-orange-500/40 transition-colors cursor-pointer"
                    >
                      + {opt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute top-3 left-3 text-zinc-500">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={'Вы хотите только: "поиграть, беседку с мангалом, кафе, пикник?"'}
                    rows={2}
                    className="w-full bg-zinc-900 text-white text-sm border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    Забронировать
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-500/20 border border-orange-500 text-orange-400 rounded-full flex items-center justify-center mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Заявка принята!</h3>
            <p className="text-zinc-400 text-sm mt-2 max-w-sm">
              Благодарим за обращение ({district}). Координатор праздников свяжется с вами по номеру <span className="text-orange-400 font-bold">{phone}</span> в течение ближайших 10 минут для подтверждения бронирования.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-8 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

