# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Commands
- `npm start` - Start the bot
- `npm run dev` - Start in development mode with nodemon
- `npm install` - Install dependencies

### Docker Commands
- `docker-compose -f docker-compose.development.yml up -d` - Run development environment
- `docker-compose -f docker-compose.production.yml up -d` - Run production environment

## Architecture Overview

This is a shopping bot that monitors product availability in online stores (Zara, Massimo Dutti) using web scraping and AI analysis. The bot takes screenshots of product pages and uses OpenAI API to analyze availability, prices, and sizes.

### Core Architecture
- **Entry Point**: `src/index.js` - Cron scheduler that runs monitoring at configured intervals
- **Main Orchestrator**: `src/services/monitoringService.js` - Coordinates product monitoring process
- **Product Analysis**: `src/services/productService.js` - Loads product pages and triggers analysis
- **AI Analysis**: `src/services/aiAnalysisService.js` - Uses OpenAI API to analyze product screenshots
- **Browser Control**: `src/services/browserService.js` - Manages Puppeteer browser instances
- **Notifications**: `src/services/notificationService.js` - Sends email alerts when products are available

### Key Configuration
- **Products**: Configure target items in `config/default.js` under `targetItems` array
- **Shops**: Add shop configurations in `config/default.js` under `shops` array
- **Environment**: Copy `.env.example` to `.env` and configure credentials and API keys

### Anti-Detection Features
- Proxy support with authentication (utils/proxyTester.js, utils/rotateProxy.js)
- Anti-detection utilities (utils/antiDetectionUtils.js)
- Site availability checking (utils/siteAvailabilityChecker.js)

### Analysis Flow
1. AI-first analysis using OpenAI API on product page screenshots
2. Fallback to HTML parsing if AI analysis fails
3. Mock analysis mode for development when API key not configured

### Current Monitoring Items
The bot is currently configured to monitor Massimo Dutti products (leather jacket and linen blazer) as defined in `config/default.js:50-65`.

## Environment Variables Required
- `OPENAI_API_KEY` - For AI-powered product analysis
- `EMAIL_*` - Email notification settings
- `CHECK_INTERVAL` - Cron schedule for monitoring
- Store credentials (`ZARA_*`, `MASSIMO_DUTTI_*`)