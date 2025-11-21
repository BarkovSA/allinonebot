// Модуль для получения актуальных курсов валют

interface ExchangeRates {
  [key: string]: {
    [key: string]: number;
  };
}

interface CryptoPrices {
  [key: string]: number;
}

let cachedRates: ExchangeRates | null = null;
let cachedCrypto: CryptoPrices | null = null;
let lastUpdate = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 минут

// Получить курсы фиатных валют
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Проверяем кеш
  if (cachedRates && (now - lastUpdate) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // Используем бесплатный API exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }
    
    const data = await response.json();
    const rates = data.rates;
    
    // Формируем курсы для всех пар
    cachedRates = {
      USD: {
        EUR: rates.EUR,
        RUB: rates.RUB,
        GBP: rates.GBP,
        JPY: rates.JPY,
        CNY: rates.CNY,
      },
      EUR: {
        USD: 1 / rates.EUR,
        RUB: rates.RUB / rates.EUR,
        GBP: rates.GBP / rates.EUR,
        JPY: rates.JPY / rates.EUR,
        CNY: rates.CNY / rates.EUR,
      },
      RUB: {
        USD: 1 / rates.RUB,
        EUR: rates.EUR / rates.RUB,
        GBP: rates.GBP / rates.RUB,
        JPY: rates.JPY / rates.RUB,
        CNY: rates.CNY / rates.RUB,
      },
      GBP: {
        USD: 1 / rates.GBP,
        EUR: rates.EUR / rates.GBP,
        RUB: rates.RUB / rates.GBP,
        JPY: rates.JPY / rates.GBP,
        CNY: rates.CNY / rates.GBP,
      },
    };
    
    lastUpdate = now;
    return cachedRates;
    
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Возвращаем резервные курсы при ошибке
    return {
      USD: { EUR: 0.92, RUB: 92.50, GBP: 0.79, JPY: 149.50, CNY: 7.24 },
      EUR: { USD: 1.09, RUB: 100.80, GBP: 0.86, JPY: 162.70, CNY: 7.88 },
      RUB: { USD: 0.011, EUR: 0.0099, GBP: 0.0085, JPY: 1.62, CNY: 0.078 },
      GBP: { USD: 1.27, EUR: 1.16, RUB: 117.30, JPY: 189.50, CNY: 9.19 },
    };
  }
}

// Получить цены криптовалют
export async function getCryptoPrices(): Promise<CryptoPrices> {
  const now = Date.now();
  
  // Проверяем кеш
  if (cachedCrypto && (now - lastUpdate) < CACHE_DURATION) {
    return cachedCrypto;
  }

  try {
    // Используем CoinGecko API (бесплатный, без ключа)
    const symbols = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'dogecoin', 'the-open-network', 'tron'];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }
    
    const data = await response.json();
    
    cachedCrypto = {
      BTC: data.bitcoin?.usd || 37500,
      ETH: data.ethereum?.usd || 2050,
      BNB: data.binancecoin?.usd || 310,
      SOL: data.solana?.usd || 95,
      XRP: data.ripple?.usd || 0.62,
      DOGE: data.dogecoin?.usd || 0.085,
      TON: data['the-open-network']?.usd || 2.15,
      TRX: data.tron?.usd || 0.10,
    };
    
    lastUpdate = now;
    return cachedCrypto;
    
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    
    // Возвращаем резервные цены при ошибке
    return {
      BTC: 37500,
      ETH: 2050,
      BNB: 310,
      SOL: 95,
      XRP: 0.62,
      DOGE: 0.085,
      TON: 2.15,
      TRX: 0.10,
    };
  }
}

// Принудительно обновить данные
export async function refreshRates(): Promise<void> {
  lastUpdate = 0;
  cachedRates = null;
  cachedCrypto = null;
  await Promise.all([getExchangeRates(), getCryptoPrices()]);
}
