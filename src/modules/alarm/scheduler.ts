// Reminder scheduler
// Проверяет БД каждую минуту и отправляет напоминания
import { Bot } from "grammy";
import { BotContext } from "../../types.ts";
import { getPendingReminders, markReminderAsSent } from "../../db/reminders.ts";
import { getUserByTelegramId } from "../../db/users.ts";

let schedulerInterval: number | null = null;

// Запустить планировщик
export function startScheduler(bot: Bot<BotContext>) {
  if (schedulerInterval) {
    console.log("⚠️  Scheduler already running");
    return;
  }

  console.log("⏰ Starting reminder scheduler...");

  // Первая проверка сразу при запуске
  checkAndSendReminders(bot).catch(console.error);

  // Проверяем каждые 30 секунд
  schedulerInterval = setInterval(() => {
    const now = new Date();
    const seconds = now.getSeconds();
    
    // Запускаем только на 0 и 30 секундах
    if (seconds === 0 || seconds === 30) {
      checkAndSendReminders(bot).catch((error) => {
        console.error("Error in scheduler:", error);
      });
    }
  }, 1000); // Проверяем каждую секунду, но запускаем только на :00 и :30

  console.log("✅ Reminder scheduler started (checking at :00 and :30 seconds)");
}

// Остановить планировщик
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏰ Reminder scheduler stopped");
  }
}

// Проверить и отправить напоминания
async function checkAndSendReminders(bot: Bot<BotContext>) {
  try {
    const reminders = await getPendingReminders();

    if (reminders.length === 0) {
      return;
    }

    console.log(`⏰ Found ${reminders.length} pending reminder(s)`);

    for (const reminder of reminders) {
      try {
        // Convert BigInt to Number for Telegram API
        const userId = typeof reminder.user_id === 'bigint' 
          ? Number(reminder.user_id) 
          : reminder.user_id;
        
        // Получаем пользователя для персонализации
        const user = await getUserByTelegramId(userId);
        const userName = user?.first_name || user?.username || "Господин";

        // Формируем сообщение
        const message = formatReminderMessage(userName, reminder.text);

        // Отправляем напоминание
        await bot.api.sendMessage(userId, message, {
          parse_mode: "HTML",
        });

        // Помечаем как отправленное ТОЛЬКО если отправка успешна
        await markReminderAsSent(reminder.id!);

        console.log(`✅ Sent reminder #${reminder.id} to user ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder #${reminder.id}:`, error);
        if (error instanceof Error) {
          console.error(`   Error: ${error.message}`);
        }
        // НЕ помечаем как отправленное - попробуем в следующий раз
      }
    }
  } catch (error) {
    console.error(`❌ Critical error in checkAndSendReminders:`, error);
  }
}

// Форматирование сообщения напоминания
function formatReminderMessage(userName: string, text: string): string {
  return `⏰ <b>Напоминание</b>\n\n` +
         `${userName}, Вы просили напомнить:\n\n` +
         `💭 <i>"${text}"</i>`;
}
