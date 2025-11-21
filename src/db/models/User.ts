import { getDBClient } from "../client.ts";
import { User } from "../../types.ts";

// Создать или обновить пользователя
export async function upsertUser(user: User): Promise<User | null> {
  const client = getDBClient();
  if (!client) return null;

  try {
    const result = await client.queryObject<User>(
      `INSERT INTO users (telegram_id, username, first_name, city)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE
       SET username = EXCLUDED.username,
           first_name = EXCLUDED.first_name,
           city = COALESCE(EXCLUDED.city, users.city),
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user.telegram_id, user.username, user.first_name, user.city]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error upserting user:", error);
    return null;
  }
}

// Получить пользователя по telegram_id
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const client = getDBClient();
  if (!client) return null;

  try {
    const result = await client.queryObject<User>(
      `SELECT * FROM users WHERE telegram_id = $1`,
      [telegramId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Обновить город пользователя
export async function updateUserCity(telegramId: number, city: string): Promise<User | null> {
  const client = getDBClient();
  if (!client) return null;

  try {
    const result = await client.queryObject<User>(
      `UPDATE users SET city = $1, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $2
       RETURNING *`,
      [city, telegramId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error updating user city:", error);
    return null;
  }
}

// Получить всех пользователей
export async function getAllUsers(): Promise<User[]> {
  const client = getDBClient();
  if (!client) return [];

  try {
    const result = await client.queryObject<User>(
      `SELECT * FROM users ORDER BY created_at DESC`
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
}

// Получить количество пользователей
export async function getUserCount(): Promise<number> {
  const client = getDBClient();
  if (!client) return 0;

  try {
    const result = await client.queryObject<{ count: number }>(
      `SELECT COUNT(*) as count FROM users`
    );

    return result.rows[0]?.count || 0;
  } catch (error) {
    console.error("Error getting user count:", error);
    return 0;
  }
}
