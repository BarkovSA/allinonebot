import { InlineKeyboard } from "grammy";
import { BotContext } from "../../types.ts";

// URL игр (замени на свой домен или ngrok)
const GAME_URL = Deno.env.get("GAME_SERVER_URL") || "https://your-domain.com";

// Главное меню игр
export async function handleGamesCallback(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .webApp("🐍 Змейка", `${GAME_URL}/snake`)
    .webApp("🎮 2048", `${GAME_URL}/2048`).row()
    .webApp("👻 Pac-Man", `${GAME_URL}/pacman`)
    .webApp("🏓 Пинг-Понг", `${GAME_URL}/pingpong`).row()
    .webApp("🐦 Flappy Bird", `${GAME_URL}/flappybird`)
    .webApp("🦖 T-Rex Runner", `${GAME_URL}/dino`).row()
    .webApp("🟦 Tetris", `${GAME_URL}/tetris`)
    .webApp("👾 Space Invaders", `${GAME_URL}/spaceinvaders`).row()
    .webApp("🍬 Candy Crush", `${GAME_URL}/candycrush`).row()
    .text("◀️ Главное меню", "back_to_menu");

  await ctx.editMessageText(
    `=============================
    🎮 <b>ИГРОВОЙ ЗАЛ</b> 🎮
=============================

<b>✨ Выбери игру и погрузись в действие!</b>

-----------------------------
<b>🌟 КЛАССИКА</b>
-----------------------------

🐍 <b>Змейка</b>
   • Проходи сквозь стены
   • Плавная анимация
   • Неоновая графика

🎮 <b>2048</b>
   • Объединяй плитки
   • Достигни 2048!
   • Красивые анимации

👻 <b>Pac-Man</b>
   • Классический лабиринт
   • 4 умных призрака
   • Система жизней

🍬 <b>Candy Crush</b>
   • Match-3 головоломка
   • Механика drag-drop
   • Комбо система

-----------------------------
<b>🔥 СОРЕВНОВАНИЯ</b>
-----------------------------

🏓 <b>Пинг-Понг</b>
   • Играй против AI
   • Реалистичная физика

👾 <b>Space Invaders</b>
   • Защищай планету
   • Бонусы и апгрейды
   • Система улучшений оружия

-----------------------------
<b>⚡ АРКАДЫ</b>
-----------------------------

🦖 <b>T-Rex Runner</b>
   • Беги и прыгай
   • Увеличивающаяся скорость

🐦 <b>Flappy Bird</b>
   • Летай между труб
   • Простое управление

🟦 <b>Tetris</b>
   • Классический тетрис
   • Система очков

-----------------------------

🎯 <b>Все игры с:</b>
   ✓ Топовой графикой
   ✓ Плавной анимацией 60 FPS
   ✓ Тактильной отдачей
   ✓ Touch + клавиши управления

<b>🚀 Выбери игру ниже!</b>`,
    { reply_markup: keyboard, parse_mode: "HTML" }
  );
}

// Запуск змейки (старый вариант для совместимости)
export async function handleSnakeCallback(ctx: BotContext) {
  await handleGamesCallback(ctx);
}

// Запуск арканоида (старый вариант для совместимости)
export async function handleArkanoidCallback(ctx: BotContext) {
  await handleGamesCallback(ctx);
}

// Заглушки для старых обработчиков
export async function handleSnakeMoveCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery({ text: "Используйте Web App версию!" });
}

export async function handleArkanoidMoveCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery({ text: "Используйте Web App версию!" });
}

// Таблица рекордов
export async function handleScoresCallback(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text("◀️ Назад", "menu_games");

  await ctx.editMessageText(
    "🏆 <b>Таблица рекордов</b>\n\n" +
    "🐍 <b>Змейка:</b>\n" +
    "Скоро появится...\n\n" +
    "🧱 <b>Арканоид:</b>\n" +
    "Скоро появится...",
    { reply_markup: keyboard, parse_mode: "HTML" }
  );
}
