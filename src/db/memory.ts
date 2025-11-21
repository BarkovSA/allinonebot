// In-memory storage для пользователей (fallback когда БД недоступна)
import { User } from "../types.ts";

const usersCache = new Map<number, User>();

export function saveUserToMemory(user: User): void {
  usersCache.set(user.telegram_id, {
    ...user,
    updated_at: new Date(),
  });
  console.log(`💾 User ${user.telegram_id} saved to memory (city: ${user.city || 'not set'})`);
}

export function getUserFromMemory(telegramId: number): User | null {
  const user = usersCache.get(telegramId) || null;
  if (user) {
    console.log(`💾 User ${telegramId} retrieved from memory (city: ${user.city || 'not set'})`);
  }
  return user;
}

export function updateUserCityInMemory(
  telegramId: number,
  city: string,
  latitude?: number,
  longitude?: number
): void {
  const existing = usersCache.get(telegramId) || { telegram_id: telegramId };
  usersCache.set(telegramId, {
    ...existing,
    city,
    latitude,
    longitude,
    updated_at: new Date(),
  });
  console.log(`💾 City saved to memory for user ${telegramId}: ${city}`);
}

export function clearMemoryStorage(): void {
  usersCache.clear();
  console.log("💾 Memory storage cleared");
}

export function getMemoryStorageSize(): number {
  return usersCache.size;
}
