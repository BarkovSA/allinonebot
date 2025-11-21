import { BotMode } from "../types.ts";

// Хранилище состояний пользователей
export const userStates = new Map<number, BotMode>();

// Получить состояние пользователя
export function getUserState(userId: number): BotMode {
  return userStates.get(userId) || BotMode.MainMenu;
}

// Установить состояние пользователя
export function setUserState(userId: number, mode: BotMode): void {
  userStates.set(userId, mode);
}

// Удалить состояние пользователя
export function clearUserState(userId: number): void {
  userStates.delete(userId);
}

// Middleware для добавления состояния в контекст
export function stateMiddleware() {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.from?.id) {
      ctx.userId = ctx.from.id;
      ctx.mode = getUserState(ctx.from.id);
    }
    await next();
  };
}
