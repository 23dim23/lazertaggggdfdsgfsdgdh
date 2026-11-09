import { Lead, ContactInfo } from '../types';

/**
 * Formats and sends a booking lead notification to a Telegram chat or channel via Telegram Bot API.
 */
export async function sendLeadToTelegram(lead: Lead, contacts?: ContactInfo): Promise<boolean> {
  const botToken = contacts?.telegramBotToken?.trim();
  const chatId = contacts?.telegramChatId?.trim();

  if (!botToken || !chatId) {
    return false;
  }

  const lines = [
    '🔥 *НОВАЯ ЗАЯВКА НА САЙТЕ «ЛАЗЕР КВЕСТ»*',
    '',
    `👤 *Имя:* ${escapeMarkdown(lead.name)}`,
    `📞 *Телефон:* ${escapeMarkdown(lead.phone)}`,
    `📍 *Район:* ${escapeMarkdown(lead.district || 'Сочи')}`,
    `📅 *Желаемая дата:* ${escapeMarkdown(lead.date)}`,
    `👥 *Кол-во гостей:* ${escapeMarkdown(lead.guests)} чел.`,
    `🎯 *Программа / Пакет:* ${escapeMarkdown(lead.packageName || 'Забронировать на сайте')}${
      lead.packagePrice ? ` (${lead.packagePrice.toLocaleString('ru-RU')} ₽)` : ''
    }`,
  ];

  if (lead.comment?.trim()) {
    lines.push(`💬 *Комментарий:* ${escapeMarkdown(lead.comment.trim())}`);
  }

  lines.push('');
  lines.push(`🕒 _Создано: ${new Date(lead.createdAt).toLocaleString('ru-RU')}_`);

  const text = lines.join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Telegram notification error:', err);
    return false;
  }
}

export async function sendTestTelegramMessage(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = botToken.trim();
  const cleanChat = chatId.trim();
  if (!cleanToken || !cleanChat) {
    return { ok: false, error: 'Укажите Bot Token и Chat ID' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChat,
        text: '✅ Тестовое уведомление с сайта «ЛАЗЕР КВЕСТ»! Заявки с сайта теперь будут приходить в этот чат.',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.description || `Ошибка HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка соединения с Telegram API' };
  }
}

function escapeMarkdown(str: string): string {
  return String(str || '').replace(/[_*[\]`]/g, '\\$&');
}
