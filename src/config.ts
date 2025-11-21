// Функция для получения конфига (ленивая загрузка)
function getConfig() {
  return {
    // Telegram Bot
    botToken: Deno.env.get("TELOXIDE_TOKEN") || "",
    
    // FusionBrain API
    fusionBrain: {
      apiKey: Deno.env.get("FUSIONBRAIN_API_KEY") || "",
      secretKey: Deno.env.get("FUSIONBRAIN_SECRET_KEY") || "",
      baseUrl: "https://api-key.fusionbrain.ai",
    },
    
    // Weather API
    weather: {
      apiKey: Deno.env.get("WEATHER_API_KEY") || "",
    },
    
    // Whisper API (Speech-to-Text)
    whisper: {
      apiUrl: Deno.env.get("WHISPER_API_URL") || "http://localhost:9000",
    },
    
    // Database
    database: {
      host: Deno.env.get("DATABASE_HOST") || "localhost",
      port: parseInt(Deno.env.get("DATABASE_PORT") || "5432"),
      database: Deno.env.get("DATABASE_NAME") || "allinone_bot",
      user: Deno.env.get("DATABASE_USER") || "postgres",
      password: Deno.env.get("DATABASE_PASSWORD") || "",
    },
    
    // App settings
    antiSpam: {
      generationTimeout: 15 * 60 * 1000, // 15 минут
      statusCheckInterval: 10 * 1000, // 10 секунд между проверками (как в Rust)
      maxStatusChecks: 30, // максимум 30 попыток = 5 минут (как в Rust)
      initialDelay: 10 * 1000, // 10 секунд перед первой проверкой
    },
  };
}

export const config = getConfig();

// Валидация обязательных переменных
export function validateConfig() {
  if (!config.botToken) {
    throw new Error("TELOXIDE_TOKEN is required");
  }

  if (!config.fusionBrain.apiKey || !config.fusionBrain.secretKey) {
    console.warn("⚠️  FusionBrain credentials not set - image generation will not work");
  }
  
  if (!config.weather.apiKey) {
    console.warn("⚠️  Weather API key not set - weather module will not work");
  }
}
