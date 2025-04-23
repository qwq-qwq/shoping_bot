const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');
const config = require('../../config/default');

/**
 * Analyzes a screenshot using AI to detect product availability, sizes, and price
 * @param {string} screenshotPath - Path to the screenshot file
 * @param {Object} item - Product item configuration
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeScreenshot(screenshotPath, item) {
  try {
    logger.info(`Analyzing screenshot for ${item.name} using AI...`);
    
    // If OpenAI API key is not configured, use mock analysis for development
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured, using mock analysis');
      return mockAnalysis(item);
    }
    
    // Read the screenshot file
    const imageBuffer = await fs.readFile(screenshotPath);
    
    // Prepare the prompt for the AI
    const prompt = `Analyze this screenshot of a product page from an online store.
1. Is the product available for purchase?
2. What sizes are available? The target sizes I'm looking for are: ${item.sizes.join(', ')}
3. What is the price of the product biggest font on top of the page in UAH?
4. Are there any "out of stock" or "not available" messages?

Please respond in JSON format with the following structure:
{
  "available": true/false,
  "availableSizes": ["size1", "size2", ...],
  "price": number,
  "outOfStockMessage": "text of any out of stock message or null if none"
}`;
    

    // Make the API request
    // Log the API request URL for debugging
    logger.info('Making request to OpenAI API...');

    let response
    
    try {
       response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBuffer.toString('base64')}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );
      
      logger.info('OpenAI API request successful');
    } catch (error) {
      logger.error(`OpenAI API error: ${error.message}`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`AI analysis failed: ${error.message}`);
    }
    
    // Extract the AI's response
    const aiResponse = response.data.choices[0].message.content;
    
    // Parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (error) {
      logger.error(`Error parsing AI response: ${error.message}`);
      logger.error(`AI response: ${aiResponse}`);
      return {
        available: false,
        error: 'Failed to parse AI response',
        aiResponse
      };
    }
    
    // Filter available sizes to only include target sizes
    if (analysisResult.availableSizes) {
      analysisResult.availableSizes = analysisResult.availableSizes.filter(size => 
        item.sizes.some(targetSize => 
          size.includes(targetSize) || size === targetSize
        )
      );
    }
    
    // Check if the price is within the maximum price
    if (analysisResult.price && analysisResult.price > item.maxPrice) {
      analysisResult.available = false;
      analysisResult.error = 'Price above maximum';
    }
    
    // Check if there are any available sizes
    if (analysisResult.availableSizes && analysisResult.availableSizes.length === 0) {
      analysisResult.available = false;
      analysisResult.error = 'No available sizes match target sizes';
    }
    
    logger.info(`AI analysis result for ${item.name}: ${JSON.stringify(analysisResult)}`);
    return analysisResult;
  } catch (error) {
    logger.error(`Error analyzing screenshot: ${error.message}`);
    return {
      available: false,
      error: `AI analysis failed: ${error.message}`
    };
  }
}

/**
 * Mock analysis for development when OpenAI API key is not configured
 * @param {Object} item - Product item configuration
 * @returns {Object} Mock analysis result
 */
function mockAnalysis(item) {
  // Randomly determine if the product is available
  const isAvailable = Math.random() > 0.5;
  
  // Randomly select some available sizes from the target sizes
  const availableSizes = isAvailable 
    ? item.sizes.filter(() => Math.random() > 0.3) 
    : [];
  
  // Generate a random price around the max price
  const price = Math.round(item.maxPrice * (0.8 + Math.random() * 0.4));
  
  // Create a mock analysis result
  const result = {
    available: isAvailable && availableSizes.length > 0 && price <= item.maxPrice,
    availableSizes,
    price,
    outOfStockMessage: isAvailable ? null : 'This item is currently out of stock'
  };
  
  logger.info(`Mock AI analysis result for ${item.name}: ${JSON.stringify(result)}`);
  return result;
}

module.exports = {
  analyzeScreenshot
}; 