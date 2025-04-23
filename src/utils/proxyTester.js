/**
 * Утилита для проверки работоспособности прокси
 */
const puppeteer = require('puppeteer');
const { applyProxy } = require('./rotateProxy');
const logger = require('./logger');

/**
 * Проверяет работоспособность прокси
 * @returns {Promise<boolean>} Результат проверки
 */
async function testProxy() {
  let browser = null;
  
  try {
    logger.info('Starting proxy test...');
    
    // Базовые опции запуска браузера
    let launchOptions = { 
      headless: false, // Показываем браузер для отладки
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,800',
        '--disable-features=IsolateOrigins',
        '--disable-web-security',
        '--disable-features=NetworkService',
        '--enable-features=NetworkServiceInProcess'
      ],
      ignoreHTTPSErrors: true,
      timeout: 60000
    };
    
    // Применяем прокси
    launchOptions = await applyProxy(launchOptions);
    
    if (!launchOptions._proxyInfo) {
      logger.error('No proxy configuration found');
      return false;
    }
    
    // Выводим информацию о прокси
    logger.info(`Testing proxy: ${launchOptions._proxyInfo.url}`);
    
    // Запускаем браузер
    browser = await puppeteer.launch(launchOptions);
    
    // Проверяем работу прокси
    const page = await browser.newPage();
    
    // Если есть аутентификация, применяем ее
    if (launchOptions.authenticate) {
      await page.authenticate(launchOptions.authenticate);
      logger.info('Proxy authentication applied');
    }
    
    // Задаем заголовки для маскировки
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    });
    
    // Проверяем доступ к сайту
    logger.info('Checking proxy with ipinfo.io...');
    await page.goto('https://ipinfo.io/json', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Получаем информацию об IP
    const ipInfo = await page.evaluate(() => {
      try {
        return JSON.parse(document.body.textContent);
      } catch (e) {
        return null;
      }
    });
    
    if (ipInfo && ipInfo.ip) {
      logger.info(`Proxy test successful. IP: ${ipInfo.ip}, Location: ${ipInfo.country}, ${ipInfo.city}`);
      
      // Проверяем целевой сайт
      logger.info('Checking target website...');
      await page.goto('https://www.massimodutti.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const title = await page.title();
      logger.info(`Successfully accessed target website. Page title: ${title}`);
      
      // Делаем скриншот
      await page.screenshot({ path: 'proxy-test-result.png' });
      logger.info('Screenshot saved to proxy-test-result.png');
      
      return true;
    } else {
      logger.error('Failed to get IP info. Proxy may not be working correctly.');
      
      // Пробуем прямой запрос для диагностики
      await page.goto('https://www.example.com', { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: 'proxy-test-failed.png' });
      logger.info('Error screenshot saved to proxy-test-failed.png');
      
      return false;
    }
  } catch (error) {
    logger.error(`Proxy test failed: ${error.message}`);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Test browser closed');
    }
  }
}

/**
 * Основная функция для запуска теста
 */
async function runProxyTest() {
  try {
    const result = await testProxy();
    console.log(`\nProxy test ${result ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    if (!result) {
      console.log('\nПроблемы с прокси. Рекомендации:');
      console.log('1. Проверьте правильность учетных данных прокси');
      console.log('2. Убедитесь, что прокси-сервер работает');
      console.log('3. Попробуйте другой прокси-сервер или другой протокол (HTTP/SOCKS5)');
      console.log('4. Проверьте, не блокирует ли целевой сайт прокси');
    }
    
    process.exit(result ? 0 : 1);
  } catch (error) {
    console.error('Error running proxy test:', error);
    process.exit(1);
  }
}

// Запускаем тест, если файл запущен напрямую
if (require.main === module) {
  runProxyTest();
} else {
  // Экспортируем функцию для использования в других файлах
  module.exports = {
    testProxy
  };
}
