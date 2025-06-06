document.addEventListener('DOMContentLoaded', function() {
  // Загружаем статус при загрузке страницы
  loadStatus();
  
  // Настраиваем периодическое обновление каждые 30 секунд
  setInterval(loadStatus, 30000);
});

/**
 * Загружает данные о статусе бота и обновляет интерфейс
 */
function loadStatus() {
  fetch('status/status.json?' + new Date().getTime())
    .then(response => {
      if (!response.ok) {
        throw new Error('Статус недоступен');
      }
      return response.json();
    })
    .then(data => {
      updateInterface(data);
    })
    .catch(error => {
      console.error('Ошибка загрузки статуса:', error);
      document.getElementById('bot-status').textContent = 'Нет данных';
      document.getElementById('bot-status').className = 'text-warning';
    });
}

/**
 * Обновляет интерфейс на основе полученных данных
 * @param {Object} data - Данные о статусе
 */
function updateInterface(data) {
  // Обновляем статус бота
  const botStatusElement = document.getElementById('bot-status');
  botStatusElement.textContent = data.botStatus === 'running' ? 'Работает' : 'Остановлен';
  botStatusElement.className = data.botStatus === 'running' ? 'text-success' : 'text-danger';
  
  // Обновляем время последней проверки
  const lastCheckTime = new Date(data.lastCheck);
  document.getElementById('last-check').textContent = formatDate(lastCheckTime);
  
  // Обновляем список товаров
  updateProductsList(data.products);
  
  // Обновляем список уведомлений
  updateNotifications(data.notifications);
  
  // Обновляем скриншоты
  updateScreenshots();
}

/**
 * Обновляет список товаров
 * @param {Array} products - Массив товаров
 */
function updateProductsList(products) {
  const productsTable = document.getElementById('products-list');
  
  if (!products || products.length === 0) {
    return;
  }
  
  let html = '';
  
  products.forEach(product => {
    const statusClass = product.available ? 'status-available' : 'status-unavailable';
    const statusText = product.available ? 'Доступен' : 'Недоступен';
    
    // Добавляем причину недоступности, если товар недоступен
    const reasonText = (!product.available && product.error) ? 
      `<br><small class="text-muted">${escapeHtml(product.error)}</small>` : '';
    
    // Добавляем ссылку на товар, если она есть
    const nameCell = product.productUrl ? 
      `<a href="${escapeHtml(product.productUrl)}" target="_blank">${escapeHtml(product.name)}</a>` : 
      escapeHtml(product.name);
    
    html += `
      <tr>
        <td>${nameCell}</td>
        <td>${escapeHtml(product.shop)}</td>
        <td>${escapeHtml(product.sizes.join(', '))}</td>
        <td>${escapeHtml(product.maxPrice.toString())}</td>
        <td class="${statusClass}">${statusText}${reasonText}</td>
      </tr>
    `;
  });
  
  productsTable.innerHTML = html;
}

/**
 * Обновляет список уведомлений
 * @param {Array} notifications - Массив уведомлений
 */
function updateNotifications(notifications) {
  const notificationsContainer = document.getElementById('notifications');
  
  if (!notifications || notifications.length === 0) {
    notificationsContainer.innerHTML = '<div class="list-group-item">Нет уведомлений</div>';
    return;
  }
  
  let html = '';
  
  notifications.forEach(notification => {
    const time = new Date(notification.timestamp);
    
    // Используем innerHTML для поддержки HTML в сообщениях (ссылки и т.д.)
    html += `
      <div class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <h5 class="mb-1">${escapeHtml(notification.title)}</h5>
          <small>${formatDate(time)}</small>
        </div>
        <div class="mb-1">${notification.message}</div>
      </div>
    `;
  });
  
  notificationsContainer.innerHTML = html;
}

/**
 * Обновляет скриншоты
 */
function updateScreenshots() {
  fetch('screenshots/')
    .then(response => {
      if (!response.ok) {
        throw new Error('Скриншоты недоступны');
      }
      return response.text();
    })
    .then(html => {
      // Парсим ответ для получения списка файлов
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'))
        .filter(a => a.href.endsWith('.png'))
        .map(a => a.href.split('/').pop());
      
      updateScreenshotsUI(links);
    })
    .catch(error => {
      console.error('Ошибка загрузки скриншотов:', error);
      document.getElementById('screenshots').innerHTML = '<p>Скриншоты недоступны</p>';
    });
}

/**
 * Обновляет отображение скриншотов
 * @param {Array} screenshots - Массив имен файлов скриншотов
 */
function updateScreenshotsUI(screenshots) {
  const screenshotsContainer = document.getElementById('screenshots');
  
  if (!screenshots || screenshots.length === 0) {
    screenshotsContainer.innerHTML = '<p>Скриншоты отсутствуют</p>';
    return;
  }
  
  // Группируем скриншоты по товарам и берем последний для каждого товара
  const productScreenshots = getLatestScreenshotPerProduct(screenshots);
  
  let html = '';
  
  productScreenshots.forEach(screenshot => {
    const productName = extractProductNameFromFilename(screenshot.filename);
    html += `
      <div class="mb-3">
        <h6 class="screenshot-title">${escapeHtml(productName)}</h6>
        <small class="text-muted">Последний скриншот: ${formatDate(screenshot.date)}</small>
        <br>
        <a href="screenshots/${escapeHtml(screenshot.filename)}" target="_blank">
          <img src="screenshots/${escapeHtml(screenshot.filename)}" class="product-screenshot" alt="Скриншот товара ${escapeHtml(productName)}">
        </a>
      </div>
    `;
  });
  
  screenshotsContainer.innerHTML = html;
}

/**
 * Извлекает имя товара из имени файла скриншота
 * @param {string} filename - Имя файла скриншота
 * @returns {string} Имя товара
 */
function extractProductNameFromFilename(filename) {
  // Формат файлов: page-loaded-Кожаная куртка-1749241662109.png
  // available-Кожаная куртка-1749241668384.png
  // error-Кожаная куртка-timestamp.png
  
  const match = filename.match(/^(page-loaded|available|error)-(.+)-\d+\.png$/);
  if (match) {
    return match[2]; // Извлекаем имя товара
  }
  
  // Если формат не соответствует ожидаемому, возвращаем имя файла
  return filename.replace('.png', '');
}

/**
 * Группирует скриншоты по товарам и возвращает последний скриншот для каждого товара
 * @param {Array} screenshots - Массив имен файлов скриншотов
 * @returns {Array} Массив объектов с последними скриншотами для каждого товара
 */
function getLatestScreenshotPerProduct(screenshots) {
  const productGroups = {};
  
  screenshots.forEach(filename => {
    const productName = extractProductNameFromFilename(filename);
    
    // Извлекаем timestamp из имени файла
    const timestampMatch = filename.match(/-(\d+)\.png$/);
    const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : 0;
    
    if (!productGroups[productName] || productGroups[productName].timestamp < timestamp) {
      productGroups[productName] = {
        filename: filename,
        timestamp: timestamp,
        date: new Date(timestamp),
        productName: productName
      };
    }
  });
  
  // Сортируем по времени создания (новые сверху)
  return Object.values(productGroups).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Форматирует дату в удобочитаемый формат
 * @param {Date} date - Объект даты
 * @returns {string} Отформатированная дата
 */
function formatDate(date) {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Экранирует HTML-символы
 * @param {string} text - Исходный текст
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
