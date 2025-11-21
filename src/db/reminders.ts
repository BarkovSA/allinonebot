// Reminders database operations
import { query } from "./client.ts";

export interface Reminder {
  id?: number;
  user_id: number;
  text: string;
  reminder_time: Date;
  voice_file_id?: string;
  is_sent?: boolean;
  created_at?: Date;
}

// Создать напоминание
export async function createReminder(reminder: Omit<Reminder, "id" | "created_at" | "is_sent">): Promise<Reminder | null> {
  try {
    const result = await query<Reminder>(
      `INSERT INTO reminders (user_id, text, reminder_time, voice_file_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        reminder.user_id,
        reminder.text,
        reminder.reminder_time,
        reminder.voice_file_id || null,
      ]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error creating reminder:", error);
    return null;
  }
}

// Получить неотправленные напоминания, время которых уже наступило
export async function getPendingReminders(): Promise<Reminder[]> {
  try {
    const result = await query<Reminder>(
      `SELECT id, user_id, text, reminder_time, voice_file_id, is_sent, created_at
       FROM reminders 
       WHERE is_sent = FALSE 
       AND reminder_time <= NOW()
       ORDER BY reminder_time ASC`
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting pending reminders:", error);
    return [];
  }
}

// Получить все напоминания пользователя
export async function getUserReminders(userId: number): Promise<Reminder[]> {
  try {
    const result = await query<Reminder>(
      `SELECT * FROM reminders 
       WHERE user_id = $1 
       ORDER BY reminder_time DESC
       LIMIT 50`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting user reminders:", error);
    return [];
  }
}

// Пометить напоминание как отправленное
export async function markReminderAsSent(reminderId: number): Promise<boolean> {
  try {
    await query(
      `UPDATE reminders 
       SET is_sent = TRUE 
       WHERE id = $1`,
      [reminderId]
    );

    return true;
  } catch (error) {
    console.error("Error marking reminder as sent:", error);
    return false;
  }
}

// Удалить напоминание
export async function deleteReminder(reminderId: number): Promise<boolean> {
  try {
    await query(
      `DELETE FROM reminders WHERE id = $1`,
      [reminderId]
    );

    return true;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return false;
  }
}

// Получить напоминание по ID
export async function getReminderById(reminderId: number): Promise<Reminder | null> {
  try {
    const result = await query<Reminder>(
      `SELECT * FROM reminders WHERE id = $1`,
      [reminderId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error getting reminder by id:", error);
    return null;
  }
}

// Обновить время напоминания
export async function updateReminderTime(reminderId: number, newTime: Date): Promise<boolean> {
  try {
    await query(
      `UPDATE reminders 
       SET reminder_time = $2 
       WHERE id = $1`,
      [reminderId, newTime]
    );

    return true;
  } catch (error) {
    console.error("Error updating reminder time:", error);
    return false;
  }
}

// Получить активные (неотправленные) напоминания пользователя
export async function getUserActiveReminders(userId: number): Promise<Reminder[]> {
  try {
    const result = await query<Reminder>(
      `SELECT * FROM reminders 
       WHERE user_id = $1 
       AND is_sent = FALSE
       AND reminder_time > NOW()
       ORDER BY reminder_time ASC
       LIMIT 50`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting active reminders:", error);
    return [];
  }
}
