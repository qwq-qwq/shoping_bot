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
  
  try {
    browser = await launchBrowser();
    
    for (const item of config.targetItems) {
      const result = await checkProductAvailability(browser, item);
      
      // Сохраняем статус продукта для веб-интерфейса
      productStatuses.push({
        name: item.name,
        shop: item.shop,
        sizes: item.sizes,
        maxPrice: item.maxPrice,
        available: result.available,
        price: result.price,
        availableSizes: result.availableSizes || [],
        error: result.error
      });
      
      if (result.available) {
        logger.info(`🔔 PRODUCT AVAILABLE: ${item.name} in ${item.shop}`);
        
        // Construct product URL for notification
        const shopConfig = config.shops.find(s => s.name === item.shop);
        // The productId now contains the full path after the domain
        const productUrl = `${shopConfig.url}/${item.productId}`;
        
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
        
        // Добавляем уведомление в веб-интерфейс
        if (webService) {
          await webService.addWebNotification(
            `Товар доступен: ${item.name} (${item.shop})`,
            `Доступен товар "${item.name}" в магазине ${item.shop} по цене ${result.price} в размерах: ${result.availableSizes.join(', ')}`
          );
        }
        
        // If auto-purchase is configured, execute it
        if (item.autoPurchase) {
          // Auto-purchase functionality would be implemented here
          logger.info('Auto-purchase is enabled for this product, but not implemented in current version');
        }
      } else {
        logger.info(`Product unavailable: ${item.name} in ${item.shop}${result.error ? ` (${result.error})` : ''}`);
      }
    }
    
    // Обновляем веб-интерфейс
    if (webService) {
      await webService.updateWebDashboard(productStatuses);
    }
  } catch (error) {
    logger.error(`Error during monitoring: ${error.message}`);
    await sendNotification(
      '❌ Error during product monitoring',
      `<p>An error occurred: ${error.message}</p>`
    );
    
    // Добавляем уведомление об ошибке в веб-интерфейс
    if (webService) {
      await webService.addWebNotification(
        'Ошибка мониторинга',
        `Произошла ошибка при мониторинге товаров: ${error.message}`
      );
    }
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Browser closed');
    }
  }
}

module.exports = {
  monitorProducts
};