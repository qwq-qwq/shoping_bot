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
    // Проверяем, есть ли в браузере данные аутентификации
    if (browser._launcher && browser._launcher.options && browser._launcher.options.authenticate) {
      const auth = browser._launcher.options.authenticate;
      
      // Применяем аутентификацию к новой странице
      await page.authenticate(auth);
      logger.info('Applied proxy authentication to new page');
    }
  } catch (error) {
    logger.warn(`Failed to set up proxy authentication for page: ${error.message}`);
  }
}

module.exports = {
  setupProxyAuthForPage
};