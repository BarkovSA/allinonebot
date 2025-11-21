import { InlineKeyboard } from "grammy";
import { BotContext } from "../../types.ts";
import { setUserState, getUserState } from "../../middleware/state.ts";
import { BotMode } from "../../types.ts";
import { getExchangeRates, getCryptoPrices, refreshRates } from "./rates.ts";

// Модуль конвертации валют (использует API для актуальных курсов)

const currencySymbols: Record<string, string> = {
  USD: "🇺🇸 $",
  EUR: "🇪🇺 €",
  RUB: "🇷🇺 ₽",
  GBP: "🇬🇧 £",
  JPY: "🇯🇵 ¥",
  CNY: "🇨🇳 ¥",
  BTC: "₿",
  ETH: "Ξ",
  BNB: "BNB",
  SOL: "◎",
  XRP: "XRP",
  DOGE: "Ð",
  TON: "💎",
  TRX: "TRX",
};

export async function handleCurrencyCallback(ctx: BotContext) {
  // Обновляем курсы
  await refreshRates();
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  
  const keyboard = new InlineKeyboard()
    .text("💵 USD → RUB", "currency_usd_rub")
    .text("💶 EUR → RUB", "currency_eur_rub").row()
    .text("💷 GBP → RUB", "currency_gbp_rub")
    .text("💴 JPY → RUB", "currency_jpy_rub").row()
    .text("₿ Bitcoin", "currency_btc")
    .text("Ξ Ethereum", "currency_eth").row()
    .text("💎 TON", "currency_ton")
    .text("Ð Dogecoin", "currency_doge").row()
    .text("📊 Все курсы", "currency_all")
    .text("🔄 Калькулятор", "currency_calc").row()
    .text("◀️ Главное меню", "back_to_menu");

  await ctx.editMessageText(
    `=============================
  💰 <b>КУРСЫ ВАЛЮТ</b> 💰
=============================

<b>💱 Актуальные курсы обмена</b>

-----------------------------
<b>🌍 ФИАТ ВАЛЮТЫ</b>
-----------------------------

🇺🇸 <b>USD</b> → ₽ ${exchangeRates.USD.RUB.toFixed(2)}
🇪🇺 <b>EUR</b> → ₽ ${exchangeRates.EUR.RUB.toFixed(2)}
🇬🇧 <b>GBP</b> → ₽ ${exchangeRates.GBP.RUB.toFixed(2)}
🇯🇵 <b>100 JPY</b> → ₽ ${(exchangeRates.RUB.JPY * 100).toFixed(2)}

-----------------------------
<b>₿ КРИПТОВАЛЮТЫ</b>
-----------------------------

₿ <b>Bitcoin</b> → $${cryptoPrices.BTC.toLocaleString()}
Ξ <b>Ethereum</b> → $${cryptoPrices.ETH.toLocaleString()}
💎 <b>Toncoin</b> → $${cryptoPrices.TON.toFixed(2)}
Ð <b>Dogecoin</b> → $${cryptoPrices.DOGE.toFixed(3)}

-----------------------------

📊 <b>Смотри полный список курсов</b>
🔄 <b>Используй калькулятор</b>

-----------------------------

⚡ <b>Обновление:</b> Каждые 15 минут
📱 <b>Источник:</b> Мировые биржи

<b>👇 Выбери валюту</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
}

// Показать курс конкретной пары
async function showCurrencyPair(
  ctx: BotContext,
  from: string,
  to: string,
  amount = 1
) {
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  
  let rate: number;
  let resultText: string;

  if (cryptoPrices[from]) {
    // Крипта в USD
    const usdAmount = cryptoPrices[from] * amount;
    rate = cryptoPrices[from];
    resultText = `${currencySymbols[from]} ${amount} ${from} = $${usdAmount.toLocaleString(
      "en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`;
  } else if (exchangeRates[from] && exchangeRates[from][to]) {
    rate = exchangeRates[from][to];
    const result = amount * rate;
    resultText = `${currencySymbols[from]} ${amount} ${from} = ${
      currencySymbols[to]
    } ${result.toFixed(2)} ${to}`;
  } else {
    await ctx.answerCallbackQuery("⚠️ Курс недоступен");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("🔄 Пересчитать", "currency_calc")
    .text("📊 Все курсы", "currency_all").row()
    .text("◀️ Назад", "menu_currency");

  await ctx.editMessageText(
    `=============================
   💱 <b>КОНВЕРТАЦИЯ</b> 💱
=============================

<b>📊 Текущий курс:</b>

${resultText}

-----------------------------

📈 <b>Курс:</b> 1 ${from} = ${rate.toFixed(4)} ${to}

-----------------------------

💡 <b>Примеры:</b>

• 10 ${from} = ${(10 * rate).toFixed(2)} ${to}
• 100 ${from} = ${(100 * rate).toFixed(2)} ${to}
• 1000 ${from} = ${(1000 * rate).toFixed(2)} ${to}

-----------------------------

🔄 <b>Используй калькулятор</b>
   <i>для любых сумм</i>

<b>👇 Что дальше?</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
}

// Показать Bitcoin
export async function handleCurrencyBTC(ctx: BotContext) {
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  const btcPrice = cryptoPrices.BTC;
  const btcInRub = btcPrice * exchangeRates.USD.RUB;

  const keyboard = new InlineKeyboard()
    .text("Ξ Ethereum", "currency_eth")
    .text("💎 TON", "currency_ton").row()
    .text("📊 Все курсы", "currency_all")
    .text("◀️ Назад", "menu_currency");

  await ctx.editMessageText(
    `=============================
   ₿ <b>BITCOIN (BTC)</b> ₿
=============================

<b>💰 Текущая цена:</b>

-----------------------------

🇺🇸 <b>В долларах:</b>
   $${btcPrice.toLocaleString("en-US")}

🇷🇺 <b>В рублях:</b>
   ₽${btcInRub.toLocaleString("ru-RU", {
     minimumFractionDigits: 2,
     maximumFractionDigits: 2,
   })}

-----------------------------

💡 <b>Сколько можно купить:</b>

• За $100 → ₿${(100 / btcPrice).toFixed(6)}
• За $1000 → ₿${(1000 / btcPrice).toFixed(6)}
• За $10000 → ₿${(10000 / btcPrice).toFixed(5)}

-----------------------------

📊 <b>Капитализация:</b> $730 млрд
📈 <b>Доминация:</b> ~52%
⚡ <b>Сеть:</b> Bitcoin (PoW)

-----------------------------

<b>👑 Король криптовалют!</b>

<b>👇 Другие монеты</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery("₿ Bitcoin");
}

// Показать Ethereum
export async function handleCurrencyETH(ctx: BotContext) {
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  const ethPrice = cryptoPrices.ETH;
  const ethInRub = ethPrice * exchangeRates.USD.RUB;

  const keyboard = new InlineKeyboard()
    .text("₿ Bitcoin", "currency_btc")
    .text("💎 TON", "currency_ton").row()
    .text("📊 Все курсы", "currency_all")
    .text("◀️ Назад", "menu_currency");

  await ctx.editMessageText(
    `=============================
   Ξ <b>ETHEREUM (ETH)</b> Ξ
=============================

<b>💰 Текущая цена:</b>

-----------------------------

🇺🇸 <b>В долларах:</b>
   $${ethPrice.toLocaleString("en-US")}

🇷🇺 <b>В рублях:</b>
   ₽${ethInRub.toLocaleString("ru-RU", {
     minimumFractionDigits: 2,
     maximumFractionDigits: 2,
   })}

-----------------------------

💡 <b>Сколько можно купить:</b>

• За $100 → Ξ${(100 / ethPrice).toFixed(4)}
• За $1000 → Ξ${(1000 / ethPrice).toFixed(4)}
• За $10000 → Ξ${(10000 / ethPrice).toFixed(3)}

-----------------------------

📊 <b>Капитализация:</b> $246 млрд
📈 <b>Доминация:</b> ~18%
⚡ <b>Сеть:</b> Ethereum (PoS)

-----------------------------

<b>🏗️ Платформа для DeFi и NFT!</b>

<b>👇 Другие монеты</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery("Ξ Ethereum");
}

// Показать TON
export async function handleCurrencyTON(ctx: BotContext) {
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  const tonPrice = cryptoPrices.TON;
  const tonInRub = tonPrice * exchangeRates.USD.RUB;

  const keyboard = new InlineKeyboard()
    .text("₿ Bitcoin", "currency_btc")
    .text("Ξ Ethereum", "currency_eth").row()
    .text("📊 Все курсы", "currency_all")
    .text("◀️ Назад", "menu_currency");

  await ctx.editMessageText(
    `=============================
   💎 <b>TONCOIN (TON)</b> 💎
=============================

<b>💰 Текущая цена:</b>

-----------------------------

🇺🇸 <b>В долларах:</b>
   $${tonPrice.toFixed(2)}

🇷🇺 <b>В рублях:</b>
   ₽${tonInRub.toFixed(2)}

-----------------------------

💡 <b>Сколько можно купить:</b>

• За $100 → 💎${(100 / tonPrice).toFixed(2)} TON
• За $1000 → 💎${(1000 / tonPrice).toFixed(2)} TON
• За $10000 → 💎${(10000 / tonPrice).toFixed(0)} TON

-----------------------------

📊 <b>Капитализация:</b> $7.4 млрд
⚡ <b>Сеть:</b> TON (от Telegram)
🚀 <b>TPS:</b> до 100,000

-----------------------------

<b>⚡ Быстрая сеть от Telegram!</b>

<b>👇 Другие монеты</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery("💎 Toncoin");
}

// Показать Dogecoin
export async function handleCurrencyDOGE(ctx: BotContext) {
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  const dogePrice = cryptoPrices.DOGE;
  const dogeInRub = dogePrice * exchangeRates.USD.RUB;

  const keyboard = new InlineKeyboard()
    .text("₿ Bitcoin", "currency_btc")
    .text("💎 TON", "currency_ton").row()
    .text("📊 Все курсы", "currency_all")
    .text("◀️ Назад", "menu_currency");

  await ctx.editMessageText(
    `=============================
   Ð <b>DOGECOIN (DOGE)</b> Ð
=============================

<b>💰 Текущая цена:</b>

-----------------------------

🇺🇸 <b>В долларах:</b>
   $${dogePrice.toFixed(3)}

🇷🇺 <b>В рублях:</b>
   ₽${dogeInRub.toFixed(2)}

-----------------------------

💡 <b>Сколько можно купить:</b>

• За $10 → Ð${(10 / dogePrice).toFixed(0)} DOGE
• За $100 → Ð${(100 / dogePrice).toFixed(0)} DOGE
• За $1000 → Ð${(1000 / dogePrice).toFixed(0)} DOGE

-----------------------------

📊 <b>Капитализация:</b> $12 млрд
🐕 <b>Мем:</b> Doge
⚡ <b>Сеть:</b> Dogecoin (PoW)

-----------------------------

<b>🐕 To The Moon! 🚀</b>

<b>👇 Другие монеты</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery("Ð Dogecoin");
}

// Показать все курсы
export async function handleCurrencyAll(ctx: BotContext) {
  const exchangeRates = await getExchangeRates();
  const cryptoPrices = await getCryptoPrices();
  
  const keyboard = new InlineKeyboard()
    .text("🔄 Калькулятор", "currency_calc")
    .text("◀️ Назад", "menu_currency");

  let cryptoText = "";
  for (const [symbol, price] of Object.entries(cryptoPrices)) {
    const rubPrice = price * exchangeRates.USD.RUB;
    cryptoText += `${currencySymbols[symbol]} <b>${symbol}</b> → $${price.toLocaleString()} (₽${rubPrice.toFixed(
      0
    )})\n`;
  }

  await ctx.editMessageText(
    `=============================
   📊 <b>ВСЕ КУРСЫ</b> 📊
=============================

<b>🌍 ФИАТ ВАЛЮТЫ К РУБЛЮ:</b>

-----------------------------

🇺🇸 <b>1 USD</b> → ₽${exchangeRates.USD.RUB.toFixed(2)}
🇪🇺 <b>1 EUR</b> → ₽${exchangeRates.EUR.RUB.toFixed(2)}
🇬🇧 <b>1 GBP</b> → ₽${exchangeRates.GBP.RUB.toFixed(2)}
🇯🇵 <b>100 JPY</b> → ₽${(exchangeRates.RUB.JPY * 100).toFixed(2)}
🇨🇳 <b>1 CNY</b> → ₽${exchangeRates.RUB.CNY.toFixed(2)}

-----------------------------

<b>₿ КРИПТОВАЛЮТЫ:</b>

-----------------------------

${cryptoText}
-----------------------------

⚡ <b>Обновлено:</b> только что
📱 <b>Данные:</b> мировые биржи

<b>👇 Калькулятор для расчётов</b>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
}

// Калькулятор (заглушка)
export async function handleCurrencyCalc(ctx: BotContext) {
  await ctx.answerCallbackQuery("⏳ Калькулятор скоро!");
}

// Обработчики пар валют
export async function handleCurrencyUsdRub(ctx: BotContext) {
  await showCurrencyPair(ctx, "USD", "RUB");
}

export async function handleCurrencyEurRub(ctx: BotContext) {
  await showCurrencyPair(ctx, "EUR", "RUB");
}

export async function handleCurrencyGbpRub(ctx: BotContext) {
  await showCurrencyPair(ctx, "GBP", "RUB");
}

export async function handleCurrencyJpyRub(ctx: BotContext) {
  await showCurrencyPair(ctx, "JPY", "RUB", 100);
}
