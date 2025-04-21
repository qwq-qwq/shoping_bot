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
      const parts = line.trim().split('@');
      
      if (parts.length === 2) {
        // Формат с авторизацией: username:password@host:port
        const [auth, host] = parts;
        const [username, password] = auth.split(':');
        return { host, username, password };
      } else {
        // Формат без авторизации: host:port
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
  
  logger.info(`Using proxy: ${proxy.host}`);
  
  const args = options.args || [];
  
  // Добавляем аргумент прокси
  args.push(`--proxy-server=${proxy.host}`);
  
  // Применяем авторизацию, если есть
  if (proxy.username && proxy.password) {
    options.proxyAuthCredentials = {
      username: proxy.username,
      password: proxy.password
    };
  }
  
  return {
    ...options,
    args
  };
}

module.exports = {
  loadProxies,
  getRandomProxy,
  applyProxy
};