#!/usr/bin/env -S deno run --allow-net --allow-env

// Удаление последних сообщений от бота

import { Bot } from "grammy";
import { config } from "../config.ts";
import { query } from "../db/client.ts";

async function main() {
  console.log("🗑️  Удаление последних сообщений...\n");
  
  // Подключаемся к БД
  const { connectDB } = await import("../db/client.ts");
  await connectDB();
  
  const bot = new Bot(config.botToken);
  
  // Получаем всех пользователей
  const result = await query<{ telegram_id: bigint }>(
    "SELECT DISTINCT telegram_id FROM users"
  );
  
  const users = result.rows.map(r => Number(r.telegram_id));
  
  if (users.length === 0) {
    console.log("❌ Пользователей не найдено!");
    Deno.exit(1);
  }
  
  console.log(`📊 Найдено пользователей: ${users.length}`);
  console.log(`🗑️  Начинаю удаление...\n`);
  
  let deleted = 0, failed = 0;
  
  for (let i = 0; i < users.length; i++) {
    const userId = users[i];
    
    try {
      // Пытаемся удалить последнее сообщение
      // Telegram API не позволяет узнать message_id последнего сообщения,
      // поэтому пробуем удалить несколько последних ID
      let deletedAny = false;
      
      // Отправляем временное сообщение, чтобы узнать примерный ID
      const msg = await bot.api.sendMessage(userId, "⏳");
      const lastId = msg.message_id;
      
      // Удаляем временное
      await bot.api.deleteMessage(userId, lastId);
      
      // Пробуем удалить предыдущие сообщения (до 5 последних)
      for (let offset = 1; offset <= 5; offset++) {
        try {
          await bot.api.deleteMessage(userId, lastId - offset);
          deletedAny = true;
          break; // Удалили одно - достаточно
        } catch {
          // Не смогли удалить - пробуем следующее
        }
      }
      
      if (deletedAny) {
        deleted++;
      } else {
        failed++;
      }
      
      // Прогресс
      if ((i + 1) % 10 === 0 || i === users.length - 1) {
        const percent = Math.round((i + 1) / users.length * 100);
        const bar = "█".repeat(percent / 5) + "░".repeat(20 - percent / 5);
        console.log(`[${bar}] ${percent}% (${i + 1}/${users.length})`);
      }
      
      // Задержка
      await new Promise(r => setTimeout(r, 50));
      
    } catch (e: unknown) {
      const err = e as { description?: string };
      if (!err.description?.includes("message to delete not found")) {
        failed++;
        console.error(`❌ Ошибка у ${userId}:`, err.description);
      }
    }
  }
  
  console.log("\n✅ Удаление завершено!\n");
  console.log(`✔️  Удалено: ${deleted}`);
  console.log(`❌ Не удалось: ${failed}`);
  console.log(`📊 Всего: ${users.length}`);
  
  await bot.stop();
}

if (import.meta.main) {
  main().catch(console.error);
}
