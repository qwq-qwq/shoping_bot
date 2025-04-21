/**
 * Утилиты для обхода защиты от ботов
 */

// Список реалистичных User-Agent
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
];

/**
 * Создает случайную задержку
 * @param {number} min - Минимальная задержка в миллисекундах
 * @param {number} max - Максимальная задержка в миллисекундах
 * @returns {Promise<void>}
 */
const randomDelay = (min = 500, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Имитирует человеческие движения при клике
 * @param {import('puppeteer').Page} page - Объект Puppeteer страницы
 * @param {string} selector - CSS селектор элемента
 * @returns {Promise<void>}
 */
async function humanClick(page, selector) {
  // Находим элемент
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element with selector "${selector}" not found`);
  }

  // Получаем размеры и позицию элемента
  const box = await element.boundingBox();
  
  // Расчет случайной точки внутри элемента
  const x = box.x + Math.random() * box.width;
  const y = box.y + Math.random() * box.height;

  // Сначала перемещаем мышь к элементу
  await page.mouse.move(x, y, { steps: 10 });
  
  // Делаем небольшую паузу перед кликом
  await randomDelay(200, 500);
  
  // Затем кликаем
  await page.mouse.down();
  await randomDelay(50, 150);
  await page.mouse.up();
  
  // Еще одна случайная задержка
  await randomDelay();
  
  return true;
}

/**
 * Имитирует человеческий ввод текста
 * @param {import('puppeteer').Page} page - Объект Puppeteer страницы
 * @param {string} selector - CSS селектор элемента
 * @param {string} text - Текст для ввода
 * @returns {Promise<void>}
 */
async function humanType(page, selector, text) {
  // Кликаем на поле ввода
  await humanClick(page, selector);
  
  // Вводим текст с случайными задержками между символами
  for (const char of text) {
    await page.keyboard.type(char);
    await randomDelay(30, 150);
  }
  
  // Задержка после ввода
  await randomDelay();
}

/**
 * Имитирует случайный скролл страницы
 * @param {import('puppeteer').Page} page - Объект Puppeteer страницы
 * @returns {Promise<void>}
 */
async function randomScroll(page) {
  // Получаем высоту страницы
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  
  // Определяем случайную точку для скролла
  const scrollTarget = Math.floor(Math.random() * bodyHeight);
  
  // Плавный скролл с шагами
  await page.evaluate((target) => {
    const duration = 1000 + Math.random() * 1000;
    const startTime = Date.now();
    const startScrollY = window.scrollY;
    
    function easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    function scroll() {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        const easedProgress = easeInOutQuad(progress);
        const scrollY = startScrollY + (target - startScrollY) * easedProgress;
        window.scrollTo(0, scrollY);
        requestAnimationFrame(scroll);
      } else {
        window.scrollTo(0, target);
      }
    }
    
    scroll();
  }, scrollTarget);
  
  // Дожидаемся завершения скролла и добавляем паузу
  await randomDelay(1000, 3000);
}

/**
 * Имитирует просмотр страницы человеком
 * @param {import('puppeteer').Page} page - Объект Puppeteer страницы
 * @returns {Promise<void>}
 */
async function simulateHumanBrowsing(page) {
  // Случайное количество скроллов
  const scrollCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < scrollCount; i++) {
    await randomScroll(page);
  }
  
  // Иногда двигаем мышью по странице
  if (Math.random() > 0.5) {
    const viewportWidth = page.viewport().width;
    const viewportHeight = page.viewport().height;
    
    const randomX = Math.floor(Math.random() * viewportWidth);
    const randomY = Math.floor(Math.random() * viewportHeight);
    
    await page.mouse.move(randomX, randomY, { steps: 5 });
  }
  
  // Финальная задержка
  await randomDelay();
}

/**
 * Получает случайный User-Agent из списка
 * @returns {string} Случайный User-Agent
 */
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Настраивает браузер для обхода обнаружения
 * @param {import('puppeteer').Page} page - Объект Puppeteer страницы
 * @returns {Promise<void>}
 */
async function setupAntiDetection(page) {
  const userAgent = getRandomUserAgent();
  
  // Устанавливаем User-Agent
  await page.setUserAgent(userAgent);
  
  // Добавляем WebGL fingerprint randomization
  await page.evaluateOnNewDocument(() => {
    // Подмена WebGL fingerprint
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel Iris Pro Graphics';
      }
      return getParameter.apply(this, arguments);
    };
    
    // Скрытие работы в режиме Headless
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
    
    // Скрытие присутствия Automation
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // Добавление fake перемещения мыши
    const originalQuery = document.querySelector;
    document.querySelector = function(...args) {
      const result = originalQuery.apply(this, args);
      // Симуляция перемещений мыши для некоторых запросов селекторов
      if (args[0] && args[0].includes('.product-')) {
        setTimeout(() => {
          const event = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
          });
          document.dispatchEvent(event);
        }, Math.random() * 100);
      }
      return result;
    };
  });
}

module.exports = {
  randomDelay,
  humanClick,
  humanType,
  randomScroll,
  simulateHumanBrowsing,
  getRandomUserAgent,
  setupAntiDetection
};