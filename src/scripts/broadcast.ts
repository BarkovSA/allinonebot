// Скрипт для рассылки сообщений всем пользователям
import { Bot } from "grammy";
import { config } from "../config.ts";
import { query } from "../db/client.ts";
import { logger } from "../utils/logger.ts";

interface BroadcastOptions {
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  buttons?: {
    text: string;
    url?: string;
    webApp?: string;
  }[];
}

async function getAllUsers(): Promise<number[]> {
  try {
    const result = await query<{ telegram_id: number }>(
      "SELECT DISTINCT telegram_id FROM users ORDER BY created_at ASC"
    );
    return result.rows.map(row => row.telegram_id);
  } catch (error) {
    logger.error("Error fetching users:", error);
    return [];
  }
}

async function broadcastMessage(options: BroadcastOptions) {
  const bot = new Bot(config.botToken);
  const users = await getAllUsers();
  
  if (users.length === 0) {
    console.log("❌ Пользователей в базе не найдено");
    return;
  }

  console.log(`📊 Всего пользователей: ${users.length}`);
  console.log(`📤 Начинаю рассылку...`);

  let success = 0;
  let failed = 0;
  let blocked = 0;

  // Формируем клавиатуру если есть кнопки
  const keyboard = options.buttons ? {
    inline_keyboard: [
      options.buttons.map(btn => {
        if (btn.webApp) {
          return { text: btn.text, web_app: { url: btn.webApp } };
        } else if (btn.url) {
          return { text: btn.text, url: btn.url };
        }
        return { text: btn.text, callback_data: "menu" };
      })
    ]
  } : undefined;

  for (const userId of users) {
    try {
      await bot.api.sendMessage(userId, options.message, {
        parse_mode: options.parseMode || "HTML",
        link_preview_options: { is_disabled: options.disableWebPagePreview },
        reply_markup: keyboard,
      });
      
      success++;
      
      // Задержка чтобы не превысить лимиты Telegram API (30 сообщений в секунду)
      await new Promise(resolve => setTimeout(resolve, 35));
      
      // Прогресс каждые 10 пользователей
      if ((success + failed + blocked) % 10 === 0) {
        console.log(`📊 Прогресс: ${success + failed + blocked}/${users.length}`);
      }
      
    } catch (error: unknown) {
      const err = error as { description?: string };
      if (err.description?.includes("bot was blocked") || 
          err.description?.includes("user is deactivated") ||
          err.description?.includes("chat not found")) {
        blocked++;
      } else {
        failed++;
        logger.error(`Error sending to user ${userId}:`, error);
      }
    }
  }

  console.log("\n✅ Рассылка завершена!");
  console.log(`✔️  Отправлено успешно: ${success}`);
  console.log(`❌ Заблокировали бота: ${blocked}`);
  console.log(`⚠️  Ошибки: ${failed}`);
  console.log(`📊 Всего: ${users.length}`);
  
  await bot.stop();
}

// Пример использования:
if (import.meta.main) {
  const message = `
🎮 <b>Новая версия игры!</b>

Привет! У нас отличные новости - вышла обновлённая версия <b>Cyber Runner</b>!

<b>Что нового:</b>
✨ Полностью переработанная графика
🎨 Неоновый киберпанк-стиль
🤖 Детализированный персонаж с анимацией
👾 Новые типы врагов (шипы и дроны)
⚡ Улучшенная физика и геймплей
🎯 Сбалансированная сложность
💫 Эффектные частицы и анимации

Попробуй прямо сейчас! 🚀
`;

  await broadcastMessage({
    message,
    parseMode: "HTML",
    disableWebPagePreview: true,
    buttons: [
      {
        text: "🎮 Играть в Cyber Runner",
        webApp: "https://your-domain.com/dino.html"  // Замените на ваш домен
      }
    ]
  });
}
