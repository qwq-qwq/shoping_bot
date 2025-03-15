const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Saves a screenshot from a Puppeteer page
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {string} filename - Base filename for the screenshot
 * @returns {Promise<string>} Path to the saved screenshot
 */
async function saveScreenshot(page, filename) {
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const timestamp = Date.now();
    const screenshotPath = path.join(screenshotDir, `${filename}-${timestamp}.png`);
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logger.info(`Screenshot saved: ${filename}`);
    
    return screenshotPath;
  } catch (error) {
    logger.error(`Error saving screenshot: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveScreenshot
}; 