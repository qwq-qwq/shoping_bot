/**
 * Упрощенная версия анти-детект скриптов для предотвращения таймаутов
 */

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
 * Получает случайный User-Agent из списка
 * @returns {string} Случайный User-Agent
 */
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

module.exports = {
  randomDelay,
  getRandomUserAgent
};