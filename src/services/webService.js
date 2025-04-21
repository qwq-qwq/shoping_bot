const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Updates the web dashboard with current status information
 * @param {Array} productStatuses - Array of product status objects
 * @returns {Promise<void>}
 */
async function updateWebDashboard(productStatuses) {
  try {
    // Path to the web status JSON file - теперь в общем томе
    const statusFilePath = path.join(process.cwd(), 'status', 'status.json');
    const statusDir = path.join(process.cwd(), 'status');
    
    // Создаем директорию status, если её не существует
    await fs.mkdir(statusDir, { recursive: true });
    
    // Create the status data
    const statusData = {
      lastCheck: new Date().toISOString(),
      botStatus: 'running',
      products: productStatuses || [],
      notifications: []
    }
    
    // Try to read existing notifications if the file exists
    try {
      const existingData = JSON.parse(await fs.readFile(statusFilePath, 'utf8'));
      if (existingData && existingData.notifications) {
        statusData.notifications = existingData.notifications;
      }
    } catch (error) {
      // File probably doesn't exist yet, that's fine
      logger.info(`Creating new status file: ${error.message}`);
    }
    
    // Write the status file
    await fs.writeFile(statusFilePath, JSON.stringify(statusData, null, 2));
    logger.info('Web dashboard status updated');
    
    // Больше не нужно копировать скриншоты, поскольку директория shared
  } catch (error) {
    logger.error(`Error updating web dashboard: ${error.message}`);
  }
}

/**
 * Adds a notification to the web dashboard
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Promise<void>}
 */
async function addWebNotification(title, message) {
  try {
    // Path to the web status JSON file - теперь в общем томе
    const statusFilePath = path.join(process.cwd(), 'status', 'status.json');
    const statusDir = path.join(process.cwd(), 'status');
    
    // Создаем директорию status, если её не существует
    await fs.mkdir(statusDir, { recursive: true });
    
    // Create notification
    const notification = {
      id: Date.now(),
      title,
      message,
      timestamp: new Date().toISOString()
    }
    
    // Read existing data
    let statusData = { notifications: [] };
    try {
      statusData = JSON.parse(await fs.readFile(statusFilePath, 'utf8'));
    } catch (error) {
      // File probably doesn't exist yet, that's fine
      logger.info(`Creating new status file for notification: ${error.message}`);
    }
    
    // Add the new notification to the beginning of the array
    statusData.notifications = [notification, ...(statusData.notifications || [])];
    
    // Limit to 20 most recent notifications
    if (statusData.notifications.length > 20) {
      statusData.notifications = statusData.notifications.slice(0, 20);
    }
    
    // Write the updated file
    await fs.writeFile(statusFilePath, JSON.stringify(statusData, null, 2));
    logger.info('Web notification added');
  } catch (error) {
    logger.error(`Error adding web notification: ${error.message}`);
  }
}

module.exports = {
  updateWebDashboard,
  addWebNotification
}
