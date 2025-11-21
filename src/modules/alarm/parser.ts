// Time parser for reminder module
// Парсинг времени из текста: "в 15:30", "через 2 часа", "завтра в 9 утра"

export interface ParsedTime {
  time: Date;
  confidence: number; // 0-1, насколько уверены в распознавании
  matched: string; // что именно распознали
}

// Основная функция парсинга времени
export function parseTime(text: string): ParsedTime | null {
  const normalizedText = text.toLowerCase().trim();

  // Пробуем разные паттерны
  let result: ParsedTime | null = null;

  // 1. Точное время: "в 15:30", "в 9:00", "15:30"
  result = parseExactTime(normalizedText);
  if (result) return result;

  // 2. Относительное время: "через 2 часа", "через 30 минут"
  result = parseRelativeTime(normalizedText);
  if (result) return result;

  // 3. Завтра/сегодня с временем: "завтра в 9 утра", "сегодня в 18:00"
  result = parseDayTime(normalizedText);
  if (result) return result;

  return null;
}

// Парсинг точного времени: "в 15:30", "15:30", "в 9 утра"
function parseExactTime(text: string): ParsedTime | null {
  // Паттерн HH:MM
  const timePattern = /(?:в\s+)?(\d{1,2})[:\.](\d{2})/;
  const match = text.match(timePattern);

  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const now = new Date();
      const targetTime = new Date(now);
      targetTime.setHours(hours, minutes, 0, 0);

      // Если время уже прошло сегодня, устанавливаем на завтра
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      return {
        time: targetTime,
        confidence: 0.9,
        matched: match[0],
      };
    }
  }

  // Паттерн "в N утра/вечера/дня"
  const timeWordPattern = /(?:в\s+)?(\d{1,2})\s*(утра|вечера|дня|часов|ночи)/;
  const wordMatch = text.match(timeWordPattern);

  if (wordMatch) {
    let hours = parseInt(wordMatch[1]);
    const period = wordMatch[2];

    // Конвертация в 24-часовой формат
    if (period === "вечера" && hours < 12) {
      hours += 12;
    } else if (period === "ночи" && hours < 12) {
      hours += 12;
    } else if (period === "утра" && hours === 12) {
      hours = 0;
    }

    if (hours >= 0 && hours < 24) {
      const now = new Date();
      const targetTime = new Date(now);
      targetTime.setHours(hours, 0, 0, 0);

      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      return {
        time: targetTime,
        confidence: 0.85,
        matched: wordMatch[0],
      };
    }
  }

  return null;
}

// Парсинг относительного времени: "через 2 часа", "через 30 минут"
function parseRelativeTime(text: string): ParsedTime | null {
  // Словесные числа
  const wordNumbers: Record<string, number> = {
    "один": 1, "одну": 1, "одна": 1,
    "два": 2, "две": 2,
    "три": 3,
    "четыре": 4,
    "пять": 5,
    "шесть": 6,
    "семь": 7,
    "восемь": 8,
    "девять": 9,
    "десять": 10,
    "одиннадцать": 11,
    "двенадцать": 12,
    "пятнадцать": 15,
    "двадцать": 20,
    "тридцать": 30,
    "сорок": 40,
    "пятьдесят": 50,
  };

  // Паттерн с числом или словом: "через 2 часа", "через два часа", "через одну минуту"
  const relativePattern = /через\s+([\wа-яё]+)\s*(час|часа|часов|минут|минуты|минуту)/;
  const match = text.match(relativePattern);

  if (match) {
    const amountStr = match[1].toLowerCase();
    const unit = match[2];
    
    // Преобразуем число или слово
    let amount: number;
    if (/^\d+$/.test(amountStr)) {
      amount = parseInt(amountStr);
    } else {
      amount = wordNumbers[amountStr] || 0;
    }

    if (amount === 0) return null; // Не распознали число

    const now = new Date();
    const targetTime = new Date(now);

    if (unit.startsWith("час")) {
      targetTime.setHours(targetTime.getHours() + amount);
    } else if (unit.startsWith("минут")) {
      targetTime.setMinutes(targetTime.getMinutes() + amount);
    }

    return {
      time: targetTime,
      confidence: 0.95,
      matched: match[0],
    };
  }

  return null;
}

// Парсинг "завтра/сегодня + время": "завтра в 9 утра", "сегодня в 18:00"
function parseDayTime(text: string): ParsedTime | null {
  const dayPattern = /(завтра|сегодня|послезавтра)/;
  const dayMatch = text.match(dayPattern);

  if (!dayMatch) return null;

  const day = dayMatch[1];
  let dayOffset = 0;

  if (day === "завтра") dayOffset = 1;
  else if (day === "послезавтра") dayOffset = 2;

  // Ищем время после дня
  const timeText = text.substring(dayMatch.index! + day.length);
  const timeResult = parseExactTime(timeText);

  if (timeResult) {
    const targetTime = new Date(timeResult.time);
    targetTime.setDate(targetTime.getDate() + dayOffset - (timeResult.time > new Date() ? 1 : 0));

    return {
      time: targetTime,
      confidence: 0.9,
      matched: dayMatch[0] + " " + timeResult.matched,
    };
  }

  // Если время не указано, используем 9:00 по умолчанию
  const now = new Date();
  const targetTime = new Date(now);
  targetTime.setDate(targetTime.getDate() + dayOffset);
  targetTime.setHours(9, 0, 0, 0);

  return {
    time: targetTime,
    confidence: 0.6,
    matched: day,
  };
}

// Форматирование времени для отображения
export function formatReminderTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const timeStr = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dateStr = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  if (hours < 1) {
    return `через ${minutes} мин. (${timeStr})`;
  } else if (hours < 24) {
    return `через ${hours} ч. ${minutes} мин. (${timeStr})`;
  } else {
    return `${dateStr} в ${timeStr}`;
  }
}
