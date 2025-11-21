// Weather API Client (WeatherAPI.com - бесплатный)
import { config } from "../../config.ts";

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
    timezone: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    wind_dir: string;
    pressure_mb: number;
    humidity: number;
    feelslike_c: number;
    uv: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          icon: string;
        };
        daily_chance_of_rain: number;
      };
    }>;
  };
}

export interface GeocodingResult {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

export class WeatherClient {
  private apiKey: string;
  private baseUrl = "https://api.weatherapi.com/v1";

  constructor() {
    this.apiKey = config.weather.apiKey;
  }

  // Получить текущую погоду по названию города
  async getCurrentWeather(city: string): Promise<WeatherData> {
    const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${encodeURIComponent(city)}&lang=ru&aqi=no`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weather API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Получить прогноз погоды на несколько дней
  async getForecast(city: string, days = 3): Promise<WeatherData> {
    const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(city)}&days=${days}&lang=ru&aqi=no`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weather API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Получить погоду по координатам
  async getWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
    const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${lat},${lon}&lang=ru&aqi=no`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weather API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Геокодирование - поиск города
  async searchLocation(query: string): Promise<GeocodingResult[]> {
    const url = `${this.baseUrl}/search.json?key=${this.apiKey}&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weather API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Форматировать погоду для отображения
  formatWeather(data: WeatherData): string {
    const { location, current } = data;
    
    // Эмодзи для погодных условий
    const conditionEmoji = this.getWeatherEmoji(current.condition.text);
    
    return `🌍 <b>${location.name}, ${location.country}</b>\n` +
           `🕐 ${location.localtime}\n\n` +
           `${conditionEmoji} <b>${current.condition.text}</b>\n\n` +
           `🌡 Температура: <b>${current.temp_c}°C</b> (ощущается как ${current.feelslike_c}°C)\n` +
           `💨 Ветер: ${current.wind_kph} км/ч ${this.getWindDirection(current.wind_dir)}\n` +
           `💧 Влажность: ${current.humidity}%\n` +
           `📊 Давление: ${current.pressure_mb} мбар\n` +
           `☀️ УФ-индекс: ${current.uv}`;
  }

  // Форматировать прогноз
  formatForecast(data: WeatherData): string {
    if (!data.forecast?.forecastday) {
      return this.formatWeather(data);
    }

    let result = this.formatWeather(data) + "\n\n<b>📅 Прогноз:</b>\n";

    for (const day of data.forecast.forecastday) {
      const date = new Date(day.date);
      const dayName = this.getDayName(date);
      const emoji = this.getWeatherEmoji(day.day.condition.text);
      
      result += `\n${emoji} <b>${dayName}</b> (${day.date})\n`;
      result += `   ${day.day.condition.text}\n`;
      result += `   🌡 ${day.day.mintemp_c}°C ... ${day.day.maxtemp_c}°C\n`;
      
      if (day.day.daily_chance_of_rain > 0) {
        result += `   🌧 Вероятность дождя: ${day.day.daily_chance_of_rain}%\n`;
      }
    }

    return result;
  }

  // Получить эмодзи для погодных условий
  private getWeatherEmoji(condition: string): string {
    const lower = condition.toLowerCase();
    
    if (lower.includes("солнечно") || lower.includes("ясно")) return "☀️";
    if (lower.includes("облачно") || lower.includes("пасмурно")) return "☁️";
    if (lower.includes("дождь") || lower.includes("ливень")) return "🌧️";
    if (lower.includes("гроза")) return "⛈️";
    if (lower.includes("снег")) return "❄️";
    if (lower.includes("туман")) return "🌫️";
    if (lower.includes("ветер")) return "💨";
    
    return "🌤️";
  }

  // Получить направление ветра на русском
  private getWindDirection(dir: string): string {
    const directions: Record<string, string> = {
      "N": "С", "S": "Ю", "E": "В", "W": "З",
      "NE": "СВ", "NW": "СЗ", "SE": "ЮВ", "SW": "ЮЗ",
      "NNE": "ССВ", "ENE": "ВСВ", "ESE": "ВЮВ", "SSE": "ЮЮВ",
      "SSW": "ЮЮЗ", "WSW": "ЗЮЗ", "WNW": "ЗСЗ", "NNW": "ССЗ"
    };
    return directions[dir] || dir;
  }

  // Получить название дня недели
  private getDayName(date: Date): string {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    return days[date.getDay()];
  }
}
