# Отладка и устранение неполадок

В этом документе описаны распространенные проблемы, с которыми вы можете столкнуться при использовании Shopping Bot, и способы их решения.

## Общие проблемы

### Бот не запускается

**Симптомы**: Ошибка при запуске бота, процесс завершается сразу после запуска.

**Возможные причины и решения**:

1. **Отсутствуют зависимости**
   ```
   Error: Cannot find module 'puppeteer'
   ```
   Решение: Установите зависимости
   ```bash
   npm install
   ```

2. **Неправильная конфигурация в .env**
   ```
   Error: Missing required environment variables
   ```
   Решение: Проверьте файл `.env` и убедитесь, что все необходимые переменные заданы.

3. **Проблемы с установкой Puppeteer**
   ```
   Error: Failed to launch the browser process
   ```
   Решение: Установите необходимые системные зависимости для Puppeteer
   ```bash
   # Для Ubuntu/Debian
   sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
   
   # Для macOS
   brew install --cask chromium
   ```

### Бот не находит продукты

**Симптомы**: Бот запускается, но не может найти продукты или всегда сообщает, что продукты недоступны.

**Возможные причины и решения**:

1. **Неправильный productId**
   
   Решение: Проверьте URL продукта и убедитесь, что productId указан правильно. Формат должен быть:
   ```
   ua/uk/название-продукта-p12345678
   ```

2. **Изменилась структура сайта**
   
   Решение: Если вы не используете AI-анализ, структура сайта могла измениться. Включите AI-анализ, добавив API ключ OpenAI в `.env`.

3. **Проблемы с cookies**
   
   Решение: Проверьте, что селектор для принятия cookies в конфигурации магазина актуален.

### Проблемы с AI-анализом

**Симптомы**: Бот не может правильно анализировать скриншоты или возвращает ошибки API.

**Возможные причины и решения**:

1. **Неправильный API ключ**
   ```
   Error: Incorrect API key provided
   ```
   Решение: Проверьте API ключ в файле `.env`.

2. **Превышен лимит запросов**
   ```
   Error: Rate limit exceeded
   ```
   Решение: Уменьшите частоту проверок или обновите тарифный план OpenAI.

3. **Проблемы с форматом скриншота**
   ```
   Error: Invalid image format
   ```
   Решение: Убедитесь, что скриншоты сохраняются в формате PNG.

## Отладка с помощью логов

### Просмотр логов

Логи сохраняются в директории `logs`:
- `combined.log` - все логи
- `error.log` - только ошибки

Для просмотра последних логов:
```bash
# Последние 50 строк общих логов
tail -n 50 logs/combined.log

# Последние 50 строк ошибок
tail -n 50 logs/error.log

# Отслеживание логов в реальном времени
tail -f logs/combined.log
```

### Увеличение уровня логирования

Для более подробного логирования можно изменить уровень логирования в файле `src/utils/logger.js`:

```javascript
const logger = winston.createLogger({
  level: 'debug', // Изменить с 'info' на 'debug'
  // ...
});
```

## Отладка с помощью скриншотов

Скриншоты сохраняются в директории `screenshots` с временными метками и описательными именами:

- `page-loaded-{product-name}-{timestamp}.png` - страница после загрузки
- `not-product-page-{shop}-{timestamp}.png` - страница не распознана как страница продукта
- `error-{product-name}-{timestamp}.png` - ошибка при проверке продукта
- `available-{product-name}-{timestamp}.png` - продукт доступен

Анализируя эти скриншоты, вы можете понять, почему бот не может правильно определить доступность продукта.

## Отладка в режиме разработки

Для отладки в режиме разработки:

1. Отключите headless режим в `.env`:
   ```
   HEADLESS=false
   ```

2. Запустите бот в режиме разработки:
   ```bash
   npm run dev
   ```

3. Наблюдайте за браузером, чтобы увидеть, как бот взаимодействует с сайтом.

## Отладка AI-анализа

Для отладки AI-анализа:

1. Проверьте скриншоты, которые отправляются в API.
2. Проверьте логи для просмотра запросов и ответов API.
3. Используйте мок-анализ для тестирования без API:
   ```
   # Не указывайте OPENAI_API_KEY в .env для использования мок-анализа
   ```

## Распространенные ошибки и их решения

### Error: Protocol error (Runtime.callFunctionOn): Target closed

**Причина**: Браузер был закрыт во время выполнения операции.

**Решение**: Увеличьте таймауты и проверьте, что браузер не закрывается преждевременно.

```javascript
// В productService.js
await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 }); // Увеличьте таймаут до 60 секунд
```

### Error: Navigation timeout exceeded

**Причина**: Страница загружается слишком долго.

**Решение**: Увеличьте таймаут навигации и проверьте интернет-соединение.

```javascript
// В productService.js
await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 }); // Увеличьте таймаут до 60 секунд
```

### Error: Evaluation failed: DOMException: Failed to execute 'querySelector' on 'Document'

**Причина**: Неправильный селектор или структура страницы изменилась.

**Решение**: Обновите селекторы или используйте AI-анализ.

### Error: net::ERR_PROXY_CONNECTION_FAILED

**Причина**: Проблемы с прокси или блокировка со стороны сайта.

**Решение**: Используйте прокси или добавьте задержки между запросами.

```javascript
// В monitoringService.js
// Добавьте задержку между проверками продуктов
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
for (const item of config.targetItems) {
  const result = await checkProductAvailability(browser, item);
  await delay(5000); // Задержка 5 секунд между запросами
  // ...
}
```

## Когда обращаться за помощью

Если вы испробовали все вышеперечисленные решения и проблема не устранена, соберите следующую информацию для обращения за помощью:

1. Логи ошибок из `logs/error.log`
2. Скриншоты, связанные с проблемой
3. Версии Node.js и npm:
   ```bash
   node -v
   npm -v
   ```
4. Операционная система
5. Конфигурация продукта, с которым возникла проблема (без учетных данных) 