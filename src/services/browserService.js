const puppeteer = require('puppeteer');
const config = require('../../config/default');
const logger = require('../utils/logger');
// Используем упрощенную версию
const { getRandomUserAgent } = require('../utils/antiDetectionUtils.simple');
const { applyProxy } = require('../utils/rotateProxy'); // Раскомментировать, если нужны прокси

/**
 * Launches a Puppeteer browser instance
 * @returns {Promise<import('puppeteer').Browser>} Puppeteer browser instance
 */
async function launchBrowser() {
  logger.info('Launching browser...');
  
  try {
    // Базовые опции запуска браузера с оптимизированными настройками
    let launchOptions = { 
      headless: config.browser.headless, 
      defaultViewport: { width: 1280, height: 800 }, 
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--window-size=1280,800',
        `--user-agent=${getRandomUserAgent()}`,
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--lang=ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        '--js-flags=--max_old_space_size=512',
        '--proxy-bypass-list=<-loopback>',
        // // Дополнительные аргументы для улучшения работы с прокси
        // '--disable-features=NetworkService',
        // '--enable-features=NetworkServiceInProcess',
        // '--disable-blink-features=AutomationControlled',
        // '--enable-logging',
        // '--log-level=0',
        // '--disable-sync',
        // '--metrics-recording-only',
        // '--disable-hang-monitor',
        // '--disable-breakpad',
        // '--disable-infobars',
        // '--disable-notifications',
        // '--disable-print-preview',
        // '--disable-speech-api',
        // '--no-first-run',
        // '--use-fake-ui-for-media-stream',
        // '--use-mock-keychain'
      ],
      ignoreHTTPSErrors: true,
      timeout:
       180000,
      protocolTimeout: 480000, // 8 минут
      // Добавляем необходимые настройки для предотвращения обнаружения автоматизации
      userDataDir: './chrome-user-data'
    };
    
    // Применяем прокси, если нужно
    launchOptions = await applyProxy(launchOptions);
    
    // Запускаем браузер с подготовленными опциями
    const browser = await puppeteer.launch(launchOptions);
    
    // Логируем информацию о прокси, если он был применен
    if (launchOptions._proxyInfo) {
      logger.info(`Browser started with proxy: ${launchOptions._proxyInfo.url}`);
      logger.info(`Proxy protocol: ${launchOptions._proxyInfo.protocol}, Host: ${launchOptions._proxyInfo.host}:${launchOptions._proxyInfo.port}`);
      
      // Сохраняем опции запуска как свойство браузера для доступа к ним из других функций
      browser._options = launchOptions;
      
      // Для прокси с аутентификацией, настраиваем её для всех текущих страниц
      if (launchOptions.authenticate) {
        try {
          // Получаем все открытые страницы
          const pages = await browser.pages();
          
          // Применяем аутентификацию к каждой странице
          for (const page of pages) {
            await page.authenticate(launchOptions.authenticate);
            
            // Добавляем антиобнаружение
            await page.evaluateOnNewDocument(() => {
              Object.defineProperty(navigator, 'webdriver', { get: () => false });
              
              // Подменяем userAgent 
              const newUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
              Object.defineProperty(navigator, 'userAgent', { get: () => newUserAgent });
            });
          }
          
          logger.info(`Proxy authentication set up for ${pages.length} page(s)`);
        } catch (authError) {
          logger.error(`Error setting up proxy authentication: ${authError.message}`);
        }
      }
    }
    
    // Запускаем таймер для обнаружения зависаний
    const timeoutId = setTimeout(() => {
      try {
        logger.error('Browser launch timeout detected, trying to force close');
        browser.close().catch(e => logger.error(`Error closing browser: ${e.message}`));
      } catch (e) {
        logger.error(`Error in timeout handler: ${e.message}`);
      }
    }, 120000); // 2 минуты таймаут
    
    // Отключаем таймер, если браузер успешно запустился
    clearTimeout(timeoutId);
    
    logger.info('Browser launched successfully');
    return browser;
  } catch (error) {
    logger.error(`Failed to launch browser: ${error.message}`);
    
    // Пытаемся убить зависшие процессы браузера
    try {
      require('child_process').execSync('pkill -f chromium');
    } catch (e) {
      // Игнорируем ошибки здесь
    }
    
    throw error;
  }
}

/**
 * Accepts cookies on a page if the consent banner is present
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {Object} shop - Shop configuration
 * @returns {Promise<void>}
 */
async function acceptCookies(page, shop) {
  try {
    // Список возможных селекторов для кнопок подтверждения cookie
    const possibleSelectors = [
      shop.cookieConsent.selector,
      '#onetrust-accept-btn-handler',
      '.cookie-setting-link',
      'button[aria-label="Принять все файлы cookie"]',
      'button[data-testid="cookie-accept-all"]',
      '.cookie-banner__button',
      'button.cookie-button',
      '.js-cookie-accept',
      '.js-accept-cookies',
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      'button:has-text("Принять")',
      'button:has-text("Принять все")'
    ];

    for (const selector of possibleSelectors) {
      if (!selector) continue;
      
      const isVisible = await page.waitForSelector(selector, { 
        visible: true, 
        timeout: 5000 
      }).catch(() => false);
      
      if (isVisible) {
        // Используем evaluate для более надежного клика
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) element.click();
        }, selector);
        
        logger.info(`Cookies accepted using selector: ${selector}`);
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // На некоторых сайтах может быть несколько слоев уведомлений о cookie
    const secondLayerSelector = 'button:has-text("Подтвердить"), button:has-text("Confirm")';
    const hasSecondLayer = await page.waitForSelector(secondLayerSelector, { 
      visible: true, 
      timeout: 3000 
    }).catch(() => false);
    
    if (hasSecondLayer) {
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) element.click();
      }, secondLayerSelector);
      
      logger.info('Second layer cookies confirmation clicked');
      await page.waitForTimeout(1500);
    }
    
  } catch (error) {
    logger.info('Cookie banner not found or already accepted');
  }
}

/**
 * Logs in to a shop
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {string} shopName - Name of the shop
 * @returns {Promise<boolean>} Whether login was successful
 */
async function login(page, shopName) {
  const shopConfig = config.shops.find(s => s.name === shopName);
  const credentials = shopConfig.credentials;
  
  logger.info(`Logging in to ${shopName}...`);
  
  try {
    // Navigate to login page
    await page.goto(`${shopConfig.url}${shopConfig.locale}/logon`, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Accept cookies if they appear
    await acceptCookies(page, shopConfig);
    
    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('.account-info') || 
             !!document.querySelector('.user-info');
    });
    
    if (isLoggedIn) {
      logger.info('Already logged in');
      return true;
    }
    
    // Enter email and proceed to password
    await page.type('input[name="logonId"], input[name="email"]', credentials.username);
    await Promise.all([
      page.click('button[type="submit"], .logon-continue-button'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);
    
    // Enter password
    await page.waitForSelector('input[name="password"], input[type="password"]', { visible: true });
    await page.type('input[name="password"], input[type="password"]', credentials.password);
    
    // Submit form
    await Promise.all([
      page.click('button[type="submit"], .login-button'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);
    
    // Check if login was successful
    const loginSuccessful = await page.evaluate(() => {
      return !!document.querySelector('.account-info') || 
             !!document.querySelector('.user-info');
    });
    
    if (loginSuccessful) {
      logger.info(`Login to ${shopName} successful`);
      return true;
    } else {
      logger.error(`Failed to log in to ${shopName}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error during login to ${shopName}: ${error.message}`);
    return false;
  }
}

module.exports = {
  launchBrowser,
  acceptCookies,
  login
}; 