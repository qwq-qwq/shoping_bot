const puppeteer = require('puppeteer');
const config = require('../../config/default');
const logger = require('../utils/logger');

/**
 * Launches a Puppeteer browser instance
 * @returns {Promise<import('puppeteer').Browser>} Puppeteer browser instance
 */
async function launchBrowser() {
  logger.info('Launching browser...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: config.browser.headless, 
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    logger.info('Browser launched successfully');
    return browser;
  } catch (error) {
    logger.error(`Failed to launch browser: ${error.message}`);
    throw error;
  }
}

/**
 * Accepts cookies on a page if the consent banner is present
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {Object} shop - Shop configuration
 * @returns {Promise<void>}
 */
async function acceptCookies(page, shop) {
  try {
    const cookieSelector = shop.cookieConsent.selector;
    const isVisible = await page.waitForSelector(cookieSelector, { 
      visible: true, 
      timeout: shop.cookieConsent.timeout 
    }).catch(() => false);
    
    if (isVisible) {
      await page.click(cookieSelector);
      logger.info('Cookies accepted');
      await page.waitForTimeout(1000);
    }
  } catch (error) {
    logger.info('Cookie banner not found or already accepted');
  }
}

/**
 * Logs in to a shop
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {string} shopName - Name of the shop
 * @returns {Promise<boolean>} Whether login was successful
 */
async function login(page, shopName) {
  const shopConfig = config.shops.find(s => s.name === shopName);
  const credentials = shopConfig.credentials;
  
  logger.info(`Logging in to ${shopName}...`);
  
  try {
    // Navigate to login page
    await page.goto(`${shopConfig.url}${shopConfig.locale}/logon`, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Accept cookies if they appear
    await acceptCookies(page, shopConfig);
    
    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('.account-info') || 
             !!document.querySelector('.user-info');
    });
    
    if (isLoggedIn) {
      logger.info('Already logged in');
      return true;
    }
    
    // Enter email and proceed to password
    await page.type('input[name="logonId"], input[name="email"]', credentials.username);
    await Promise.all([
      page.click('button[type="submit"], .logon-continue-button'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);
    
    // Enter password
    await page.waitForSelector('input[name="password"], input[type="password"]', { visible: true });
    await page.type('input[name="password"], input[type="password"]', credentials.password);
    
    // Submit form
    await Promise.all([
      page.click('button[type="submit"], .login-button'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);
    
    // Check if login was successful
    const loginSuccessful = await page.evaluate(() => {
      return !!document.querySelector('.account-info') || 
             !!document.querySelector('.user-info');
    });
    
    if (loginSuccessful) {
      logger.info(`Login to ${shopName} successful`);
      return true;
    } else {
      logger.error(`Failed to log in to ${shopName}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error during login to ${shopName}: ${error.message}`);
    return false;
  }
}

module.exports = {
  launchBrowser,
  acceptCookies,
  login
}; 