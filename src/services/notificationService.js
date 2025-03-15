const nodemailer = require('nodemailer');
const config = require('../../config/default');
const logger = require('../utils/logger');

/**
 * Creates an email transporter
 * @returns {nodemailer.Transporter} Email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.from,
      pass: config.email.password
    }
  });
};

/**
 * Sends an email notification
 * @param {string} subject - Email subject
 * @param {string} details - Email HTML content
 * @returns {Promise<void>}
 */
async function sendNotification(subject, details) {
  if (!config.email.enabled) {
    logger.info('Email notifications are disabled');
    return;
  }
  
  try {
    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: config.email.from,
      to: config.email.to,
      subject,
      html: `
        <h1>${subject}</h1>
        ${details}
        <p>Time: ${new Date().toLocaleString()}</p>
      `
    });
    
    logger.info(`Notification sent: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send notification: ${error.message}`);
    throw error;
  }
}

module.exports = {
  sendNotification
}; 