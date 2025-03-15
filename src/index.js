require('dotenv').config();
const cron = require('node-cron');
const config = require('../config/default');
const logger = require('./utils/logger');
const { monitorProducts } = require('./services/monitoringService');

/**
 * Main application entry point
 */
async function main() {
  logger.info('=================================================');
  logger.info('🤖 Starting Shopping Bot');
  logger.info('=================================================');
  logger.info(`Check schedule: ${config.checkInterval}`);
  
  // Run first check immediately
  try {
    logger.info('Running initial product check...');
    await monitorProducts();
  } catch (error) {
    logger.error(`Error during initial check: ${error.message}`);
  }
  
  // Schedule subsequent checks
  cron.schedule(config.checkInterval, async () => {
    logger.info('Running scheduled product check...');
    try {
      await monitorProducts();
    } catch (error) {
      logger.error(`Error during scheduled check: ${error.message}`);
    }
  });
  
  logger.info('Bot is running and monitoring products...');
}

// Start the application
main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
}); 