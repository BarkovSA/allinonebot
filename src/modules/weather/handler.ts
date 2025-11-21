// Weather module handlers
import { InlineKeyboard } from "grammy";
import { WeatherClient } from "./api.ts";
import { BotMode } from "../../types.ts";
import { getUserState, setUserState } from "../../middleware/state.ts";
import { BotContext } from "../../types.ts";

// Клавиатура для запроса геолокации или ввода города
export function getWeatherSetupKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✍️ Ввести город", "weather_input_city")
    .text("◀️ Назад", "back_to_menu");
}

// Клавиатура после получения погоды
export function getWeatherActionsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔄 Обновить", "weather_refresh")
    .text("📅 Прогноз на 3 дня", "weather_forecast").row()
    .text("🏙️ Изменить город", "weather_change_city")
    .text("◀️ В меню", "back_to_menu");
}

// Текст приглашения указать город
export function getWeatherSetupText(): string {
  return `🌤️ <b>Прогноз погоды</b>\n\n` +
         `Для получения прогноза мне нужен твой город!\n\n` +
         `<b>Выбери способ:</b>\n\n` +
         `📍 <b>Геолокация</b> - самый точный способ\n` +
         `   Нажми на скрепку 📎 → Местоположение\n\n` +
         `✍️ <b>Ввести вручную</b> - напиши название города\n` +
         `   Например: "Москва", "Санкт-Петербург"`;
}

// Обработчик кнопки "Погода"
export async function handleWeatherCallback(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    setUserState(userId, BotMode.Weather);

    // Проверяем, есть ли сохраненный город
    const user = await getUserFromDB(userId);
    
    if (user?.city) {
      // Город есть - показываем погоду
      await showWeather(ctx, user.city);
    } else {
      // Города нет - просим указать
      await ctx.editMessageText(getWeatherSetupText(), {
        parse_mode: "HTML",
        reply_markup: getWeatherSetupKeyboard(),
      });
      
      // Также отправляем кнопку для геолокации
      const keyboard = {
        keyboard: [[{ text: "📍 Отправить геолокацию", request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      };
      
      await ctx.reply("Или нажми кнопку ниже:", { reply_markup: keyboard });
    }
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleWeatherCallback:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при загрузке погоды");
  }
}

// Обработчик кнопки "Ввести город"
export async function handleWeatherInputCity(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    setUserState(userId, BotMode.Weather);
    
    await ctx.editMessageText(
      `✍️ <b>Введи название города</b>\n\n` +
      `Например:\n` +
      `• Москва\n` +
      `• Санкт-Петербург\n` +
      `• Екатеринбург\n` +
      `• London\n` +
      `• New York\n\n` +
      `<i>Просто напиши название города в чат</i>`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("◀️ Отмена", "back_to_menu") }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleWeatherInputCity:", error);
    await ctx.answerCallbackQuery("❌ Ошибка");
  }
}

// Обработчик текстового сообщения с названием города
export async function handleWeatherCityMessage(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем режим
  if (getUserState(userId) !== BotMode.Weather) {
    return;
  }

  const cityName = ctx.message?.text;
  if (!cityName || cityName.startsWith("/")) {
    return;
  }

  try {
    const statusMsg = await ctx.reply("🔍 Ищу город...");

    const client = new WeatherClient();
    
    // Проверяем существование города
    const locations = await client.searchLocation(cityName);
    
    if (locations.length === 0) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `❌ Город "${cityName}" не найден\n\n` +
        `Попробуй:\n` +
        `• Проверить правильность написания\n` +
        `• Использовать английское название\n` +
        `• Указать более крупный город рядом`
      );
      return;
    }

    // Берем первый результат
    const location = locations[0];

    // Сохраняем в БД (важно сделать ДО удаления сообщения)
    await updateUserCityInDB(userId, location.name, location.lat, location.lon);
    
    if (ctx.chat) {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    }

    // Показываем погоду с сообщением о сохранении
    await ctx.reply(
      `✅ Город сохранён: <b>${location.name}</b>\n\nЗагружаю погоду...`,
      { parse_mode: "HTML" }
    );
    
    await showWeather(ctx, location.name);
    
  } catch (error) {
    console.error("Error in handleWeatherCityMessage:", error);
    await ctx.reply(
      `❌ Не удалось получить погоду\n\n` +
      `Попробуй другой город или повтори позже`,
      { reply_markup: getWeatherSetupKeyboard() }
    );
  }
}

// Обработчик геолокации
export async function handleWeatherLocation(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const location = ctx.message?.location;
  if (!location) return;

  try {
    const statusMsg = await ctx.reply("📍 Определяю город по координатам...");

    const client = new WeatherClient();
    const weatherData = await client.getWeatherByCoords(location.latitude, location.longitude);
    
    // Сохраняем город в БД (важно - ДО отправки сообщения!)
    await updateUserCityInDB(
      userId,
      weatherData.location.name,
      location.latitude,
      location.longitude
    );

    if (ctx.chat) {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    }

    // Показываем погоду
    await ctx.reply(
      `✅ Отлично! Твой город сохранён: <b>${weatherData.location.name}</b>\n\n` +
      client.formatWeather(weatherData),
      {
        parse_mode: "HTML",
        reply_markup: getWeatherActionsKeyboard(),
      }
    );

    // Убираем клавиатуру с кнопкой геолокации
    await ctx.reply("Готово! 🎉", {
      reply_markup: { remove_keyboard: true },
    });

  } catch (error) {
    console.error("Error in handleWeatherLocation:", error);
    await ctx.reply("❌ Не удалось определить погоду по координатам");
  }
}

// Показать погоду для города
async function showWeather(ctx: BotContext, city: string) {
  try {
    const client = new WeatherClient();
    const weatherData = await client.getCurrentWeather(city);

    const message = client.formatWeather(weatherData);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: getWeatherActionsKeyboard(),
      });
    } else {
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: getWeatherActionsKeyboard(),
      });
    }
  } catch (error) {
    console.error("Error showing weather:", error);
    const errorMsg = `❌ Не удалось получить погоду для города "${city}"\n\n` +
                     `Попробуй изменить город`;
    
    if (ctx.callbackQuery) {
      await ctx.editMessageText(errorMsg, {
        reply_markup: getWeatherSetupKeyboard(),
      });
    } else {
      await ctx.reply(errorMsg, {
        reply_markup: getWeatherSetupKeyboard(),
      });
    }
  }
}

// Обработчик обновления погоды
export async function handleWeatherRefresh(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await getUserFromDB(userId);
    
    if (!user?.city) {
      await ctx.answerCallbackQuery("❌ Город не задан");
      return;
    }

    await ctx.answerCallbackQuery("🔄 Обновляю...");
    
    // Удаляем старое сообщение и отправляем новое (избегаем ошибки "message is not modified")
    if (ctx.callbackQuery?.message && ctx.chat) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
      } catch (e) {
        console.warn("Failed to delete message:", e);
      }
    }
    
    // Отправляем новое сообщение вместо редактирования
    const client = new WeatherClient();
    const weatherData = await client.getCurrentWeather(user.city);
    const message = client.formatWeather(weatherData);
    
    await ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: getWeatherActionsKeyboard(),
    });
    
  } catch (error) {
    console.error("Error in handleWeatherRefresh:", error);
    await ctx.answerCallbackQuery("❌ Ошибка обновления");
  }
}

// Обработчик прогноза на 3 дня
export async function handleWeatherForecast(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await getUserFromDB(userId);
    
    if (!user?.city) {
      await ctx.answerCallbackQuery("❌ Город не задан");
      return;
    }

    await ctx.answerCallbackQuery("📅 Загружаю прогноз...");

    const client = new WeatherClient();
    const forecastData = await client.getForecast(user.city, 3);
    const forecastMessage = client.formatForecast(forecastData);

    // Удаляем старое сообщение и отправляем новое
    if (ctx.callbackQuery?.message && ctx.chat) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
      } catch (e) {
        console.warn("Failed to delete message:", e);
      }
    }

    await ctx.reply(forecastMessage, {
      parse_mode: "HTML",
      reply_markup: getWeatherActionsKeyboard(),
    });
    
  } catch (error) {
    console.error("Error in handleWeatherForecast:", error);
    await ctx.answerCallbackQuery("❌ Ошибка загрузки прогноза");
  }
}

// Обработчик изменения города
export async function handleWeatherChangeCity(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    setUserState(userId, BotMode.Weather);

    await ctx.editMessageText(getWeatherSetupText(), {
      parse_mode: "HTML",
      reply_markup: getWeatherSetupKeyboard(),
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleWeatherChangeCity:", error);
    await ctx.answerCallbackQuery("❌ Ошибка");
  }
}

// Вспомогательная функция для получения пользователя из БД
async function getUserFromDB(telegramId: number) {
  try {
    const { getUserByTelegramId } = await import("../../db/users.ts");
    const user = await getUserByTelegramId(telegramId);
    if (user) {
      console.log(`✅ User ${telegramId} found in DB, city: ${user.city || 'not set'}`);
    } else {
      console.log(`⚠️ User ${telegramId} not found in DB`);
    }
    return user;
  } catch (error) {
    console.warn("Failed to get user from DB:", error);
    return null;
  }
}

// Вспомогательная функция для обновления города пользователя
async function updateUserCityInDB(telegramId: number, city: string, lat: number, lon: number) {
  try {
    const { updateUserCity } = await import("../../db/users.ts");
    const result = await updateUserCity(telegramId, city, lat, lon);
    if (result) {
      console.log(`✅ City saved for user ${telegramId}: ${city} (${lat}, ${lon})`);
    } else {
      console.warn(`⚠️ Failed to save city for user ${telegramId}`);
    }
  } catch (error) {
    console.warn("Failed to update user city in DB:", error);
  }
}
