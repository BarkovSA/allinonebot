import { Bot } from "grammy";
import { BotContext } from "./types.ts";
import { config } from "./config.ts";
import { stateMiddleware } from "./middleware/state.ts";
import { antiSpamMiddleware, startCleanupTimer } from "./middleware/antiSpam.ts";
import {
  handleStart,
  handleMenu,
  handleHelp,
  handleImageGenCallback,
  handleComingSoon,
  handleRestartBot,
} from "./modules/menu.ts";
import {
  handleSpaceButton,
  handleImageGenMessage,
} from "./modules/imagegen/handler.ts";
import {
  handleWeatherCallback,
  handleWeatherInputCity,
  handleWeatherCityMessage,
  handleWeatherLocation,
  handleWeatherRefresh,
  handleWeatherForecast,
  handleWeatherChangeCity,
} from "./modules/weather/handler.ts";
import {
  handleAlarmCallback,
  handleAlarmCreate,
  handleAlarmList,
  handleAlarmMessage,
  handleAlarmDelete,
  handleAlarmReschedule,
  handleAlarmVoice,
} from "./modules/alarm/handler.ts";
import { handleGamesCallback } from "./modules/games/handler.ts";
import {
  handleMovieCallback,
  handleMovieAction,
  handleMovieComedy,
  handleMovieSciFi,
  handleMovieDrama,
  handleMovieHorror,
  handleMovieDetective,
  handleMovieAnime,
  handleMovieRandom,
} from "./modules/movies/handler.ts";
import {
  handleVideoCallback,
  handleVideoQuote,
  handleVideoCelebration,
  handleVideoMotivation,
  handleVideoNews,
  handleVideoPromo,
  handleVideoMusic,
  handleVideoMessage,
} from "./modules/video/handler.ts";
import {
  handleCurrencyCallback,
  handleCurrencyBTC,
  handleCurrencyETH,
  handleCurrencyTON,
  handleCurrencyDOGE,
  handleCurrencyAll,
  handleCurrencyCalc,
  handleCurrencyUsdRub,
  handleCurrencyEurRub,
  handleCurrencyGbpRub,
  handleCurrencyJpyRub,
} from "./modules/currency/handler.ts";
import {
  handleJokesCallback,
  handleJokeGeneral,
  handleJokeIT,
  handleJokeLife,
  handleJokeDark,
  handleJokeRandom,
} from "./modules/jokes/handler.ts";
import { upsertUser } from "./db/users.ts";
import { logger } from "./utils/logger.ts";

// Создание экземпляра бота
export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.botToken);

  // Middleware
  bot.use(stateMiddleware());
  bot.use(antiSpamMiddleware());

  // Middleware для сохранения пользователей в БД
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      try {
        await upsertUser({
          telegram_id: ctx.from.id,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
        });
      } catch (error) {
        logger.warn("Failed to upsert user", error);
      }
    }
    await next();
  });

  // Команды
  bot.command("start", handleStart);
  bot.command("menu", handleMenu);
  bot.command("help", handleHelp);

  // Callback queries для главного меню
  bot.callbackQuery("menu_image_gen", handleImageGenCallback);
  bot.callbackQuery("menu_weather", handleWeatherCallback);
  bot.callbackQuery("menu_alarm", handleAlarmCallback);
  bot.callbackQuery("menu_games", handleGamesCallback);
  bot.callbackQuery("menu_movie", handleMovieCallback);
  bot.callbackQuery("menu_video", handleVideoCallback);
  bot.callbackQuery("menu_currency", handleCurrencyCallback);
  bot.callbackQuery("menu_jokes", handleJokesCallback);
  bot.callbackQuery("back_to_menu", handleMenu);
  bot.callbackQuery("restart_bot", handleRestartBot);

  // Callback queries для генерации изображений
  bot.callbackQuery("image_space", handleSpaceButton);
  bot.callbackQuery("image_back", handleMenu);

  // Callback queries для модуля погоды
  bot.callbackQuery("weather_input_city", handleWeatherInputCity);
  bot.callbackQuery("weather_refresh", handleWeatherRefresh);
  bot.callbackQuery("weather_forecast", handleWeatherForecast);
  bot.callbackQuery("weather_change_city", handleWeatherChangeCity);

  // Callback queries для модуля напоминаний
  bot.callbackQuery("alarm_create", handleAlarmCreate);
  bot.callbackQuery("alarm_list", handleAlarmList);
  
  // Динамические callback queries для удаления/переноса (regex patterns)
  bot.callbackQuery(/^alarm_delete_\d+$/, handleAlarmDelete);
  bot.callbackQuery(/^alarm_reschedule_\d+$/, handleAlarmReschedule);

  // Callback queries для модуля фильмов
  bot.callbackQuery("movie_action", handleMovieAction);
  bot.callbackQuery("movie_comedy", handleMovieComedy);
  bot.callbackQuery("movie_scifi", handleMovieSciFi);
  bot.callbackQuery("movie_drama", handleMovieDrama);
  bot.callbackQuery("movie_horror", handleMovieHorror);
  bot.callbackQuery("movie_detective", handleMovieDetective);
  bot.callbackQuery("movie_anime", handleMovieAnime);
  bot.callbackQuery("movie_random", handleMovieRandom);

  // Callback queries для модуля видео
  bot.callbackQuery("video_quote", handleVideoQuote);
  bot.callbackQuery("video_celebration", handleVideoCelebration);
  bot.callbackQuery("video_motivation", handleVideoMotivation);
  bot.callbackQuery("video_news", handleVideoNews);
  bot.callbackQuery("video_promo", handleVideoPromo);
  bot.callbackQuery("video_music", handleVideoMusic);

  // Callback queries для модуля валют
  bot.callbackQuery("currency_usd_rub", handleCurrencyUsdRub);
  bot.callbackQuery("currency_eur_rub", handleCurrencyEurRub);
  bot.callbackQuery("currency_gbp_rub", handleCurrencyGbpRub);
  bot.callbackQuery("currency_jpy_rub", handleCurrencyJpyRub);
  bot.callbackQuery("currency_btc", handleCurrencyBTC);
  bot.callbackQuery("currency_eth", handleCurrencyETH);
  bot.callbackQuery("currency_ton", handleCurrencyTON);
  bot.callbackQuery("currency_doge", handleCurrencyDOGE);
  bot.callbackQuery("currency_all", handleCurrencyAll);
  bot.callbackQuery("currency_calc", handleCurrencyCalc);

  // Callback queries для модуля шуток
  bot.callbackQuery("joke_general", handleJokeGeneral);
  bot.callbackQuery("joke_it", handleJokeIT);
  bot.callbackQuery("joke_life", handleJokeLife);
  bot.callbackQuery("joke_dark", handleJokeDark);
  bot.callbackQuery("joke_random", handleJokeRandom);

  // Обработка текстовых сообщений
  bot.on("message:text", async (ctx, next) => {
    // Сначала пытаемся обработать как напоминание
    await handleAlarmMessage(ctx);
    // Потом как ввод города для погоды
    await handleWeatherCityMessage(ctx);
    // Потом как текст для видео
    await handleVideoMessage(ctx);
    // Потом как промпт для генерации изображения
    await handleImageGenMessage(ctx);
    await next();
  });

  // Обработка геолокации для погоды
  bot.on("message:location", handleWeatherLocation);

  // Обработка голосовых сообщений
  bot.on("message:voice", handleAlarmVoice);

  // Обработка ошибок
  bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(`Error while handling update ${ctx.update.update_id}:`, err.error);
  });

  // Запуск автоочистки зависших генераций
  startCleanupTimer();

  return bot;
}
