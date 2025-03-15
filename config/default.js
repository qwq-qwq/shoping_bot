require('dotenv').config();

module.exports = {
  shops: [
    {
      name: 'Zara',
      url: 'https://www.zara.com',
      locale: '/ru', // Change to your region
      cookieConsent: {
        selector: '#onetrust-accept-btn-handler',
        timeout: 5000
      },
      credentials: {
        username: process.env.ZARA_USERNAME,
        password: process.env.ZARA_PASSWORD
      }
    },
    {
      name: 'Massimo Dutti',
      url: 'https://www.massimodutti.com',
      locale: '/ru', // Change to your region
      cookieConsent: {
        selector: '.cookie-setting-link',
        timeout: 5000
      },
      credentials: {
        username: process.env.MASSIMO_DUTTI_USERNAME,
        password: process.env.MASSIMO_DUTTI_PASSWORD
      }
    }
  ],
  // Target items to monitor
  targetItems: [
    {
      shop: 'Zara',
      name: 'КУРТКА-БОМБЕР SOFT З ЕЛАСТИЧНОЮ ОКАНТОВКОЮ',
      // From the screenshot, this is the exact product name
      productId: 'ua/uk/-к-у-р-т-к-а---б-о-м-б-е-р---s-o-f-t---з---е-л-а-с-т-и-ч-н-о-ю---о-к-а-н-т-о-в-к-о-ю--p03046274',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      maxPrice: 1500,
      autoPurchase: false
    },
    {
      shop: 'Zara',
      name: 'Замшеві мюлі на підборах кітен хіл',
      // Important: Product ID is the path part of the URL after the domain
      // For example, from https://www.zara.com/ua/uk/-з-а-м-ш-е-в-і---м-ю-л-і---н-а---п-і-д-б-о-р-а-х---к-і-т-е-н---х-і-л--p11219510.html
      // The productId would be: ua/uk/-з-а-м-ш-е-в-і---м-ю-л-і---н-а---п-і-д-б-о-р-а-х---к-і-т-е-н---х-і-л--p11219510
      productId: 'ua/uk/-з-а-м-ш-е-в-і---м-ю-л-і---н-а---п-і-д-б-о-р-а-х---к-і-т-е-н---х-і-л--p11219510',
      sizes: ['36', '37', '38'],
      maxPrice: 2990,
      autoPurchase: false
    }
  /*   {
      shop: 'Massimo Dutti',
      name: 'Кожаная куртка',
      // For Massimo Dutti, the format might be different
      // Example: from https://www.massimodutti.com/ru/кожаная-куртка-l1850277.html
      // The productId would be: ru/кожаная-куртка-l1850277
      productId: 'ru/кожаная-куртка-l1850277',
      sizes: ['42', '44'],
      maxPrice: 29990,
      autoPurchase: false
    } */
  ],
  // Email notification settings
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    password: process.env.EMAIL_PASSWORD
  },
  // Check interval
  checkInterval: process.env.CHECK_INTERVAL || '*/30 * * * *', // Every 30 minutes by default
  // Browser settings
  browser: {
    headless: process.env.HEADLESS === 'true'
  }
}; 