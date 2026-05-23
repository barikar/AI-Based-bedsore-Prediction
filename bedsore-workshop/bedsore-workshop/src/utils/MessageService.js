// MessageService.js - Service for sending notifications
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
const accountSid = process.env.REACT_APP_TWILIO_ACCOUNT_SID;
const authToken = process.env.REACT_APP_TWILIO_AUTH_TOKEN;
class MessageService {
  constructor() {
    // Replace these with your own Twilio credentials
    this.twilioAccountSid = accountSid;
    this.twilioAuthToken = authToken;
    this.twilioPhoneNumber = '+18658003864'; // Your Twilio number (must be different than target)
    this.isSmsEnabled = true; // Set to true to enable SMS
    this.isDevelopment = false; // Set to false to actually send SMS
  }

  /**
   * Send SMS notification to a doctor about a high-risk patient
   * @param {string} doctorId - The doctor's ID
   * @param {object} patient - The patient data
   * @param {object} riskAssessment - The bedsore risk assessment data
   * @returns {Promise<object>} - Response from the SMS service
   */
  async sendBedsoreRiskAlert(doctorId, patient, riskAssessment) {
    try {
      console.log(`Preparing bedsore risk alert for doctor ${doctorId} about patient ${patient.id}`);
      
      // Get doctor data to retrieve phone number
      const doctorSnapshot = await get(ref(database, `users/${doctorId}`));
      if (!doctorSnapshot.exists()) {
        throw new Error(`Doctor with ID ${doctorId} not found`);
      }
      
      const doctorData = doctorSnapshot.val();
      const doctorPhone = doctorData.phoneNumber;
      
      if (!doctorPhone) {
        throw new Error('Doctor phone number not found');
      }
      
      // Get patient name from different possible sources
      const patientName = patient.name || 
                         patient.healthData?.fullName || 
                         patient.healthData?.name || 
                         `Patient #${patient.patientNumber}`;
      
      // Format message
      const message = `URGENT: Patient ${patientName} has been identified with ${riskAssessment.riskLevel} bedsore risk. Please review their case immediately.`;
      
      console.log(`SMS Alert would be sent to ${doctorPhone}: ${message}`);
      
      // Check if SMS is enabled
      if (!this.isSmsEnabled) {
        console.log('SMS notifications are disabled. Enable in settings or via configuration.');
        return {
          success: false,
          message: 'SMS notifications are disabled',
          twilioResponse: null
        };
      }
      
      // Send SMS via Twilio API
      return await this.sendSmsViaTwilio(doctorPhone, message);
      
    } catch (error) {
      console.error('Error sending bedsore risk alert:', error);
      return {
        success: false,
        message: error.message,
        twilioResponse: null
      };
    }
  }
  
  /**
   * Send SMS using Twilio API
   * @param {string} to - Recipient phone number
   * @param {string} body - Message body
   * @returns {Promise<object>} - Twilio API response
   */
  async sendSmsViaTwilio(to, body) {
    try {
        // FIXED: Use the provided phone number instead of hardcoding emergency number
        const targetNumber = to;
        
        // In development mode, just log the message
        if (this.isDevelopment) {
          console.log('DEV MODE - Would send SMS:', { to: targetNumber, body });
          return {
            success: true,
            message: 'SMS logged (development mode)',
            twilioResponse: null
          };
        }
      
      // Format phone number to E.164 format if needed
      const formattedPhone = this.formatPhoneNumber(targetNumber);
      
      // Twilio API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      
      // Create form data for Twilio API
      const formData = new URLSearchParams();
      formData.append('To', formattedPhone);
      formData.append('From', this.twilioPhoneNumber);
      formData.append('Body', body);
      
      // Make API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${this.twilioAccountSid}:${this.twilioAuthToken}`)
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Twilio API error: ${data.message || 'Unknown error'}`);
      }
      
      console.log('SMS sent successfully:', data.sid);
      
      return {
        success: true,
        message: 'SMS sent successfully',
        twilioResponse: data
      };
      
    } catch (error) {
      console.error('Error sending SMS via Twilio:', error);
      return {
        success: false,
        message: error.message,
        twilioResponse: null
      };
    }
  }
  
  /**
   * Format phone number to E.164 format for Twilio
   * @param {string} phoneNumber - The phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      // Default to US/Canada (+1) if no country code
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Send a test SMS
   * @param {string} phoneNumber - Phone number to send test to
   * @returns {Promise<object>} - Response from SMS service
   */
  async sendTestSms(phoneNumber) {
    const message = 'This is a test message from your Healthcare App';
    return await this.sendSmsViaTwilio(phoneNumber, message);
  }
  
  /**
   * Send emergency SMS to a specific number
   * @param {string} message - SMS message content
   * @returns {Promise<object>} - Response from SMS service
   */
  async sendEmergencySms(message = 'Emergency alert from Healthcare App') {
    const emergencyNumber = '+9193532 67558'; // Your emergency number
    console.log(`Sending emergency message to ${emergencyNumber}: ${message}`);
    return await this.sendSmsViaTwilio(emergencyNumber, message);
  }
  
  /**
   * Update configuration settings
   * @param {object} config - New configuration settings
   * @returns {MessageService} - This instance for chaining
   */
  updateConfig(config) {
    if (config.twilioAccountSid) this.twilioAccountSid = config.twilioAccountSid;
    if (config.twilioAuthToken) this.twilioAuthToken = config.twilioAuthToken;
    if (config.twilioPhoneNumber) this.twilioPhoneNumber = config.twilioPhoneNumber;
    if (config.isSmsEnabled !== undefined) this.isSmsEnabled = config.isSmsEnabled;
    if (config.isDevelopment !== undefined) this.isDevelopment = config.isDevelopment;
    
    console.log('MessageService configuration updated');
    return this;
  }
}

// Create and export singleton instance
const messageService = new MessageService();
export default messageService;