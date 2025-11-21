// Alarm/Reminder module handlers
import { InlineKeyboard } from "grammy";
import { BotContext, BotMode } from "../../types.ts";
import { getUserState, setUserState } from "../../middleware/state.ts";
import { createReminder, getUserReminders, deleteReminder } from "../../db/reminders.ts";
import { parseTime, formatReminderTime } from "./parser.ts";

// Клавиатура для модуля напоминаний
export function getAlarmMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("➕ Создать напоминание", "alarm_create")
    .text("📋 Мои напоминания", "alarm_list").row()
    .text("◀️ В меню", "back_to_menu");
}

// Текст приглашения
export function getAlarmWelcomeText(): string {
  return `⏰ <b>Напоминания</b>\n\n` +
         `Я помогу тебе ничего не забыть!\n\n` +
         `<b>Создать напоминание:</b>\n` +
         `Просто напиши текст с указанием времени.\n\n` +
         `<b>Примеры:</b>\n` +
         `• "Позвонить маме в 15:30"\n` +
         `• "Встреча через 2 часа"\n` +
         `• "Поливать цветы завтра в 9 утра"\n\n` +
         `<i>Я пойму и отправлю напоминание вовремя! 🎯</i>`;
}

// Обработчик кнопки "Напоминания" в главном меню
export async function handleAlarmCallback(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    setUserState(userId, BotMode.Alarm);

    await ctx.editMessageText(getAlarmWelcomeText(), {
      parse_mode: "HTML",
      reply_markup: getAlarmMenuKeyboard(),
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleAlarmCallback:", error);
    await ctx.answerCallbackQuery("❌ Ошибка");
  }
}

// Обработчик кнопки "Создать напоминание"
export async function handleAlarmCreate(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    setUserState(userId, BotMode.Alarm);

    await ctx.editMessageText(
      `✍️ <b>Создать напоминание</b>\n\n` +
      `Напиши текст напоминания с указанием времени.\n\n` +
      `<b>Примеры:</b>\n` +
      `• "Позвонить маме в 15:30"\n` +
      `• "Встреча через 2 часа"\n` +
      `• "Купить хлеб завтра в 9 утра"\n\n` +
      `<i>Я распознаю время и создам напоминание</i>`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().text("◀️ Отмена", "menu_alarm"),
      }
    );

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleAlarmCreate:", error);
    await ctx.answerCallbackQuery("❌ Ошибка");
  }
}

// Обработчик кнопки "Мои напоминания"
export async function handleAlarmList(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery("📋 Загружаю...");

    const { getUserActiveReminders } = await import("../../db/reminders.ts");
    const activeReminders = await getUserActiveReminders(userId);

    if (activeReminders.length === 0) {
      await ctx.editMessageText(
        `📋 <b>Мои напоминания</b>\n\n` +
        `У тебя пока нет активных напоминаний.\n\n` +
        `Нажми "Создать напоминание" чтобы добавить!`,
        {
          parse_mode: "HTML",
          reply_markup: getAlarmMenuKeyboard(),
        }
      );
      return;
    }

    // Формируем список с кнопками для каждого напоминания
    let message = `📋 <b>Активные напоминания (${activeReminders.length})</b>\n\n`;

    const keyboard = new InlineKeyboard();
    
    activeReminders.slice(0, 10).forEach((r, i) => {
      const timeStr = formatReminderTime(new Date(r.reminder_time));
      const shortText = r.text.length > 40 ? r.text.substring(0, 40) + "..." : r.text;
      message += `${i + 1}. ${shortText}\n   ⏰ ${timeStr}\n\n`;
      
      // Кнопки для каждого напоминания - используем только ID без эмодзи
      keyboard
        .text(`🗑️ Удалить #${i + 1}`, `alarm_delete_${r.id}`)
        .text(`⏰ Перенести #${i + 1}`, `alarm_reschedule_${r.id}`);
      keyboard.row();
    });

    keyboard.text("◀️ Назад", "menu_alarm");

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });

  } catch (error) {
    console.error("Error in handleAlarmList:", error);
    await ctx.answerCallbackQuery("❌ Ошибка загрузки");
  }
}

// Обработка команд удаления напоминаний
async function handleDeleteCommand(ctx: BotContext, text: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lowerText = text.toLowerCase();
  const { getUserActiveReminders, deleteReminder } = await import("../../db/reminders.ts");

  try {
    const reminders = await getUserActiveReminders(userId);

    if (reminders.length === 0) {
      await ctx.reply("У тебя нет активных напоминаний для удаления");
      return;
    }

    // "удали последнее" или "отмени последнее"
    if (lowerText.includes("последн")) {
      const lastReminder = reminders[0]; // Первое в списке (самое раннее)
      const success = await deleteReminder(lastReminder.id!);

      if (success) {
        await ctx.reply(
          `✅ <b>Удалено последнее напоминание:</b>\n\n` +
          `💭 "${lastReminder.text}"\n` +
          `⏰ ${formatReminderTime(new Date(lastReminder.reminder_time))}`,
          { parse_mode: "HTML" }
        );
        console.log(`🗑️ Deleted last reminder #${lastReminder.id} for user ${userId}`);
      } else {
        await ctx.reply("❌ Не удалось удалить напоминание");
      }
      return;
    }

    // "удали встречу" / "удали напоминание" + поиск по ключевым словам
    const keywords = text
      .replace(/удали|отмени|напоминание|встречу|про/gi, "")
      .trim()
      .toLowerCase();

    if (keywords.length > 2) {
      // Ищем напоминание по ключевым словам
      const found = reminders.find(r => 
        r.text.toLowerCase().includes(keywords)
      );

      if (found) {
        const success = await deleteReminder(found.id!);

        if (success) {
          await ctx.reply(
            `✅ <b>Удалено напоминание:</b>\n\n` +
            `💭 "${found.text}"\n` +
            `⏰ ${formatReminderTime(new Date(found.reminder_time))}`,
            { parse_mode: "HTML" }
          );
          console.log(`🗑️ Deleted reminder #${found.id} by keyword for user ${userId}`);
        } else {
          await ctx.reply("❌ Не удалось удалить напоминание");
        }
        return;
      }
    }

    // Если не нашли - показываем список
    await ctx.reply(
      `🤔 Не могу найти такое напоминание\n\n` +
      `Нажми "Мои напоминания" чтобы увидеть список`,
      { reply_markup: getAlarmMenuKeyboard() }
    );

  } catch (error) {
    console.error("Error in handleDeleteCommand:", error);
    await ctx.reply("❌ Ошибка при удалении");
  }
}

// Обработчик текстового сообщения с напоминанием
export async function handleAlarmMessage(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем режим
  if (getUserState(userId) !== BotMode.Alarm) {
    return;
  }

  // Если мы в режиме переноса - обрабатываем отдельно
  if ((ctx as any).reschedulingReminderId) {
    await handleAlarmRescheduleMessage(ctx);
    return;
  }

  const text = ctx.message?.text;
  if (!text || text.startsWith("/")) {
    return;
  }

  const lowerText = text.toLowerCase();

  try {
    // Обработка команд удаления
    if (lowerText.includes("удали") || lowerText.includes("отмени")) {
      await handleDeleteCommand(ctx, text);
      return;
    }

    // Парсим время из текста
    const parsed = parseTime(text);

    if (!parsed) {
      await ctx.reply(
        `❌ Не могу понять, когда напомнить\n\n` +
        `Попробуй указать время более явно:\n` +
        `• "... в 15:30"\n` +
        `• "... через 2 часа"\n` +
        `• "... завтра в 9 утра"`
      );
      return;
    }

    // Проверяем что время в будущем
    if (parsed.time <= new Date()) {
      await ctx.reply(
        `❌ Это время уже прошло!\n\n` +
        `Укажи время в будущем`
      );
      return;
    }

    // Создаём напоминание
    const reminder = await createReminder({
      user_id: userId,
      text: text,
      reminder_time: parsed.time,
    });

    if (!reminder) {
      await ctx.reply("❌ Не удалось создать напоминание. Попробуй ещё раз");
      return;
    }

    // Подтверждение
    const timeStr = formatReminderTime(parsed.time);
    await ctx.reply(
      `✅ <b>Напоминание создано!</b>\n\n` +
      `💭 "${text}"\n\n` +
      `⏰ Напомню: <b>${timeStr}</b>\n\n` +
      `<i>Распознано: "${parsed.matched}" (уверенность ${Math.round(parsed.confidence * 100)}%)</i>`,
      {
        parse_mode: "HTML",
        reply_markup: getAlarmMenuKeyboard(),
      }
    );

    console.log(`✅ Created reminder #${reminder.id} for user ${userId}`);

  } catch (error) {
    console.error("Error in handleAlarmMessage:", error);
    await ctx.reply(
      `❌ Не удалось создать напоминание\n\n` +
      `Попробуй ещё раз или вернись в меню`,
      { reply_markup: getAlarmMenuKeyboard() }
    );
  }
}

// Обработчик удаления напоминания
export async function handleAlarmDelete(ctx: BotContext) {
  try {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const reminderId = parseInt(callbackData.replace("alarm_delete_", ""));
    
    const { getReminderById, deleteReminder } = await import("../../db/reminders.ts");
    const reminder = await getReminderById(reminderId);

    if (!reminder) {
      await ctx.answerCallbackQuery("❌ Напоминание не найдено");
      return;
    }

    // Проверяем что это напоминание пользователя (BigInt vs Number)
    const reminderUserId = typeof reminder.user_id === 'bigint' ? Number(reminder.user_id) : reminder.user_id;
    if (reminderUserId !== ctx.from?.id) {
      await ctx.answerCallbackQuery("❌ Это не твоё напоминание");
      return;
    }

    const success = await deleteReminder(reminderId);

    if (success) {
      await ctx.answerCallbackQuery("✅ Напоминание удалено");
      
      // Удаляем старое сообщение и показываем обновлённый список
      if (ctx.callbackQuery?.message && ctx.chat) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
        } catch (e) {
          console.warn("Failed to delete message:", e);
        }
      }

      await ctx.reply(
        `🗑️ <b>Напоминание удалено</b>\n\n` +
        `💭 "${reminder.text}"`,
        {
          parse_mode: "HTML",
          reply_markup: getAlarmMenuKeyboard(),
        }
      );

      console.log(`🗑️ Deleted reminder #${reminderId} for user ${ctx.from?.id}`);
    } else {
      await ctx.answerCallbackQuery("❌ Не удалось удалить");
    }

  } catch (error) {
    console.error("Error in handleAlarmDelete:", error);
    await ctx.answerCallbackQuery("❌ Ошибка удаления");
  }
}

// Обработчик переноса напоминания
export async function handleAlarmReschedule(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const reminderId = parseInt(callbackData.replace("alarm_reschedule_", ""));
    
    const { getReminderById } = await import("../../db/reminders.ts");
    const reminder = await getReminderById(reminderId);

    if (!reminder) {
      await ctx.answerCallbackQuery("❌ Напоминание не найдено");
      return;
    }

    // Проверяем что это напоминание пользователя (BigInt vs Number)
    const reminderUserId = typeof reminder.user_id === 'bigint' ? Number(reminder.user_id) : reminder.user_id;
    if (reminderUserId !== userId) {
      await ctx.answerCallbackQuery("❌ Это не твоё напоминание");
      return;
    }

    // Устанавливаем режим переноса
    setUserState(userId, BotMode.Alarm);
    
    // Сохраняем ID напоминания для переноса в контексте (используем temporary storage)
    if (!ctx.session) {
      (ctx as any).session = {};
    }
    (ctx as any).reschedulingReminderId = reminderId;

    const currentTime = formatReminderTime(new Date(reminder.reminder_time));

    await ctx.editMessageText(
      `⏰ <b>Перенос напоминания</b>\n\n` +
      `💭 "${reminder.text}"\n\n` +
      `📅 Текущее время: ${currentTime}\n\n` +
      `<b>Введи новое время:</b>\n` +
      `• "в 18:00"\n` +
      `• "через 3 часа"\n` +
      `• "завтра в 10 утра"\n\n` +
      `<i>Напиши новое время в чат</i>`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().text("◀️ Отмена", "alarm_list"),
      }
    );

    await ctx.answerCallbackQuery();

  } catch (error) {
    console.error("Error in handleAlarmReschedule:", error);
    await ctx.answerCallbackQuery("❌ Ошибка");
  }
}

// Обработчик текста для переноса напоминания
export async function handleAlarmRescheduleMessage(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем что мы в режиме переноса
  const reminderId = (ctx as any).reschedulingReminderId;
  if (!reminderId) return;

  const text = ctx.message?.text;
  if (!text || text.startsWith("/")) {
    return;
  }

  try {
    // Парсим новое время
    const parsed = parseTime(text);

    if (!parsed) {
      await ctx.reply(
        `❌ Не могу понять новое время\n\n` +
        `Попробуй указать более явно:\n` +
        `• "в 18:00"\n` +
        `• "через 3 часа"\n` +
        `• "завтра в 10 утра"`
      );
      return;
    }

    if (parsed.time <= new Date()) {
      await ctx.reply(`❌ Это время уже прошло! Укажи время в будущем`);
      return;
    }

    const { updateReminderTime, getReminderById } = await import("../../db/reminders.ts");
    const success = await updateReminderTime(reminderId, parsed.time);

    if (success) {
      const reminder = await getReminderById(reminderId);
      const timeStr = formatReminderTime(parsed.time);

      await ctx.reply(
        `✅ <b>Напоминание перенесено!</b>\n\n` +
        `💭 "${reminder?.text}"\n\n` +
        `⏰ Новое время: <b>${timeStr}</b>`,
        {
          parse_mode: "HTML",
          reply_markup: getAlarmMenuKeyboard(),
        }
      );

      // Очищаем состояние переноса
      delete (ctx as any).reschedulingReminderId;

      console.log(`⏰ Rescheduled reminder #${reminderId} to ${parsed.time}`);
    } else {
      await ctx.reply("❌ Не удалось перенести напоминание");
    }

  } catch (error) {
    console.error("Error in handleAlarmRescheduleMessage:", error);
    await ctx.reply("❌ Ошибка при переносе");
  }
}

// Обработчик голосовых сообщений
export async function handleAlarmVoice(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const voice = ctx.message?.voice;
  if (!voice) return;

  try {
    if (!ctx.chat) return;
    
    const statusMsg = await ctx.reply("🎤 Распознаю речь...");

    // Скачиваем файл
    const { downloadVoiceFile, transcribeVoice } = await import("./speech.ts");
    const { config } = await import("../../config.ts");
    
    const audioBuffer = await downloadVoiceFile(voice.file_id, config.botToken);

    if (!audioBuffer) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "❌ Не удалось скачать голосовое сообщение"
      );
      return;
    }

    // Распознаём речь через Whisper
    const transcription = await transcribeVoice(audioBuffer, config.whisper.apiUrl);

    if (!transcription || !transcription.text) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `❌ Не удалось распознать речь\n\n` +
        `Возможно Whisper API не запущен.`,
        { parse_mode: "HTML" }
      );
      return;
    }

    const recognizedText = transcription.text.trim();
    console.log(`🎤 Voice transcribed from user ${userId}: "${recognizedText}"`);

    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);

    // Если НЕ в режиме напоминаний - просто отправляем текст
    if (getUserState(userId) !== BotMode.Alarm) {
      await ctx.reply(
        `🎤 <b>Распознанный текст:</b>\n\n` +
        `<i>"${recognizedText}"</i>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Если в режиме напоминаний - создаём напоминание
    const parsed = parseTime(recognizedText);

    if (!parsed) {
      await ctx.reply(
        `🎤 <b>Распознано:</b>\n"${recognizedText}"\n\n` +
        `❌ Не могу понять время из голосового.\n\n` +
        `Попробуй сказать так:\n` +
        `• "Напомни мне позвонить маме в три часа дня"\n` +
        `• "Встреча через два часа"\n` +
        `• "Купить хлеб завтра в девять утра"`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Проверяем что время в будущем
    if (parsed.time <= new Date()) {
      await ctx.reply(
        `🎤 <b>Распознано:</b>\n"${recognizedText}"\n\n` +
        `❌ Это время уже прошло!`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // Создаём напоминание
    const reminder = await createReminder({
      user_id: userId,
      text: recognizedText,
      reminder_time: parsed.time,
      voice_file_id: voice.file_id,
    });

    if (!reminder) {
      await ctx.reply("❌ Не удалось создать напоминание");
      return;
    }

    // Подтверждение
    const timeStr = formatReminderTime(parsed.time);
    await ctx.reply(
      `✅ <b>Голосовое напоминание создано!</b>\n\n` +
      `🎤 Распознано: "${recognizedText}"\n\n` +
      `⏰ Напомню: <b>${timeStr}</b>`,
      {
        parse_mode: "HTML",
        reply_markup: getAlarmMenuKeyboard(),
      }
    );

    console.log(`✅ Created voice reminder #${reminder.id} for user ${userId} at ${parsed.time}`);

  } catch (error) {
    console.error("Error in handleAlarmVoice:", error);
    await ctx.reply("❌ Не удалось обработать голосовое сообщение");
  }
}
