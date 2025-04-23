const config = require('../../config/default');
const logger = require('../utils/logger');
const { acceptCookies } = require('./browserService');
const { saveScreenshot } = require('./screenshotService');
const { analyzeScreenshot } = require('./aiAnalysisService');

/**
 * Checks availability of a product
 * @param {import('puppeteer').Browser} browser - Puppeteer browser instance
 * @param {Object} item - Product item configuration
 * @returns {Promise<Object>} Availability result
 */
async function checkProductAvailability(browser, item) {
  const shopConfig = config.shops.find(s => s.name === item.shop);
  
  if (!shopConfig) {
    logger.error(`Configuration for shop ${item.shop} not found`);
    return { available: false, error: 'Unknown shop' };
  }
  
  const page = await browser.newPage();
  
  // Применяем аутентификацию прокси к новой странице
  const { setupProxyAuthForPage } = require('../utils/proxyAuthUtils');
  await setupProxyAuthForPage(browser, page);
  
  // Применяем антидетект настройки с меньшим количеством Javascript
  await page.evaluateOnNewDocument(() => {
    // Скрытие работы в режиме Headless
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
    
    // Скрытие присутствия Automation
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
  });
  
  try {
    logger.info(`Checking product ${item.name} in ${item.shop}...`);
    
    // Construct product URL
    // The productId now contains the full path after the domain
    const productUrl = `${shopConfig.url}/${item.productId}`;
    
    logger.info(`Loading page: ${productUrl}`);
    
    // Создаем новый файл с настройками для хранения детальных настроек анти-детекта
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36');
    
    // Устанавливаем дополнительные заголовки для более естественного поведения
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': shopConfig.url
    });
    
    // Увеличиваем таймаут до 60 секунд
    await page.goto(productUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Случайная задержка перед дальнейшими действиями
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Accept cookies if they appear
    await acceptCookies(page, shopConfig);
    
    // Добавим простую эмуляцию скроллинга без сложного кода
    await page.evaluate(() => {
      window.scrollBy(0, 300);
      setTimeout(() => window.scrollBy(0, 300), 500);
    });
    
    // Take a screenshot of the page for AI analysis
    const screenshotPath = await saveScreenshot(page, `page-loaded-${item.name}`);
    
    // Check if product page loaded correctly
    const isProductPage = await page.evaluate(() => {
      return !!document.querySelector('.product-detail-view__main-info') || 
             !!document.querySelector('.product-info') ||
             !!document.querySelector('.bs-detail-content') ||
             !!document.querySelector('.product-detail-size-selector-std__wrapper') ||
             !!document.querySelector('.new-size-selector') ||
             !!document.querySelector('.product-detail-view_main-content') ||
             !!document.querySelector('.product-detail-view-std');
    });
    
    if (!isProductPage) {
      logger.warn(`Product page for ${item.name} not recognized`);
      await saveScreenshot(page, `not-product-page-${item.shop}`);
      return { available: false, error: 'Product page not recognized' };
    }
    
    // Use AI to analyze the screenshot
    const aiAnalysisResult = await analyzeScreenshot(screenshotPath, item);
    
    // If AI analysis failed, fall back to traditional HTML parsing
    if (aiAnalysisResult.error && aiAnalysisResult.error.includes('AI analysis failed')) {
      logger.warn(`AI analysis failed for ${item.name}, falling back to HTML parsing`);
      return await traditionalHtmlParsing(page, item);
    }
    
    // Return the AI analysis result
    return {
      available: aiAnalysisResult.available,
      price: aiAnalysisResult.price,
      availableSizes: aiAnalysisResult.availableSizes || [],
      aiAnalysis: true
    };
  } catch (error) {
    logger.error(`Error checking product ${item.name}: ${error.message}`);
    await saveScreenshot(page, `error-${item.name}`);
    return { available: false, error: error.message };
  } finally {
    await page.close();
  }
}

/**
 * Traditional HTML parsing method as a fallback
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {Object} item - Product item configuration
 * @returns {Promise<Object>} Availability result
 */
async function traditionalHtmlParsing(page, item) {
  try {
    // Get product price
    const priceInfo = await page.evaluate(() => {
      // Try various selectors for price elements
      const priceSelectors = [
        '.money-amount__main', 
        '.product-price', 
        '.current-price-elem', 
        '.screen-reader-text'
      ];
      
      let priceElement = null;
      let usedSelector = '';
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          priceElement = element;
          usedSelector = selector;
          break;
        }
      }
      
      // If no price element found with selectors, try to find any text that looks like a price
      if (!priceElement) {
        // Look for text that matches price pattern (e.g., "1 499,00 UAH")
        const allTextElements = Array.from(document.querySelectorAll('*'));
        const priceRegex = /(\d[\d\s]*[.,]\d{2})\s*(?:UAH|грн|₴)/i;
        
        for (const element of allTextElements) {
          const text = element.textContent.trim();
          const match = text.match(priceRegex);
          if (match) {
            priceElement = element;
            usedSelector = 'regex-match';
            break;
          }
        }
      }
      
      if (!priceElement) {
        return { 
          price: null, 
          debug: { 
            error: 'No price element found' 
          } 
        };
      }
      
      const priceText = priceElement.textContent.trim();
      
      // Extract price using regex to handle various formats
      const priceRegex = /(\d[\d\s]*[.,]\d{2})/;
      const match = priceText.match(priceRegex);
      
      if (!match) {
        return { 
          price: null, 
          debug: { 
            error: 'Could not extract price from text', 
            text: priceText 
          } 
        };
      }
      
      // Clean up the price string and convert to number
      const cleanPrice = match[1].replace(/\s/g, '').replace(',', '.');
      const price = parseFloat(cleanPrice);
      
      return { 
        price, 
        debug: { 
          text: priceText, 
          selector: usedSelector, 
          extracted: match[1], 
          cleaned: cleanPrice 
        } 
      };
    });
    
    logger.info(`Price debug info for ${item.name}:`);
    logger.info(JSON.stringify(priceInfo.debug, null, 2));
    
    const price = priceInfo.price;
    logger.info(`Product price: ${price || 'not determined'}`);
    
    if (!price) {
      logger.error(`Could not determine price for ${item.name}`);
      await saveScreenshot(page, `price-not-found-${item.name}`);
      return { available: false, error: 'Price not determined' };
    }
    
    if (price > item.maxPrice) {
      logger.info(`Price ${price} exceeds maximum ${item.maxPrice}`);
      return { available: false, price, error: 'Price above maximum' };
    }
    
    // Check for available sizes
    const availabilityResult = await page.evaluate((targetSizes) => {
      // Check for "НЕМАЄ В НАЯВНОСТІ" (Not Available) text
      const notAvailableElements = Array.from(document.querySelectorAll('.product-detail-show-similar-products__action-tip span'));
      const hasNotAvailableText = notAvailableElements.some(el => 
        el.textContent.includes('НЕМАЄ В НАЯВНОСТІ') || 
        el.textContent.includes('NOT AVAILABLE') ||
        el.textContent.includes('OUT OF STOCK')
      );
      
      // If the global "not available" message is present, return immediately
      if (hasNotAvailableText) {
        return {
          globallyAvailable: false,
          availableSizes: []
        };
      }
      
      // Check for cart button - if it's a link to cart, the item might be already in cart
      const cartButton = document.querySelector('a[href*="/shop/cart"]');
      const isInCart = !!cartButton;
      
      // First, try to find all size elements using various selectors
      const allPossibleSizeSelectors = [
        // New format from the latest screenshot
        '.size-selector-sizes__size button[data-qa-action="size-in-stock"]',
        '.size-selector-sizes-size.button',
        'button.size-selector-sizes-size_button',
        // Simple text sizes (as seen in the left side of the screenshot)
        '.product-detail-info_size-selector',
        // Previous formats
        '.new-size-selector button[data-qa-action="size-in-stock"]',
        '.size-selector__size-list li', 
        '.product-size-info .size-list button',
        '.product-detail-size-selector-std__wrapper button',
        '.product-detail-size-selector-std-actions__button',
        '.size-selector button'
      ];
      
      let sizeElements = [];
      let usedSelector = '';
      
      // Try each selector until we find size elements
      for (const selector of allPossibleSizeSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          sizeElements = Array.from(elements);
          usedSelector = selector;
          break;
        }
      }
      
      // If no size elements found with selectors, try to find simple text sizes
      if (sizeElements.length === 0) {
        // Look for elements that contain exact size text
        const simpleSizeElements = Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const text = el.textContent.trim();
            return targetSizes.some(size => text === size);
          });
        
        if (simpleSizeElements.length > 0) {
          sizeElements = simpleSizeElements;
          usedSelector = 'simple-text-sizes';
        }
      }
      
      // If still no size elements found, check if the product might be one-size or not size-dependent
      if (sizeElements.length === 0) {
        // Check if add to cart button is enabled
        const addToCartButton = document.querySelector('.add-to-cart, .add-to-basket, .product-detail-actions, a[href*="/shop/cart"]');
        const isAddToCartEnabled = addToCartButton && !addToCartButton.disabled && 
                                  !addToCartButton.classList.contains('disabled');
        
        if (isAddToCartEnabled || isInCart) {
          return {
            globallyAvailable: true,
            availableSizes: ['One Size']
          };
        } else {
          return {
            globallyAvailable: false,
            availableSizes: [],
            debug: { noSizeElements: true }
          };
        }
      }
      
      // Process size elements
      const sizes = sizeElements.map(element => {
        // Get size text - could be in a child element with specific class
        let sizeText;
        const sizeLabel = element.querySelector('.size-selector-sizes-size__label, .size-selector-sizes-size__element');
        
        if (sizeLabel) {
          sizeText = sizeLabel.textContent.trim();
        } else {
          sizeText = element.textContent.trim();
        }
        
        // For debugging: collect all relevant attributes and classes
        const debug = {
          classes: element.className,
          tagName: element.tagName,
          parentClasses: element.parentElement ? element.parentElement.className : 'no-parent',
          disabled: element.disabled || false,
          dataQaAction: element.getAttribute('data-qa-action') || 'none',
          hasOutOfStockMessage: !!element.querySelector('.product-detail-show-similar-products__action-tip')
        };
        
        // In the new format, if data-qa-action="size-in-stock" is present, the size is available
        const hasInStockAttribute = element.getAttribute('data-qa-action') === 'size-in-stock';
        
        // Check if the parent li has the enabled class
        const parentHasEnabledClass = element.parentElement && 
                                     (element.parentElement.classList.contains('size-selector-sizes-size--enabled') ||
                                      !element.parentElement.classList.contains('disabled'));
        
        // Check if size is available based on various indicators
        let isAvailable = true;
        
        // For simple text sizes (as in the left side of the screenshot), assume they're available
        if (usedSelector === 'simple-text-sizes') {
          // For simple text sizes, we assume they're available unless they have a disabled class
          isAvailable = !element.classList.contains('disabled') && 
                        !element.hasAttribute('disabled') &&
                        !(element.parentElement && element.parentElement.classList.contains('disabled'));
        }
        // For the new format, primarily rely on the data-qa-action attribute
        else if (usedSelector.includes('data-qa-action="size-in-stock"')) {
          // If we're using a selector that already filters for in-stock items, they're available
          isAvailable = true;
        } else {
          // Otherwise do more detailed checks
          
          // Check for specific classes indicating availability
          if (!(element.classList.contains('size-selector-sizes-size--enabled') || 
               parentHasEnabledClass)) {
            isAvailable = false;
            debug.reason = 'not-enabled-class';
          }
          
          // Check for absence of disabled indicators
          if (element.classList.contains('product-size-info__size--out-of-stock') || 
              element.hasAttribute('disabled') ||
              element.classList.contains('disabled')) {
            isAvailable = false;
            debug.reason = 'has-disabled-indicator';
          }
          
          // Check for data attribute indicating in-stock
          if (!hasInStockAttribute && usedSelector.includes('data-qa-action')) {
            isAvailable = false;
            debug.reason = 'not-in-stock-data-attribute';
          }
          
          // Check for absence of out-of-stock messages
          if (element.querySelector('.product-detail-show-similar-products__action-tip')) {
            isAvailable = false;
            debug.reason = 'has-out-of-stock-message';
          }
        }
        
        // Check if this is one of our target sizes
        const isTargetSize = targetSizes.some(targetSize => {
          return sizeText === targetSize || sizeText.includes(targetSize);
        });
        
        return {
          size: sizeText,
          available: isAvailable,
          isTarget: isTargetSize,
          debug
        };
      });
      
      // Filter to only available target sizes
      const availableSizes = sizes.filter(size => size.isTarget && size.available);
      
      return {
        globallyAvailable: true,
        availableSizes: availableSizes,
        debug: {
          usedSelector,
          allSizes: sizes.map(s => ({ 
            size: s.size, 
            available: s.available, 
            isTarget: s.isTarget,
            debug: s.debug
          }))
        }
      };
    }, item.sizes);
    
    // Log detailed debug information
    logger.info(`Size availability debug info for ${item.name}:`);
    if (availabilityResult.debug) {
      logger.info(JSON.stringify(availabilityResult.debug, null, 2));
    }
    
    const availableSizes = availabilityResult.availableSizes.map(s => s.size);
    logger.info(`Available sizes for ${item.name}: ${JSON.stringify(availableSizes)}`);
    
    const isAvailable = availabilityResult.globallyAvailable && availableSizes.length > 0;
    
    if (isAvailable) {
      await saveScreenshot(page, `available-${item.name}`);
      logger.info(`Product ${item.name} is AVAILABLE in sizes: ${availableSizes.join(', ')}`);
    } else {
      if (!availabilityResult.globallyAvailable) {
        logger.info(`Product ${item.name} is globally OUT OF STOCK`);
      } else {
        logger.info(`Product ${item.name} is available but not in requested sizes`);
      }
    }
    
    return {
      available: isAvailable,
      price,
      availableSizes: availableSizes,
      aiAnalysis: false
    };
  } catch (error) {
    logger.error(`Error in traditional HTML parsing: ${error.message}`);
    return { available: false, error: error.message };
  }
}

module.exports = {
  checkProductAvailability
}; 