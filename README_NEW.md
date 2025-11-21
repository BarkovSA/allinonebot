# 🤖 AllInOne Telegram Bot

> Многофункциональный Telegram-бот с AI-генерацией, играми, развлечениями и утилитами

[![Deno](https://img.shields.io/badge/Deno-2.5.6-black?logo=deno)](https://deno.land/)
[![Grammy](https://img.shields.io/badge/Grammy-1.34.0-blue)](https://grammy.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

## ✨ Основные возможности

### 🎨 Творчество
- **AI Генерация изображений** - Kandinsky 3.0 API
- **Создание видео** - Текст в видео с эффектами (в разработке)

### 🎮 Развлечения
- **7 HTML5 игр** с Telegram Web Apps
  - 🐍 Змейка (с телепортацией через стены)
  - 🧱 Арканоид (с бустами)
  - 🏓 Пинг-понг (против AI)
  - 🦖 T-Rex Runner
  - 🐦 Flappy Bird
  - 👾 Space Invaders
  - 🧩 Tetris
- **Рекомендации фильмов** - 7 жанров, 25+ фильмов
- **Анекдоты и шутки** - 4 категории юмора

### 🛠️ Утилиты
- **Прогноз погоды** - Актуальная информация
- **Умные напоминания** - С распознаванием речи
- **Курсы валют** - Фиат и криптовалюты
  - USD, EUR, GBP, JPY, CNY → RUB
  - Bitcoin, Ethereum, Toncoin, Dogecoin

## 🚀 Технологический стек

### Backend
- **Runtime**: Deno 2.5.6
- **Framework**: Grammy 1.34.0 (Telegram Bot API)
- **Database**: PostgreSQL 16
- **Containerization**: Docker + Docker Compose

### AI & External APIs
- **Image Generation**: Kandinsky 3.0 (FusionBrain API)
- **Speech Recognition**: OpenAI Whisper ASR
- **Weather**: OpenWeatherMap API (опционально)
- **Currency**: Exchange Rate API (опционально)

### Frontend (Games)
- **HTML5 Canvas** - 60 FPS рендеринг
- **Telegram Web Apps SDK** - Нативная интеграция
- **GitHub Pages** - Бесплатный хостинг игр

## 📁 Структура проекта

```
allinonets/
├── src/
│   ├── bot.ts              # Главный файл бота
│   ├── main.ts             # Точка входа
│   ├── config.ts           # Конфигурация
│   ├── types.ts            # TypeScript типы
│   ├── db/                 # Работа с БД
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── users.ts
│   ├── middleware/         # Middleware
│   │   ├── antiSpam.ts
│   │   └── state.ts
│   ├── modules/            # Функциональные модули
│   │   ├── alarm/          # Напоминания
│   │   ├── currency/       # Курсы валют
│   │   ├── games/          # Игры
│   │   ├── imagegen/       # Генерация изображений
│   │   ├── jokes/          # Анекдоты
│   │   ├── menu.ts         # Главное меню
│   │   ├── movies/         # Фильмы
│   │   ├── video/          # Видео
│   │   └── weather/        # Погода
│   └── utils/              # Утилиты
│       └── logger.ts
├── games-deploy/           # HTML5 игры для GitHub Pages
│   ├── snake.html
│   ├── arkanoid.html
│   ├── pingpong.html
│   ├── flappybird.html
│   ├── dino.html
│   ├── tetris.html
│   └── spaceinvaders.html
├── docker-compose.yml      # Docker конфигурация
├── Dockerfile              # Образ бота
├── deno.json              # Deno конфигурация
└── .env                   # Переменные окружения
```

## 🔧 Установка и запуск

### Предварительные требования
- Docker и Docker Compose
- Git
- Telegram Bot Token (от @BotFather)

### Быстрый старт

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/yourusername/allinonebot.git
cd allinonebot
```

2. **Создайте `.env` файл**
```env
# Telegram
BOT_TOKEN=your_bot_token_here

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=allinone_bot
DATABASE_USER=allinone_user
DATABASE_PASSWORD=allinone_password

# AI APIs (опционально)
FUSIONBRAIN_API_KEY=your_fusionbrain_key
FUSIONBRAIN_SECRET_KEY=your_fusionbrain_secret

# Games
GAME_SERVER_URL=https://barkovsa.github.io/allinonebot

# Whisper ASR
WHISPER_API_URL=http://whisper:9000
```

3. **Запустите через Docker Compose**
```bash
docker compose up -d
```

4. **Проверьте логи**
```bash
docker logs allinone-bot -f
```

### Деплой игр на GitHub Pages

1. Создайте публичный репозиторий
2. Скопируйте файлы из `games-deploy/` в репозиторий
3. Включите GitHub Pages (Settings → Pages → main branch)
4. Обновите `GAME_SERVER_URL` в `.env`

## 🎮 Модули и функции

### Генерация изображений
```typescript
// modules/imagegen/handler.ts
- Kandinsky 3.0 API
- Async генерация с polling
- Защита от спама
- Автоматическая очистка старых генераций
```

### Игры
```typescript
// modules/games/handler.ts
- Telegram Web Apps интеграция
- 7 игр с темной темой
- Touch + Keyboard управление
- Haptic feedback
```

### Фильмы
```typescript
// modules/movies/handler.ts
- 7 жанров (боевики, комедии, фантастика, драмы, ужасы, детективы, аниме)
- 25+ проверенных фильмов
- Случайный выбор
- Подробные описания
```

### Валюты
```typescript
// modules/currency/handler.ts
- 5 фиат валют (USD, EUR, GBP, JPY, CNY)
- 8 криптовалют (BTC, ETH, BNB, SOL, XRP, DOGE, TON, TRX)
- Конвертация в рубли
- Актуальные курсы
```

### Анекдоты
```typescript
// modules/jokes/handler.ts
- 4 категории (общие, IT, из жизни, чёрный юмор)
- 20+ анекдотов
- Случайный выбор
```

### Напоминания
```typescript
// modules/alarm/handler.ts
- Голосовой ввод (Whisper ASR)
- Текстовый ввод
- Список напоминаний
- Удаление/перенос
```

### Погода
```typescript
// modules/weather/handler.ts
- По городу
- По геолокации
- Прогноз
- Обновление
```

## 📊 База данных

### Схема PostgreSQL
```sql
-- Пользователи
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  city VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timezone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Напоминания
CREATE TABLE alarms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 Безопасность

- Anti-spam middleware (3 запроса / 10 секунд)
- Rate limiting на генерацию изображений
- Валидация входных данных
- Защита от SQL injection (параметризованные запросы)
- Docker security best practices

## 📈 Производительность

- **Генерация изображений**: ~30 секунд
- **Ответ бота**: < 100ms
- **Игры**: 60 FPS на Canvas
- **База данных**: Connection pooling

## 🛣️ Roadmap

### В разработке
- [ ] Реальная генерация видео (FFmpeg)
- [ ] Калькулятор валют с кастомными суммами
- [ ] Больше игр (Snake multiplayer, Chess)
- [ ] Система достижений
- [ ] Leaderboards для игр

### Планируется
- [ ] AI чат-бот (GPT-4 / Claude)
- [ ] Генерация музыки
- [ ] QR-коды генератор
- [ ] URL shortener
- [ ] Переводчик

## 🤝 Участие в разработке

Приветствуются Pull Requests! Для крупных изменений сначала откройте Issue.

## 📝 Лицензия

MIT License

## 👨‍💻 Автор

Создано с ❤️ в 2025

---

⭐ Поставь звезду, если проект понравился!
