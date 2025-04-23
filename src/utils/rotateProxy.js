/**
 * Утилиты для ротации прокси-серверов
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

// Путь к файлу с прокси
const proxyListPath = path.join(process.cwd(), 'config', 'proxies.txt');

// Список прокси-серверов по умолчанию
const defaultProxies = [
  // Добавим прямо здесь наш прокси для гарантии
  // {
  //   protocol: 'http',
  //   host: '',
  //   port: '50100',
  //   username: '',
  //   password: ''
  // }
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
    
    const proxies = [];
    
    for (const line of lines) {
      try {
        // ProxySeller format: IP:PORT USERNAME:PASSWORD
        if (line.includes(' ')) {
          const [hostPart, authPart] = line.trim().split(' ');
          const [host, port] = hostPart.split(':');
          const [username, password] = authPart.split(':');
          
          proxies.push({
            protocol: 'http', // Default to HTTP
            host,
            port,
            username,
            password
          });
        }
        // Standard format: username:password@host:port
        else if (line.includes('@')) {
          const [auth, hostPort] = line.split('@');
          const [host, port] = hostPort.split(':');
          const [username, password] = auth.split(':');
          
          proxies.push({
            protocol: 'http',
            host,
            port,
            username,
            password
          });
        }
        // Protocol format: protocol://host:port or protocol://username:password@host:port
        else if (line.includes('://')) {
          const [protocol, rest] = line.split('://');
          
          if (rest.includes('@')) {
            const [auth, hostPort] = rest.split('@');
            const [host, port] = hostPort.split(':');
            const [username, password] = auth.split(':');
            
            proxies.push({
              protocol,
              host,
              port,
              username,
              password
            });
          } else {
            const [host, port] = rest.split(':');
            
            proxies.push({
              protocol,
              host,
              port
            });
          }
        }
        // Simple format: host:port
        else {
          const [host, port] = line.trim().split(':');
          
          proxies.push({
            protocol: 'http',
            host,
            port
          });
        }
      } catch (parseError) {
        logger.error(`Error parsing proxy line "${line}": ${parseError.message}`);
      }
    }
    
    logger.info(`Loaded ${proxies.length} proxies from file`);
    return proxies.length > 0 ? proxies : defaultProxies;
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
 * Преобразует объект прокси в строку URL
 * @param {Object} proxy - Объект с настройками прокси
 * @returns {string} URL прокси-сервера
 */
function getProxyUrl(proxy) {
  if (proxy.username && proxy.password) {
    return `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
  }
  return `${proxy.protocol}://${proxy.host}:${proxy.port}`;
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
  logger.info(`Using proxy: ${proxy.protocol}://${proxy.host}:${proxy.port} with auth: ${proxy.username || 'none'}:${maskedPassword}`);
  
  const args = options.args || [];
  
  // Вместо передачи аутентификации через Puppeteer API,
  // указываем учетные данные прямо в URL прокси
  const proxyUrl = getProxyUrl(proxy);
  logger.info(`Proxy URL (auth masked): ${proxyUrl.replace(proxy.password, '********')}`);
  
  // Сохраняем информацию о прокси в лог-файл для диагностики
  try {
    const debugInfo = `
Proxy Debug Info:
----------------
Timestamp: ${new Date().toISOString()}
Protocol: ${proxy.protocol}
Host: ${proxy.host}
Port: ${proxy.port}
Username: ${proxy.username}
Password: ${maskedPassword}
Full URL: ${proxyUrl.replace(proxy.password, '********')}
----------------
`;
    fs.writeFile(path.join(process.cwd(), 'logs', 'proxy-debug.log'), debugInfo, { flag: 'a' })
      .catch(err => logger.error(`Error writing to proxy debug log: ${err.message}`));
  } catch (e) {
    logger.error(`Error creating proxy debug log: ${e.message}`);
  }
  
  // Добавляем аргумент прокси - усовершенствованный метод
  if (proxy.protocol === 'socks5') {
    // Для SOCKS5 нужно использовать правильный формат без указания URL
    args.push(`--proxy-server=socks5://${proxy.host}:${proxy.port}`);
    
    // Для SOCKS с аутентификацией используем отдельную аутентификацию через page.authenticate
    if (proxy.username && proxy.password) {
      return {
        ...options,
        args,
        // Необходимо для SOCKS5 прокси с аутентификацией
        authenticate: {
          username: proxy.username,
          password: proxy.password
        },
        // Сохраняем информацию о прокси для журналирования
        _proxyInfo: {
          url: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
          protocol: proxy.protocol,
          host: proxy.host,
          port: proxy.port,
          hasAuth: true
        }
      };
    }
  } else if (proxy.protocol === 'http') {
    // Для HTTP прокси строго используем такой формат
    args.push(`--proxy-server=http://${proxy.host}:${proxy.port}`);
    
    // Для авторизации в HTTP прокси используем authenticate
    if (proxy.username && proxy.password) {
      return {
        ...options,
        args,
        authenticate: {
          username: proxy.username,
          password: proxy.password
        },
        // Сохраняем информацию о прокси для журналирования
        _proxyInfo: {
          url: `${proxy.protocol}://${proxy.username}:********@${proxy.host}:${proxy.port}`,
          protocol: proxy.protocol,
          host: proxy.host,
          port: proxy.port,
          hasAuth: true
        }
      };
    }
  } else {
    // Для других типов прокси 
    args.push(`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`);
  }
  
  // Для URL с аутентификацией не нужно устанавливать отдельную аутентификацию
  return {
    ...options,
    args,
    // Сохраняем информацию о прокси для журналирования
    _proxyInfo: {
      url: proxyUrl.replace(proxy.password, '********'),
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      hasAuth: !!(proxy.username && proxy.password)
    }
  };
}

module.exports = {
  loadProxies,
  getRandomProxy,
  getProxyUrl,
  applyProxy
};