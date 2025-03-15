# Shopping Bot

A Node.js bot for monitoring product availability in online stores and sending notifications when products become available.

## Features

- 🔍 **Product Monitoring**: Automatically checks for product availability
- 💰 **Price Tracking**: Verifies if products are below a maximum price threshold
- 👕 **Size Availability**: Checks if specific sizes are available
- 📧 **Email Notifications**: Sends alerts when products become available
- 📸 **Screenshot Capture**: Takes screenshots for verification and debugging
- ⏱️ **Scheduled Checks**: Uses cron to run checks at regular intervals
- 🤖 **AI Analysis**: Uses OpenAI's Vision API to analyze product pages from screenshots

## Supported Stores

- Zara
- Massimo Dutti
- *(Easily extendable to other stores)*

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Gmail account for sending notifications (or modify for other email providers)
- OpenAI API key (for AI analysis feature)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/shopping-bot.git
   cd shopping-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example`:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your credentials and settings.

## Configuration

### Environment Variables

Configure the following in your `.env` file:

- `EMAIL_ENABLED`: Set to `true` to enable email notifications
- `EMAIL_FROM`: Your Gmail address
- `EMAIL_TO`: Email address to receive notifications
- `EMAIL_PASSWORD`: Your Gmail app password (not your regular password)
- `CHECK_INTERVAL`: Cron schedule for checks (default: every 30 minutes)
- `HEADLESS`: Set to `true` for headless browser mode
- Store credentials for each supported store
- `OPENAI_API_KEY`: Your OpenAI API key for AI analysis (optional)

### Product Configuration

Edit `config/default.js` to configure the products you want to monitor:

```javascript
targetItems: [
  {
    shop: 'Zara',
    name: 'Product Name',
    productId: '1234/567', // Product ID from URL
    sizes: ['S', 'M'],     // Desired sizes
    maxPrice: 9990,        // Maximum price
    autoPurchase: false    // Auto-purchase when available (not implemented yet)
  },
  // Add more products...
]
```

## Usage

Start the bot:

```
npm start
```

For development with auto-restart:

```
npm run dev
```

## AI Analysis

The bot uses OpenAI's Vision API to analyze screenshots of product pages. This approach is more reliable than HTML parsing, as it can handle changes in the website structure.

If the OpenAI API key is not configured, the bot will fall back to traditional HTML parsing.

## Screenshots

Screenshots are saved in the `screenshots` directory with timestamps and descriptive names. These screenshots are used for AI analysis and debugging.

## Logs

Logs are saved in the `logs` directory:
- `combined.log`: All logs
- `error.log`: Error logs only

## Extending

### Adding New Stores

To add support for a new store:

1. Add the store configuration to `config/default.js`
2. The AI analysis should work automatically for most stores

### Implementing Auto-Purchase

The auto-purchase functionality is prepared but not implemented. To implement it:

1. Create a new service in `src/services/purchaseService.js`
2. Implement the purchase flow for each supported store
3. Call the purchase service from the monitoring service when a product is available

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
