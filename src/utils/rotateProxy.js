/**
 * Утилиты для ротации прокси-серверов (если понадобятся в будущем)
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

// Путь к файлу с прокси (если будет добавлен)
const proxyListPath = path.join(process.cwd(), 'config', 'proxies.txt');

// Список прокси-серверов (можно будет перенести в файл)
const defaultProxies = [
  // Формат: {host: 'ip:port', username: 'user', password: 'pass'}
  // Нужно будет добавить действующие прокси
];

/**
 * Загружает список прокси из файла
 * @returns {Promise<Array>} Список прокси-серверов
 */
async function loadProxies() {
  try {
    const fileExists = await fs.access(proxyListPath)
      .then(() => true)
      .catch(() => false);
    
    if (!fileExists) {
      logger.info('Proxy list file not found, using default proxies');
      return defaultProxies;
    }
    
    const content = await fs.readFile(proxyListPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const proxies = lines.map(line => {
      const parts = line.trim().split(' ');
      
      if (parts.length === 2) {
        // Формат: ip:port username:password (ProxySeller format)
        const [hostPart, authPart] = parts;
        const [username, password] = authPart.split(':');
        return { host: hostPart, username, password };
      } else if (line.includes('@')) {
        // Стандартный формат: username:password@host:port
        const [auth, host] = line.split('@');
        const [username, password] = auth.split(':');
        return { host, username, password };
      } else {
        // Просто адрес: host:port
        return { host: line.trim() };
      }
    });
    
    logger.info(`Loaded ${proxies.length} proxies from file`);
    return proxies;
  } catch (error) {
    logger.error(`Error loading proxies: ${error.message}`);
    return defaultProxies;
  }
}

/**
 * Получает случайный прокси из списка
 * @returns {Promise<Object|null>} Объект прокси или null
 */
async function getRandomProxy() {
  const proxies = await loadProxies();
  
  if (proxies.length === 0) {
    return null;
  }
  
  return proxies[Math.floor(Math.random() * proxies.length)];
}

/**
 * Применяет прокси к браузеру Puppeteer
 * @param {Object} options - Опции запуска браузера
 * @returns {Promise<Object>} Обновленные опции с прокси
 */
async function applyProxy(options) {
  const proxy = await getRandomProxy();
  
  if (!proxy) {
    logger.info('No proxies available, using direct connection');
    return options;
  }
  
  // Log using masked password for security
  const maskedPassword = proxy.password ? '********' : 'none';
  logger.info(`Using proxy: ${proxy.host} with auth: ${proxy.username || 'none'}:${maskedPassword}`);
  
  const args = options.args || [];
  
  // Добавляем аргумент прокси
  args.push(`--proxy-server=${proxy.host}`);
  
  // Для ProxySeller и подобных прокси нужен другой способ аутентификации
  // Возвращаем обновленные опции
  return {
    ...options,
    args,
    // Используем интерфейс аутентификации Puppeteer для передачи учетных данных
    // когда прокси запросит аутентификацию
    authenticate: proxy.username && proxy.password ? {
      username: proxy.username,
      password: proxy.password
    } : undefined
  };
}

module.exports = {
  loadProxies,
  getRandomProxy,
  applyProxy
};