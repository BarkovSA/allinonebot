// Импортируем модули
import { createBot } from "./bot.ts";
import { initializeDatabase, disconnectDB } from "./db/client.ts";
import { logger } from "./utils/logger.ts";
import { validateConfig } from "./config.ts";
import { startScheduler, stopScheduler } from "./modules/alarm/scheduler.ts";

// Валидация конфига (после загрузки .env)
validateConfig();

// Инициализация базы данных (не критично для работы бота)
try {
  await initializeDatabase();
  logger.info("✅ Database connected - data will be persisted");
} catch (error) {
  logger.warn("⚠️  Database not connected - using in-memory storage", error);
  logger.warn("⚠️  User data (cities, settings) will be lost on restart!");
}

// Создание и запуск бота
const bot = createBot();

// Запуск планировщика напоминаний
startScheduler(bot);

logger.info("🚀 Starting AllInOne Bot...");

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`\n${signal} received, shutting down gracefully...`);
  
  try {
    stopScheduler();
    logger.info("✅ Scheduler stopped");
    
    await bot.stop();
    logger.info("✅ Bot stopped");
    
    await disconnectDB();
    logger.info("✅ Database disconnected");
    
    Deno.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    Deno.exit(1);
  }
};

// Обработчики сигналов (Windows поддерживает только SIGINT, SIGBREAK)
Deno.addSignalListener("SIGINT", () => shutdown("SIGINT"));
if (Deno.build.os !== "windows") {
  Deno.addSignalListener("SIGTERM", () => shutdown("SIGTERM"));
}

// Запуск бота
try {
  logger.info("✅ Bot is starting polling...");
  logger.info("📱 Press Ctrl+C to stop");
  await bot.start(); // Это блокирующий вызов, который начинает long polling
} catch (error) {
  logger.error("Failed to start bot:", error);
  Deno.exit(1);
}
