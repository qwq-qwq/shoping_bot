/**
 * Утилиты для проверки доступности сайтов и обработки блокировок
 */
const logger = require('./logger');

/**
 * Проверяет доступность сайта и наличие блокировок
 * @param {import('puppeteer').Browser} browser - Puppeteer browser instance
 * @param {string} shopUrl - URL магазина для проверки
 * @param {string} shopName - Название магазина (для логов)
 * @returns {Promise<{available: boolean, reason: string|null}>} Результат проверки
 */
async function checkSiteAvailability(browser, shopUrl, shopName) {
  const page = await browser.newPage();
  
  try {
    // Устанавливаем базовый user-agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
    
    // Устанавливаем заголовки, имитирующие обычный браузер
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'https://www.google.com/',
      'Sec-Fetch-Mode': 'navigate'
    });
    
    logger.info(`Checking availability of ${shopName} at ${shopUrl}`);
    
    // Пытаемся открыть домашнюю страницу магазина
    const response = await page.goto(shopUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Проверяем HTTP статус
    const status = response.status();
    if (status >= 400) {
      logger.warn(`${shopName} returned HTTP status ${status}`);
      return {
        available: false, 
        reason: `HTTP ошибка ${status}`
      };
    }
    
    // Проверяем наличие сообщений о блокировке
    const isBlocked = await page.evaluate(() => {
      const bodyText = document.body.textContent.toLowerCase();
      const accessDeniedTexts = [
        'access denied',
        'permission to access',
        'отказано в доступе',
        'доступ запрещен',
        'access forbidden',
        'доступ заблокирован',
        'akamai',
        'captcha',
        'robot',
        'bot detection'
      ];
      
      return accessDeniedTexts.some(text => bodyText.includes(text));
    });
    
    if (isBlocked) {
      logger.warn(`${shopName} blocked access - detected block page`);
      
      // Сохраняем скриншот страницы блокировки
      const timestamp = Date.now();
      await page.screenshot({ 
        path: `./screenshots/blocked-${shopName}-${timestamp}.png`, 
        fullPage: false 
      });
      
      return {
        available: false,
        reason: 'Сайт заблокировал доступ (обнаружена защита от ботов)'
      };
    }
    
    // Проверяем, похожа ли страница на настоящую главную страницу магазина
    const isRealPage = await page.evaluate((name) => {
      // Проверяем наличие элементов, которые обычно есть на главной странице магазина
      const hasLogo = !!document.querySelector('header img') || 
                     !!document.querySelector('.logo') || 
                     !!document.querySelector('[class*="logo"]');
                     
      const hasMenu = !!document.querySelector('nav') || 
                    !!document.querySelector('menu') || 
                    !!document.querySelector('.menu');
                    
      const hasSearchBox = !!document.querySelector('input[type="search"]') || 
                         !!document.querySelector('[class*="search"]');
      
      return {
        isReal: hasLogo && (hasMenu || hasSearchBox),
        elements: { hasLogo, hasMenu, hasSearchBox }
      };
    }, shopName);
    
    if (!isRealPage.isReal) {
      logger.warn(`${shopName} may be showing a different page than expected:`, isRealPage.elements);
      
      // Сохраняем скриншот подозрительной страницы
      const timestamp = Date.now();
      await page.screenshot({ 
        path: `./screenshots/suspicious-${shopName}-${timestamp}.png`, 
        fullPage: false 
      });
      
      return {
        available: false,
        reason: 'Страница не похожа на главную страницу магазина'
      };
    }
    
    logger.info(`${shopName} is available and accessible`);
    return {
      available: true,
      reason: null
    };
    
  } catch (error) {
    logger.error(`Error checking ${shopName} availability: ${error.message}`);
    return {
      available: false,
      reason: `Ошибка при проверке: ${error.message}`
    };
  } finally {
    await page.close();
  }
}

module.exports = {
  checkSiteAvailability
};