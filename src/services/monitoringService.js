const config = require('../../config/default');
const logger = require('../utils/logger');
const { launchBrowser } = require('./browserService');
const { checkProductAvailability } = require('./productService');
const { sendNotification } = require('./notificationService');

// Импортируем веб-сервис (если он есть)
let webService = null;
try {
  webService = require('./webService');
} catch (error) {
  logger.info('Web service not available, web dashboard will not be updated');
}

/**
 * Monitors products for availability
 * @returns {Promise<void>}
 */
async function monitorProducts() {
  logger.info('Starting product monitoring...');
  
  let browser;
  let productStatuses = [];
  
  // Добавляем счетчик неудачных попыток для отслеживания проблем
  let connectionIssuesCount = 0;
  const maxRetries = 3;
  
  try {
    browser = await launchBrowser();
    
    // Добавляем небольшую паузу после запуска браузера
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    for (const item of config.targetItems) {
      let result = null;
      let retryCount = 0;
      
      // Добавляем механизм повторных попыток с экспоненциальной задержкой
      while (retryCount < maxRetries) {
        try {
          // Если это не первая попытка, делаем дополнительную паузу
          if (retryCount > 0) {
            const waitTime = Math.pow(2, retryCount) * 5000; // 10, 20, 40 секунд
            logger.info(`Retry attempt ${retryCount}. Waiting ${waitTime/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          result = await checkProductAvailability(browser, item);
          
          // Если успешно получили результат, выходим из цикла
          if (result) break;
          
        } catch (error) {
          logger.warn(`Attempt ${retryCount + 1} failed for ${item.name}: ${error.message}`);
          
          // Если это таймаут или ошибка соединения, увеличиваем счетчик
          if (error.message.includes('timeout') || 
              error.message.includes('connection') ||
              error.message.includes('network')) {
            connectionIssuesCount++;
          }
          
          // Пересоздаем браузер при сетевых проблемах
          if (retryCount === 1 && browser) {
            logger.info('Recreating browser instance due to connection issues...');
            try {
              await browser.close();
            } catch (e) {
              logger.error(`Error closing browser: ${e.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 10000)); // Ждем 10 секунд
            browser = await launchBrowser();
          }
          
          retryCount++;
          
          // Если все попытки исчерпаны, устанавливаем результат с ошибкой
          if (retryCount >= maxRetries) {
            result = { 
              available: false, 
              error: `Failed after ${maxRetries} attempts: ${error.message}`
            };
          }
        }
      }
      
      // Сохраняем статус продукта для веб-интерфейса
      productStatuses.push({
        name: item.name,
        shop: item.shop,
        sizes: item.sizes,
        maxPrice: item.maxPrice,
        available: result ? result.available : false,
        price: result ? result.price : null,
        availableSizes: result && result.availableSizes ? result.availableSizes : [],
        error: result ? result.error : 'Failed to check product',
        lastChecked: new Date().toISOString()
      });
      
      if (result && result.available) {
        logger.info(`🔔 PRODUCT AVAILABLE: ${item.name} in ${item.shop}`);
        
        // Construct product URL for notification
        const shopConfig = config.shops.find(s => s.name === item.shop);
        // The productId now contains the full path after the domain
        const productUrl = `${shopConfig.url}/${item.productId}`;
        
        try {
          await sendNotification(
            `✅ Product available: ${item.name} (${item.shop})`,
            `
              <p><strong>Product:</strong> ${item.name}</p>
              <p><strong>Shop:</strong> ${item.shop}</p>
              <p><strong>Price:</strong> ${result.price}</p>
              <p><strong>Available sizes:</strong> ${result.availableSizes.join(', ')}</p>
              <p><strong>Product ID:</strong> ${item.productId}</p>
              <p><a href="${productUrl}">
                Go to product
              </a></p>
            `
          );
        } catch (notifError) {
          logger.error(`Failed to send notification: ${notifError.message}`);
        }
        
        // Добавляем уведомление в веб-интерфейс
        if (webService) {
          try {
            await webService.addWebNotification(
              `Товар доступен: ${item.name} (${item.shop})`,
              `Доступен товар "${item.name}" в магазине ${item.shop} по цене ${result.price} в размерах: ${result.availableSizes.join(', ')}`
            );
          } catch (webError) {
            logger.error(`Failed to add web notification: ${webError.message}`);
          }
        }
        
        // If auto-purchase is configured, execute it
        if (item.autoPurchase) {
          // Auto-purchase functionality would be implemented here
          logger.info('Auto-purchase is enabled for this product, but not implemented in current version');
        }
      } else {
        const errorMsg = result && result.error ? ` (${result.error})` : '';
        logger.info(`Product unavailable: ${item.name} in ${item.shop}${errorMsg}`);
      }
      
      // Добавляем паузу между проверками продуктов чтобы снизить шанс обнаружения
      const randomPause = 5000 + Math.floor(Math.random() * 10000); // от 5 до 15 секунд
      logger.info(`Pausing for ${randomPause/1000} seconds before checking next product...`);
      await new Promise(resolve => setTimeout(resolve, randomPause));
    }
    
    // Проверяем, были ли проблемы с подключением
    if (connectionIssuesCount >= config.targetItems.length) {
      logger.error(`All products had connection issues. Possible site protection detected!`);
      
      try {
        await sendNotification(
          '⚠️ Shopping bot connection issues',
          `<p>Все товары имели проблемы с подключением. Возможно, активирована защита от сканирования на сайте.</p>
           <p>Бот будет пробовать снова во время следующей запланированной проверки.</p>`
        );
      } catch (notifError) {
        logger.error(`Failed to send notification about connection issues: ${notifError.message}`);
      }
    }
    
    // Обновляем веб-интерфейс
    if (webService) {
      try {
        await webService.updateWebDashboard(productStatuses);
      } catch (webError) {
        logger.error(`Error updating web dashboard: ${webError.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error during monitoring: ${error.message}`);
    
    try {
      await sendNotification(
        '❌ Error during product monitoring',
        `<p>An error occurred: ${error.message}</p>`
      );
    } catch (notifError) {
      logger.error(`Failed to send error notification: ${notifError.message}`);
    }
    
    // Добавляем уведомление об ошибке в веб-интерфейс
    if (webService) {
      try {
        await webService.addWebNotification(
          'Ошибка мониторинга',
          `Произошла ошибка при мониторинге товаров: ${error.message}`
        );
      } catch (webError) {
        logger.error(`Failed to add web notification: ${webError.message}`);
      }
    }
  } finally {
    // Безопасное закрытие браузера
    if (browser) {
      try {
        await browser.close();
        logger.info('Browser closed');
      } catch (closeError) {
        logger.error(`Error closing browser: ${closeError.message}`);
      }
    }
    
    // Аварийная очистка ресурсов, если необходимо
    try {
      require('child_process').execSync('pkill -f chromium');
    } catch (e) {
      // Игнорируем ошибки здесь
    }
  }
  
  logger.info('Product monitoring completed');
}

module.exports = {
  monitorProducts
};