import { InputFile } from "grammy";
import { FusionBrainClient } from "./fusionbrain.ts";
import { BotMode } from "../../types.ts";
import {
  hasActiveGeneration,
  startGeneration,
  finishGeneration,
} from "../../middleware/antiSpam.ts";
import { getUserState } from "../../middleware/state.ts";
import { getImageGenKeyboard } from "../menu.ts";

// Массив промптов для быстрой генерации "Космос"
const spacePrompts = [
  "Киберпанк космический корабль с неоновыми огнями летит сквозь туманность",
  "Планета в стиле киберпанк с яркими неоновыми кольцами и далёкие галактики",
  "Астронавт в киберпанк скафандре с неоновыми вставками парит в открытом космосе",
  "Футуристическая космическая станция киберпанк с яркими неоновыми огнями на орбите",
  "Чёрная дыра с киберпанк аккреционным диском и неоновыми вспышками энергии",
  "Киберпанк город на космической станции с неоновой подсветкой и звёздным небом",
  "Колония на Марсе в стиле киберпанк под куполом с неоновыми огнями",
  "Космический шаттл в киберпанк стиле с неоновыми полосами приближается к станции",
  "Вид Земли из космоса ночью с яркими неоновыми огнями киберпанк городов",
  "Взрыв сверхновой с киберпанк эффектами и неоновыми вспышками энергии",
  "Киберпанк астероидный пояс с неоновыми кристаллами и яркими вспышками",
  "Космический порт в стиле киберпанк с неоновой рекламой и звёздным фоном",
];

// Получить случайный промпт про космос
function getRandomSpacePrompt(): string {
  return spacePrompts[Math.floor(Math.random() * spacePrompts.length)];
}

// Обработчик кнопки "Космос" - быстрая генерация
export async function handleSpaceButton(ctx: any) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверка активной генерации
  if (hasActiveGeneration(userId)) {
    await ctx.answerCallbackQuery("⏳ Одну картинку уже рисую! Подожди немного ✨");
    return;
  }

  await ctx.answerCallbackQuery();

  const prompt = getRandomSpacePrompt();
  await generateImage(ctx, userId, prompt);
}

// Обработчик текстовых сообщений в режиме генерации изображений
export async function handleImageGenMessage(ctx: any) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем, что мы в режиме генерации
  if (getUserState(userId) !== BotMode.ImageGen) {
    return;
  }

  const prompt = ctx.message?.text;
  if (!prompt || prompt.startsWith("/")) {
    return;
  }

  // Проверка активной генерации
  if (hasActiveGeneration(userId)) {
    await ctx.reply("⏳ Я уже работаю над твоим предыдущим изображением! 🎨\n\nПожалуйста, дождись его завершения, и тогда сможешь создать новое! ✨");
    return;
  }

  await generateImage(ctx, userId, prompt);
}

// Основная функция генерации изображения
async function generateImage(ctx: any, userId: number, prompt: string) {
  // Отмечаем начало генерации
  startGeneration(userId);

  const statusMessage = await ctx.reply(
    `🧪 <b>Запускаю магию нейросети...</b> ✨\n\n` +
    `💬 Твой запрос: <i>«${prompt}»</i>\n\n` +
    `🎨 Рисую твою картинку...\n` +
    `⏱ Это займёт примерно 20-30 секунд`,
    { parse_mode: "HTML" }
  );

  try {
    const client = new FusionBrainClient();
    
    // Запускаем генерацию
    console.log(`🎨 Starting generation for user ${userId}: "${prompt}"`);
    const base64Image = await client.generate(prompt);

    // Конвертируем base64 в Buffer
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));

    // Отправляем изображение
    await ctx.replyWithPhoto(new InputFile(imageBuffer, "generated.jpg"), {
      caption: `✨ <b>Твоё изображение готово!</b> 🎉\n\n💬 Запрос: <i>«${prompt}»</i>\n\n👍 Нравится? Создай ещё одно!`,
      parse_mode: "HTML",
      reply_markup: getImageGenKeyboard(),
    });

    // Удаляем сообщение со статусом
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMessage.message_id);
    } catch (e) {
      // Игнорируем ошибки удаления
    }

    console.log(`✅ Successfully generated image for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error generating image for user ${userId}:`, error);

    let errorMessage = "😞 <b>Ой, что-то пошло не так...</b>\n\n";

    if (error instanceof Error) {
      if (error.message.includes("censored")) {
        errorMessage += "🚫 Модерация заблокировала твой запрос.\nПопробуй сформулировать по-другому! 😊";
      } else if (error.message.includes("timeout")) {
        errorMessage += "⏰ Сервер слишком долго отвечал.\nДавай попробуем ещё раз! 🚀";
      } else {
        errorMessage += `⚠️ Техническая ошибка: ${error.message}\n\n🔄 Попробуй ещё раз!`;
      }
    } else {
      errorMessage += "🤔 Что-то пошло не так...\nПопробуй позже или напиши /start";
    }

    await ctx.reply(errorMessage, {
      parse_mode: "HTML",
      reply_markup: getImageGenKeyboard(),
    });

    // Удаляем сообщение со статусом
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMessage.message_id);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
  } finally {
    // Освобождаем пользователя для новых генераций
    finishGeneration(userId);
  }
}
