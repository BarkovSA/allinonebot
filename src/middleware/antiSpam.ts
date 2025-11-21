import { GenerationStatus } from "../types.ts";
import { config } from "../config.ts";

// Хранилище активных генераций
export const activeGenerations = new Map<number, GenerationStatus>();

// Проверить, есть ли активная генерация у пользователя
export function hasActiveGeneration(userId: number): boolean {
  return activeGenerations.has(userId);
}

// Начать генерацию для пользователя
export function startGeneration(userId: number, uuid?: string): void {
  activeGenerations.set(userId, {
    userId,
    startTime: Date.now(),
    uuid,
  });
}

// Завершить генерацию для пользователя
export function finishGeneration(userId: number): void {
  activeGenerations.delete(userId);
}

// Получить статус генерации
export function getGenerationStatus(userId: number): GenerationStatus | undefined {
  return activeGenerations.get(userId);
}

// Очистка зависших генераций (запускается периодически)
export function cleanupStaleGenerations(): void {
  const now = Date.now();
  const timeout = config.antiSpam.generationTimeout;
  
  for (const [userId, status] of activeGenerations.entries()) {
    if (now - status.startTime > timeout) {
      console.log(`⏰ Cleaning up stale generation for user ${userId}`);
      activeGenerations.delete(userId);
    }
  }
}

// Запустить автоочистку каждые 60 секунд
export function startCleanupTimer(): void {
  setInterval(cleanupStaleGenerations, 60 * 1000);
}

// Middleware для проверки спама
export function antiSpamMiddleware() {
  return async (ctx: any, next: () => Promise<void>) => {
    // Проверяем только для команд генерации изображений
    const isImageGenCommand = 
      ctx.callbackQuery?.data === "menu_image_gen" ||
      ctx.callbackQuery?.data === "image_space" ||
      ctx.message?.text === "🎨 Генерация изображений";
    
    if (isImageGenCommand && ctx.from?.id) {
      if (hasActiveGeneration(ctx.from.id)) {
        await ctx.answerCallbackQuery?.("⏳ У вас уже есть активная генерация. Пожалуйста, дождитесь завершения.");
        return; // Блокируем выполнение
      }
    }
    
    await next();
  };
}
