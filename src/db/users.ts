// User database operations
import { query } from "./client.ts";
import { User } from "../types.ts";
import {
  saveUserToMemory,
  getUserFromMemory,
  updateUserCityInMemory,
} from "./memory.ts";

// Создать или обновить пользователя
export async function upsertUser(user: Omit<User, "id" | "created_at" | "updated_at">): Promise<User | null> {
  try {
    const result = await query<User>(
      `INSERT INTO users (telegram_id, username, first_name, city, latitude, longitude, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (telegram_id) 
       DO UPDATE SET 
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        user.telegram_id,
        user.username || null,
        user.first_name || null,
        user.city || null,
        user.latitude || null,
        user.longitude || null,
        user.timezone || null,
      ]
    );

    return result.rows[0] || null;
  } catch (_error) {
    // Fallback на memory storage если БД недоступна
    const fullUser: User = {
      ...user,
      created_at: new Date(),
      updated_at: new Date(),
    };
    saveUserToMemory(fullUser);
    return fullUser;
  }
}

// Получить пользователя по Telegram ID
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  try {
    const result = await query<User>(
      "SELECT * FROM users WHERE telegram_id = $1",
      [telegramId]
    );

    return result.rows[0] || null;
  } catch (_error) {
    // Fallback на memory storage если БД недоступна
    console.warn("DB not available, using memory storage");
    return getUserFromMemory(telegramId);
  }
}

// Обновить город пользователя (с созданием если не существует)
export async function updateUserCity(
  telegramId: number,
  city: string,
  latitude?: number,
  longitude?: number
): Promise<boolean> {
  try {
    // UPSERT - создаём пользователя если не существует, иначе обновляем
    await query(
      `INSERT INTO users (telegram_id, city, latitude, longitude)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) 
       DO UPDATE SET 
         city = EXCLUDED.city,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         updated_at = CURRENT_TIMESTAMP`,
      [telegramId, city, latitude || null, longitude || null]
    );

    return true;
  } catch (_error) {
    // Fallback на memory storage если БД недоступна
    console.warn("DB not available, using memory storage for city update");
    updateUserCityInMemory(telegramId, city, latitude, longitude);
    return true;
  }
}

// Обновить timezone пользователя
export async function updateUserTimezone(
  telegramId: number,
  timezone: string
): Promise<boolean> {
  try {
    await query(
      `UPDATE users 
       SET timezone = $2, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $1`,
      [telegramId, timezone]
    );

    return true;
  } catch (error) {
    console.error("Error updating user timezone:", error);
    return false;
  }
}

// Получить всех пользователей с установленным городом
export async function getUsersWithCity(): Promise<User[]> {
  try {
    const result = await query<User>(
      "SELECT * FROM users WHERE city IS NOT NULL ORDER BY updated_at DESC"
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting users with city:", error);
    return [];
  }
}
