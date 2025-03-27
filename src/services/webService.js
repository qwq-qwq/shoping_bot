const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/default');
const logger = require('../utils/logger');

/**
 * Updates the web dashboard with current status information
 * @param {Array} productStatuses - Array of product status objects
 * @returns {Promise<void>}
 */
async function updateWebDashboard(productStatuses) {
  try {
    // Path to the web status JSON file
    const statusFilePath = path.join(process.cwd(), 'html', 'status.json');
    
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
    }
    
    // Write the status file
    await fs.writeFile(statusFilePath, JSON.stringify(statusData, null, 2));
    logger.info('Web dashboard status updated');
    
    // Copy recent screenshots to web directory
    await updateScreenshotsForWeb();
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
    // Path to the web status JSON file
    const statusFilePath = path.join(process.cwd(), 'html', 'status.json');
    
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

/**
 * Copies recent screenshots to the web directory
 * @returns {Promise<void>}
 */
async function updateScreenshotsForWeb() {
  try {
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    const webScreenshotsDir = path.join(process.cwd(), 'html', 'screenshots');
    
    // Create the web screenshots directory if it doesn't exist
    await fs.mkdir(webScreenshotsDir, { recursive: true });
    
    // Get all screenshots
    const screenshots = await fs.readdir(screenshotsDir);
    
    // Sort by creation time (newest first)
    const sortedScreenshots = [];
    for (const file of screenshots) {
      const filePath = path.join(screenshotsDir, file);
      const stats = await fs.stat(filePath);
      sortedScreenshots.push({
        name: file,
        path: filePath,
        ctime: stats.ctime.getTime()
      });
    }
    
    sortedScreenshots.sort((a, b) => b.ctime - a.ctime);
    
    // Copy the 10 most recent screenshots
    const recentScreenshots = sortedScreenshots.slice(0, 10);
    
    // Clear existing screenshots in web directory
    const existingWebScreenshots = await fs.readdir(webScreenshotsDir);
    for (const file of existingWebScreenshots) {
      await fs.unlink(path.join(webScreenshotsDir, file));
    }
    
    // Copy recent screenshots
    for (const screenshot of recentScreenshots) {
      await fs.copyFile(
        screenshot.path,
        path.join(webScreenshotsDir, screenshot.name)
      );
    }
    
    logger.info('Web screenshots updated');
  } catch (error) {
    logger.error(`Error updating web screenshots: ${error.message}`);
  }
}

module.exports = {
  updateWebDashboard,
  addWebNotification
}
