// TelegramService.js - Service for sending notifications via Telegram
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';

class TelegramService {
  constructor() {
    // Telegram Bot configuration
    this.botToken = '8411652761:AAEuqeMd1YyZcMfT2u02bttQwwa4Ib823Oc'; // Replace with your actual bot token
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.emergencyChatId = '6288258757'; // Replace with your emergency channel/group chat ID
    this.isEnabled = true; // Set to true to enable Telegram notifications
    this.isDevelopment = false; // Set to false in production
  }

  /**
   * Send a notification about bedsore risk to a doctor
   * @param {string} doctorId - The doctor's ID
   * @param {object} patient - The patient data
   * @param {object} riskAssessment - The bedsore risk assessment data
   * @returns {Promise<object>} - Response from the Telegram API
   */
async sendBedsoreRiskAlert(doctorId, patient, riskAssessment) {
  try {
    console.log("Preparing Bedsore Risk Alert...");

    // Get all users and find the doctor by doctorId field
    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);

    if (!usersSnapshot.exists()) {
      throw new Error("No users found in database");
    }

    const users = usersSnapshot.val();
    let doctorData = null;

    // Loop through all users to find the doctor with matching doctorId
    for (let key in users) {
      if (users[key].doctorId === doctorId) {
        doctorData = users[key];
        break;
      }
    }

    if (!doctorData) {
      throw new Error(`Doctor with ID ${doctorId} not found in users`);
    }

    const chatId = doctorData.telegramChatId;
    if (!chatId) {
      throw new Error("Doctor Telegram chat ID not found");
    }

    // Prepare patient details
    const patientName =
      patient.healthData?.fullName ||
      patient.fullName ||
      patient.name ||
      "Unknown Patient";

    const patientNumber =
      patient.healthData?.patientNumber || patient.patientNumber || "N/A";

    // Create the message text
    const message = `⚠️ <b>URGENT ALERT</b>\n\n<b>Patient:</b> ${patientName}\n<b>ID:</b> ${patientNumber}\n<b>Risk Level:</b> ${riskAssessment.riskLevel}\n<b>Score:</b> ${riskAssessment.score}/100\n\nPlease check the dashboard immediately.`;

    // Send message to Telegram
    await this.sendMessage(chatId, message);

    console.log(`✅ Telegram Alert sent to doctor ${doctorId} (${chatId})`);

    return {
      success: true,
      message: "Telegram alert sent successfully",
    };
  } catch (error) {
    console.error("❌ Error sending Telegram alert:", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
}

  /**
   * Send a message using Telegram Bot API
   * @param {string} chatId - Telegram chat ID
   * @param {string} text - Message text
   * @returns {Promise<object>} - Telegram API response
   */
  async sendMessage(chatId, text) {
    try {
      // In development mode, just log the message
      if (this.isDevelopment) {
        console.log('DEV MODE - Would send Telegram message:', { chatId, text });
        return {
          success: true,
          message: 'Message logged (development mode)',
          response: null
        };
      }

      // Telegram API endpoint for sending messages
      const url = `${this.apiUrl}/sendMessage`;

      // Create request data
      const data = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      };

      // Make API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.ok) {
        throw new Error(`Telegram API error: ${responseData.description || 'Unknown error'}`);
      }

      console.log('Telegram message sent successfully:', responseData.result.message_id);

      return {
        success: true,
        message: 'Message sent successfully',
        response: responseData
      };

    } catch (error) {
      console.error('Error sending message via Telegram:', error);
      return {
        success: false,
        message: error.message,
        response: null
      };
    }
  }

  /**
   * Send a test message
   * @param {string} chatId - Telegram chat ID to send test to
   * @returns {Promise<object>} - Response from Telegram API
   */
  async sendTestMessage(chatId) {
    const message = 'This is a test message from your Healthcare App';
    return await this.sendMessage(chatId, message);
  }

  /**
   * Send emergency message to a the emergency channel/group
   * @param {string} message - Message content
   * @returns {Promise<object>} - Response from Telegram API
   */
  async sendEmergencyMessage(message = 'Emergency alert from Healthcare App') {
    console.log(`Sending emergency message to ${this.emergencyChatId}: ${message}`);
    return await this.sendMessage(this.emergencyChatId, `🚨 ${message}`);
  }

  /**
   * Update configuration settings
   * @param {object} config - New configuration settings
   * @returns {TelegramService} - This instance for chaining
   */
  updateConfig(config) {
    if (config.botToken) this.botToken = config.botToken;
    if (config.emergencyChatId) this.emergencyChatId = config.emergencyChatId;
    if (config.isEnabled !== undefined) this.isEnabled = config.isEnabled;
    if (config.isDevelopment !== undefined) this.isDevelopment = config.isDevelopment;

    // Update API URL when token changes
    if (config.botToken) {
      this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    }

    console.log('TelegramService configuration updated');
    return this;
  }
}

// Create and export singleton instance
const telegramService = new TelegramService();
export default telegramService;