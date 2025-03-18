const config = require('../../config/default');
const logger = require('../utils/logger');
const { launchBrowser } = require('./browserService');
const { checkProductAvailability } = require('./productService');
const { sendNotification } = require('./notificationService');

/**
 * Monitors products for availability
 * @returns {Promise<void>}
 */
async function monitorProducts() {
  logger.info('Starting product monitoring...');
  
  let browser;
  
  try {
    browser = await launchBrowser();
    
    for (const item of config.targetItems) {
      const result = await checkProductAvailability(browser, item);
      
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
        
        // If auto-purchase is configured, execute it
        if (item.autoPurchase) {
          // Auto-purchase functionality would be implemented here
          logger.info('Auto-purchase is enabled for this product, but not implemented in current version');
        }
      } else {
        logger.info(`Product unavailable: ${item.name} in ${item.shop}${result.error ? ` (${result.error})` : ''}`);
      }
    }
  } catch (error) {
    logger.error(`Error during monitoring: ${error.message}`);
    await sendNotification(
      '❌ Error during product monitoring',
      `<p>An error occurred: ${error.message}</p>`
    );
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