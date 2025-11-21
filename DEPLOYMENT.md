# 🚀 Deployment Guide

## Содержание
- [Локальная разработка](#локальная-разработка)
- [Продакшен на VPS](#продакшен-на-vps)
- [GitHub Pages (игры)](#github-pages-игры)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Локальная разработка

### Предварительные требования
```bash
# Установи Docker Desktop
# Windows: https://www.docker.com/products/docker-desktop
# macOS: https://www.docker.com/products/docker-desktop
# Linux: https://docs.docker.com/engine/install/

# Проверь установку
docker --version
docker compose version
```

### Запуск

1. **Клонирование**
```bash
git clone https://github.com/BarkovSA/allinonebot.git
cd allinonebot
```

2. **Создание .env**
```bash
# Скопируй пример
cp .env.example .env

# Редактируй .env
# - Добавь BOT_TOKEN от @BotFather
# - Добавь FUSIONBRAIN_API_KEY (опционально)
# - Измени пароли БД
```

3. **Запуск сервисов**
```bash
# Запуск всех контейнеров
docker compose up -d

# Проверка логов
docker logs allinone-bot -f

# Остановка
docker compose down

# Пересборка после изменений
docker compose up -d --build
```

### Структура контейнеров

```yaml
Services:
  - allinone-bot       # Основной бот (Deno)
  - allinone-postgres  # База данных (PostgreSQL 16)
  - allinone-whisper   # Распознавание речи (Whisper ASR)

Volumes:
  - postgres_data      # Постоянные данные БД

Networks:
  - allinone_network   # Внутренняя сеть
```

## Продакшен на VPS

### Подготовка сервера

1. **Требования**
- OS: Ubuntu 22.04 LTS (рекомендуется)
- RAM: минимум 2GB (4GB рекомендуется)
- Disk: 10GB свободного места
- Docker + Docker Compose

2. **Установка Docker**
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Проверка
docker --version
docker compose version
```

### Деплой

1. **Загрузка кода**
```bash
# SSH на сервер
ssh user@your-server-ip

# Клонирование
git clone https://github.com/BarkovSA/allinonebot.git
cd allinonebot
```

2. **Настройка окружения**
```bash
# Создание .env
nano .env

# Добавь:
BOT_TOKEN=your_production_token
FUSIONBRAIN_API_KEY=your_key
FUSIONBRAIN_SECRET_KEY=your_secret
DATABASE_PASSWORD=strong_random_password
GAME_SERVER_URL=https://barkovsa.github.io/allinonebot
WHISPER_API_URL=http://whisper:9000
```

3. **Запуск**
```bash
# Запуск в фоне
docker compose up -d

# Проверка
docker ps
docker logs allinone-bot --tail 50

# Автозапуск при перезагрузке (уже настроен в compose)
# restart: unless-stopped
```

### Обновление

```bash
# Остановка сервисов
docker compose down

# Обновление кода
git pull

# Пересборка и запуск
docker compose up -d --build

# Проверка логов
docker logs allinone-bot -f
```

### Мониторинг

```bash
# Просмотр логов
docker logs allinone-bot -f              # Бот
docker logs allinone-postgres -f          # БД
docker logs allinone-whisper -f           # Whisper

# Статус контейнеров
docker ps -a

# Использование ресурсов
docker stats

# Проверка здоровья
docker inspect allinone-bot | grep -i health
```

### Бэкап БД

```bash
# Создание бэкапа
docker exec allinone-postgres pg_dump -U allinone_user allinone_bot > backup_$(date +%Y%m%d).sql

# Восстановление
cat backup_20250121.sql | docker exec -i allinone-postgres psql -U allinone_user allinone_bot
```

## GitHub Pages (игры)

### Настройка репозитория

1. **Создание репозитория**
```bash
# Создай публичный репозиторий на GitHub
# Имя: allinonebot (или любое другое)
```

2. **Загрузка игр**
```bash
# Локально в games-deploy/
cd games-deploy
git init
git add .
git commit -m "Add all games"
git branch -M main
git remote add origin https://github.com/BarkovSA/allinonebot.git
git push -u origin main
```

3. **Включение GitHub Pages**
```
1. Открой Settings репозитория
2. Перейди в Pages
3. Source: Deploy from a branch
4. Branch: main / (root)
5. Save
6. Жди 1-2 минуты
```

4. **Обновление .env**
```env
GAME_SERVER_URL=https://BarkovSA.github.io/allinonebot
```

### Добавление новых игр

```bash
# Создай game.html в games-deploy/
cd games-deploy

# Добавь в handler.ts маршрут
# bot.callbackQuery("game_new", handleNewGame)

# Загрузи на GitHub
git add newgame.html
git commit -m "Add new game"
git push

# Обнови бота
docker compose restart bot
```

## Environment Variables

### Обязательные

```env
# Telegram Bot
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz  # От @BotFather

# Database
DATABASE_HOST=postgres           # В Docker: postgres, локально: localhost
DATABASE_PORT=5432
DATABASE_NAME=allinone_bot
DATABASE_USER=allinone_user
DATABASE_PASSWORD=your_password  # Смени на сложный
```

### Опциональные

```env
# AI Генерация изображений
FUSIONBRAIN_API_KEY=your_api_key
FUSIONBRAIN_SECRET_KEY=your_secret_key

# Игры
GAME_SERVER_URL=https://barkovsa.github.io/allinonebot  # GitHub Pages

# Whisper ASR
WHISPER_API_URL=http://whisper:9000  # Или внешний API

# Погода (если используешь внешний API)
OPENWEATHER_API_KEY=your_key

# Валюты (если используешь внешний API)
EXCHANGE_RATE_API_KEY=your_key
```

## Troubleshooting

### Бот не запускается

```bash
# Проверка логов
docker logs allinone-bot --tail 100

# Типичные проблемы:
# 1. Неверный BOT_TOKEN
#    Решение: Проверь токен в .env

# 2. БД не доступна
#    Решение: docker compose ps (проверь статус postgres)
#    Решение: docker logs allinone-postgres

# 3. Порты заняты
#    Решение: netstat -tulpn | grep 5432
#    Решение: Измени порты в docker-compose.yml
```

### Игры не загружаются

```bash
# 1. Проверь GAME_SERVER_URL в .env
echo $GAME_SERVER_URL

# 2. Проверь доступность GitHub Pages
curl https://barkovsa.github.io/allinonebot/snake.html

# 3. Проверь логи бота при открытии игры
docker logs allinone-bot -f
```

### Генерация изображений не работает

```bash
# 1. Проверь наличие ключей
docker exec allinone-bot printenv | grep FUSIONBRAIN

# 2. Проверь логи при генерации
docker logs allinone-bot -f

# 3. Проверь доступность API
curl https://api-key.fusionbrain.ai/
```

### БД не сохраняет данные

```bash
# 1. Проверь volume
docker volume ls | grep postgres

# 2. Проверь подключение
docker exec allinone-postgres psql -U allinone_user -d allinone_bot -c "SELECT * FROM users LIMIT 5;"

# 3. Пересоздание volume (УДАЛИТ ВСЕ ДАННЫЕ!)
docker compose down -v
docker compose up -d
```

### Whisper ASR не работает

```bash
# 1. Проверь контейнер
docker ps | grep whisper

# 2. Проверь логи
docker logs allinone-whisper

# 3. Тест API
curl http://localhost:9000/

# 4. Если не используешь - отключи в compose
# Закомментируй whisper service
```

## Полезные команды

```bash
# Полная очистка и пересборка
docker compose down -v --remove-orphans
docker system prune -a --volumes
docker compose up -d --build

# Проверка использования места
docker system df

# Экспорт/импорт образов
docker save allinonets-bot > bot-image.tar
docker load < bot-image.tar

# Запуск отдельного контейнера
docker compose up -d postgres
docker compose up -d bot

# Shell в контейнере
docker exec -it allinone-bot sh
docker exec -it allinone-postgres psql -U allinone_user
```

## Безопасность

### Продакшен чеклист

- [ ] Смени все дефолтные пароли в .env
- [ ] Используй сильные пароли (>20 символов)
- [ ] Не коммить .env в git (.gitignore)
- [ ] Настрой firewall (ufw)
- [ ] Регулярные бэкапы БД
- [ ] Обновляй Docker образы
- [ ] Мониторинг логов на ошибки
- [ ] HTTPS для внешних API

### Firewall (UFW)

```bash
# Базовая настройка
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp   # Если используешь nginx
sudo ufw allow 443/tcp
sudo ufw enable

# Проверка
sudo ufw status
```

---

📝 **Нужна помощь?** Открой [Issue](https://github.com/BarkovSA/allinonebot/issues)
