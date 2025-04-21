FROM node:18-alpine

# Устанавливаем зависимости для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn \
    udev \
    ttf-liberation \
    font-noto

# Устанавливаем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_DISABLE_SETUID_SANDBOX=true

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Создаем директории для скриншотов, логов и статуса
RUN mkdir -p screenshots logs status

# Указываем порт (если нужен для мониторинга)
# EXPOSE 3000

# Запускаем бота
CMD ["npm", "start"]
