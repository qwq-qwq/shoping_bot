const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Creates a delay using Promise
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Saves a screenshot from a Puppeteer page
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {string} filename - Base filename for the screenshot
 * @returns {Promise<string>} Path to the saved screenshot
 */
async function saveScreenshot(page, filename) {
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
    
    // Проверяем наличие кнопки добавления в корзину
    const addButton = await page.evaluate(() => {
      // Проверяем наличие кнопки перехода в корзину
      const cartButton = document.querySelector('a[data-qa-action="nav-to-cart"]');
      if (cartButton) {
        return false; // Товар уже в корзине
      }
      
      // Ищем кнопку "ДОДАТИ" с учетом всех возможных вариантов
      const buttons = Array.from(document.querySelectorAll('button, .zds-button'));
      const addButton = buttons.find(button => {
        const buttonText = button.textContent.trim().toUpperCase();
        return buttonText === 'ДОДАТИ' || buttonText === 'ADD' || buttonText === 'ADD TO CART';
      });
      return addButton ? true : false;
    });
    
    if (addButton) {
      logger.info('Found add to cart button, clicking it...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, .zds-button'));
        const addButton = buttons.find(button => {
          const buttonText = button.textContent.trim().toUpperCase();
          return buttonText === 'ДОДАТИ' || buttonText === 'ADD' || buttonText === 'ADD TO CART';
        });
        if (addButton) addButton.click();
      });
      // Ждем немного, чтобы размеры успели отобразиться
      await delay(2000);
    } else {
      logger.info('No add to cart button found - product might be out of stock or already in cart');
    }
    
    const timestamp = Date.now();
    const screenshotPath = path.join(screenshotDir, `${filename}-${timestamp}.png`);
    
    // Устанавливаем стандартный размер viewport, если он не определен
    await page.setViewport({
      width: 1920,
      height: 1080
    });
    
    // Получаем размеры видимой области страницы
    const viewport = await page.viewport();
    
    if (!viewport) {
      throw new Error('Failed to get viewport dimensions');
    }
    
    // Делаем скриншот только видимой части
    await page.screenshot({ 
      path: screenshotPath,
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
      }
    });
    
    logger.info(`Screenshot saved: ${filename}`);
    
    return screenshotPath;
  } catch (error) {
    logger.error(`Error saving screenshot: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveScreenshot
}; 