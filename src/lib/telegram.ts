import { Lead, ContactInfo, TelegramSubscriber } from '../types';

interface TelegramChatObj {
  id: number | string;
  type?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: { chat?: TelegramChatObj };
  edited_message?: { chat?: TelegramChatObj };
  channel_post?: { chat?: TelegramChatObj };
  callback_query?: { message?: { chat?: TelegramChatObj } };
  my_chat_member?: {
    chat?: TelegramChatObj;
    new_chat_member?: { status?: string };
  };
}

function buildSubscriberName(chat: TelegramChatObj): string {
  if (chat.title) return chat.title;
  const full = [chat.first_name, chat.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (chat.username) return `@${chat.username}`;
  return `Чат ${chat.id}`;
}

export function parseManualChatIds(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^-?\d+$/.test(s) || /^@[a-zA-Z0-9_]{4,}$/.test(s));
}

/**
 * Fetches recent updates from the Telegram Bot API (getUpdates) and merges
 * everyone who pressed /start (or added the bot to a group) with previously saved subscribers.
 */
export async function discoverTelegramSubscribers(
  botToken: string,
  existingSubscribers: TelegramSubscriber[] = []
): Promise<{
  ok: boolean;
  subscribers: TelegramSubscriber[];
  newCount: number;
  error?: string;
}> {
  const cleanToken = botToken.trim();
  const map = new Map<string, TelegramSubscriber>();

  for (const sub of existingSubscribers) {
    if (sub && sub.chatId) {
      map.set(String(sub.chatId), { ...sub, chatId: String(sub.chatId) });
    }
  }

  if (!cleanToken) {
    return {
      ok: false,
      subscribers: Array.from(map.values()),
      newCount: 0,
      error: 'Укажите Telegram Bot Token от @BotFather',
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates?limit=100`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      const desc = data?.description || `Ошибка HTTP ${res.status}`;
      if (res.status === 409 || String(desc).toLowerCase().includes('webhook')) {
        return {
          ok: false,
          subscribers: Array.from(map.values()),
          newCount: 0,
          error: 'У бота активен Webhook. Отключите webhook или укажите Chat ID вручную.',
        };
      }
      return {
        ok: false,
        subscribers: Array.from(map.values()),
        newCount: 0,
        error: desc,
      };
    }

    const updates: TelegramUpdate[] = Array.isArray(data.result) ? data.result : [];
    const initialSize = map.size;
    const nowIso = new Date().toISOString();

    for (const upd of updates) {
      // Handle bot kicked/blocked events
      if (upd.my_chat_member?.chat?.id !== undefined) {
        const chatIdStr = String(upd.my_chat_member.chat.id);
        const status = upd.my_chat_member.new_chat_member?.status;
        if (status === 'kicked' || status === 'left') {
          map.delete(chatIdStr);
          continue;
        }
        const chat = upd.my_chat_member.chat;
        const prev = map.get(chatIdStr);
        map.set(chatIdStr, {
          chatId: chatIdStr,
          name: buildSubscriberName(chat),
          username: chat.username || prev?.username,
          type: chat.type || prev?.type,
          addedAt: prev?.addedAt || nowIso,
        });
      }

      const chat =
        upd.message?.chat ||
        upd.edited_message?.chat ||
        upd.channel_post?.chat ||
        upd.callback_query?.message?.chat;

      if (chat && chat.id !== undefined) {
        const chatIdStr = String(chat.id);
        const prev = map.get(chatIdStr);
        map.set(chatIdStr, {
          chatId: chatIdStr,
          name: buildSubscriberName(chat),
          username: chat.username || prev?.username,
          type: chat.type || prev?.type,
          addedAt: prev?.addedAt || nowIso,
        });
      }
    }

    const merged = Array.from(map.values());
    const newCount = Math.max(0, merged.length - initialSize);

    return { ok: true, subscribers: merged, newCount };
  } catch (err: any) {
    return {
      ok: false,
      subscribers: Array.from(map.values()),
      newCount: 0,
      error: err?.message || 'Ошибка соединения с Telegram API',
    };
  }
}

async function postTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  plainFallback?: string
): Promise<{ ok: boolean; error?: string }> {
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

    if (res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));
    // Retry without Markdown if formatting failed
    if (res.status === 400 && plainFallback) {
      const retry = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainFallback,
        }),
      });
      if (retry.ok) return { ok: true };
    }

    return { ok: false, error: data?.description || `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * Formats and sends a booking lead notification to ALL subscribers who started the Telegram bot
 * (and/or any manually specified Chat IDs).
 */
export async function sendLeadToTelegram(
  lead: Lead,
  contacts?: ContactInfo,
  onSubscribersDiscovered?: (subscribers: TelegramSubscriber[]) => void
): Promise<boolean> {
  const botToken = contacts?.telegramBotToken?.trim();
  if (!botToken) {
    return false;
  }

  const broadcastAll = contacts?.telegramBroadcastAll !== false;
  let subscribers = contacts?.telegramSubscribers ? [...contacts.telegramSubscribers] : [];

  // Live-discover any new users who recently clicked /start in the bot
  if (broadcastAll) {
    const discovered = await discoverTelegramSubscribers(botToken, subscribers);
    if (discovered.ok) {
      const prevIds = new Set(subscribers.map((s) => String(s.chatId)));
      const hasChanges =
        discovered.subscribers.length !== subscribers.length ||
        discovered.subscribers.some((s) => !prevIds.has(String(s.chatId)));

      subscribers = discovered.subscribers;
      if (hasChanges && onSubscribersDiscovered) {
        onSubscribersDiscovered(subscribers);
      }
    }
  }

  const targetIds = new Set<string>();
  if (broadcastAll) {
    for (const sub of subscribers) {
      if (sub.chatId) targetIds.add(String(sub.chatId));
    }
  }
  for (const manualId of parseManualChatIds(contacts?.telegramChatId)) {
    targetIds.add(manualId);
  }

  if (targetIds.size === 0) {
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
  const plainText = text.replace(/[*_\\]/g, '');

  const results = await Promise.allSettled(
    Array.from(targetIds).map((chatId) => postTelegramMessage(botToken, chatId, text, plainText))
  );

  return results.some((r) => r.status === 'fulfilled' && r.value.ok);
}

export async function sendTestTelegramMessage(
  botToken: string,
  manualChatId?: string,
  existingSubscribers: TelegramSubscriber[] = [],
  broadcastAll = true
): Promise<{
  ok: boolean;
  sentCount: number;
  subscribers: TelegramSubscriber[];
  error?: string;
}> {
  const cleanToken = botToken.trim();
  if (!cleanToken) {
    return {
      ok: false,
      sentCount: 0,
      subscribers: existingSubscribers,
      error: 'Укажите Telegram Bot Token от @BotFather',
    };
  }

  let subscribers = [...existingSubscribers];
  if (broadcastAll) {
    const discovered = await discoverTelegramSubscribers(cleanToken, existingSubscribers);
    if (!discovered.ok && parseManualChatIds(manualChatId).length === 0 && existingSubscribers.length === 0) {
      return {
        ok: false,
        sentCount: 0,
        subscribers: existingSubscribers,
        error: discovered.error || 'Не удалось получить список подписчиков бота',
      };
    }
    if (discovered.ok) {
      subscribers = discovered.subscribers;
    }
  }

  const targetIds = new Set<string>();
  if (broadcastAll) {
    for (const sub of subscribers) {
      if (sub.chatId) targetIds.add(String(sub.chatId));
    }
  }
  for (const id of parseManualChatIds(manualChatId)) {
    targetIds.add(id);
  }

  if (targetIds.size === 0) {
    return {
      ok: false,
      sentCount: 0,
      subscribers,
      error:
        'Пока нет ни одного подписчика. Откройте вашего бота в Telegram, нажмите «Запустить» (/start) и повторите проверку!',
    };
  }

  const testMsg =
    '✅ Тестовое уведомление с сайта «ЛАЗЕР КВЕСТ»!\nЗаявки и бронирования с сайта теперь будут автоматически приходить всем, кто запустил этого бота.';

  const results = await Promise.all(
    Array.from(targetIds).map((chatId) => postTelegramMessage(cleanToken, chatId, testMsg, testMsg))
  );

  const sentCount = results.filter((r) => r.ok).length;
  if (sentCount === 0) {
    const firstErr = results.find((r) => r.error)?.error || 'Не удалось отправить сообщение';
    return { ok: false, sentCount: 0, subscribers, error: firstErr };
  }

  return { ok: true, sentCount, subscribers };
}

function escapeMarkdown(str: string): string {
  return String(str || '').replace(/[_*[\]`]/g, '\\$&');
}
