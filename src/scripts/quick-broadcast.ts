#!/usr/bin/env -S deno run --allow-net --allow-env

// Быстрая рассылка - просто запустите: deno run --allow-net --allow-env src/scripts/quick-broadcast.ts

import { Bot } from "grammy";
import { config } from "../config.ts";
import { query } from "../db/client.ts";

// 📝 НАСТРОЙТЕ ВАШЕ СООБЩЕНИЕ ЗДЕСЬ:
const YOUR_MESSAGE = `
🤖 <b>Напоминание о возможностях бота!</b>

Привет! Вот что умеет бот:

✨ <b>Доступные функции:</b>
• 🖼 Генерация изображений по описанию
• 🌍 Погода в любом городе (текущая и прогноз)
• ⏰ Напоминания (текстом или голосом)
• 🎤 Расшифровка голосовых (переслать боту)
• 🎮 Мини-игры
• 🎬 Подборка фильмов по жанрам
• 🎥 Генерация видео
• 💰 Курсы валют и криптовалют
• 😄 Шутки разных категорий

🚀 Используйте /menu для доступа ко всем функциям!

Приятного использования! ❤️
`;

// ====== НЕ ТРОГАЙТЕ КОД НИЖЕ ======

async function main() {
  console.log("🚀 Запуск рассылки...\n");
  
  // Подключаемся к БД
  const { connectDB } = await import("../db/client.ts");
  await connectDB();
  
  const bot = new Bot(config.botToken);
  
  // Получаем всех пользователей (или только конкретного для теста)
  const TEST_USER_ID = 295779136; // Замените на ваш telegram_id для теста
  const USE_TEST_MODE = false; // Установите false для рассылки всем
  
  let users: number[];
  
  if (USE_TEST_MODE) {
    users = [TEST_USER_ID];
    console.log(`🧪 ТЕСТОВЫЙ РЕЖИМ: отправка только пользователю ${TEST_USER_ID}\n`);
  } else {
    const result = await query<{ telegram_id: bigint }>(
      "SELECT DISTINCT telegram_id FROM users"
    );
    users = result.rows.map(r => Number(r.telegram_id));
  }
  
  if (users.length === 0) {
    console.log("❌ Пользователей не найдено!");
    Deno.exit(1);
  }
  
  console.log(`📊 Найдено пользователей: ${users.length}`);
  console.log(`📤 Начинаю отправку...\n`);
  
  let ok = 0, blocked = 0, error = 0;
  
  for (let i = 0; i < users.length; i++) {
    const userId = users[i];
    
    try {
      await bot.api.sendMessage(userId, YOUR_MESSAGE, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "📋 Открыть меню", callback_data: "back_to_menu" }
          ]]
        }
      });
      
      ok++;
      
      // Прогресс-бар
      if ((i + 1) % 10 === 0 || i === users.length - 1) {
        const percent = Math.round((i + 1) / users.length * 100);
        const bar = "█".repeat(percent / 5) + "░".repeat(20 - percent / 5);
        console.log(`[${bar}] ${percent}% (${i + 1}/${users.length})`);
      }
      
      // Задержка (соблюдаем лимиты Telegram)
      await new Promise(r => setTimeout(r, 35));
      
    } catch (e: unknown) {
      const err = e as { description?: string; message?: string };
      if (err.description?.includes("blocked") || 
          err.description?.includes("deactivated") ||
          err.description?.includes("not found")) {
        blocked++;
      } else {
        error++;
        console.error(`❌ Ошибка у ${userId}:`, err.description || err.message || e);
      }
    }
  }
  
  console.log("\n✅ Рассылка завершена!\n");
  console.log(`✔️  Доставлено: ${ok}`);
  console.log(`❌ Заблокировали: ${blocked}`);
  console.log(`⚠️  Ошибки: ${error}`);
  console.log(`📊 Всего: ${users.length}`);
  
  await bot.stop();
}

if (import.meta.main) {
  main().catch(console.error);
}
