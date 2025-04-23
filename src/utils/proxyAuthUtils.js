/**
 * Утилиты для настройки прокси-аутентификации для новых страниц
 */
const logger = require('./logger');

/**
 * Настраивает аутентификацию прокси для новой страницы
 * @param {import('puppeteer').Browser} browser - Браузер Puppeteer
 * @param {import('puppeteer').Page} page - Новая страница
 */
async function setupProxyAuthForPage(browser, page) {
  try {
    // Получаем данные аутентификации из разных возможных мест
    let auth = null;
    
    // Сначала проверяем в browser._launcher.options
    if (browser._launcher && browser._launcher.options && browser._launcher.options.authenticate) {
      auth = browser._launcher.options.authenticate;
    } 
    // Потом проверяем в browser._options
    else if (browser._options && browser._options.authenticate) {
      auth = browser._options.authenticate;
    }
    // Проверяем ещё один возможный вариант
    else if (browser._process && browser._process._options && browser._process._options.authenticate) {
      auth = browser._process._options.authenticate;
    }
    
    // Применяем аутентификацию, если нашли ее
    if (auth && auth.username && auth.password) {
      // Применяем аутентификацию к новой странице
      await page.authenticate({
        username: auth.username,
        password: auth.password
      });
      logger.info('Proxy authentication applied to new page');
      
      // Для отладки добавим вывод информации о примененной аутентификации
      logger.info(`Auth details: username=${auth.username}, password=***`);
    } else {
      logger.info('No authentication data found for proxy');
    }
    
    // Обновленные заголовки для более реалистичного поведения
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'sec-ch-ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Расширенные меры против обнаружения автоматизации
    await page.evaluateOnNewDocument(() => {
      // Скрываем факт автоматизации
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Подменяем userAgent для большей маскировки
      const newUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
      Object.defineProperty(navigator, 'userAgent', { get: () => newUserAgent });
      
      // Добавляем поддельные плагины
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
          ];
        }
      });
      
      // Эмуляция языков
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ru-RU', 'ru', 'en-US', 'en']
      });
    });
    
    logger.info('Enhanced page settings for proxy usage');
  } catch (error) {
    logger.warn(`Failed to set up enhanced page settings: ${error.message}`);
  }
}

module.exports = {
  setupProxyAuthForPage
};