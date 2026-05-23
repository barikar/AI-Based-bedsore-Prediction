import React, { useState } from 'react';
import messageService from '../services/MessageService';

const SmsTestComponent = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  const handleSendTest = async () => {
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await messageService.sendTestSms(phoneNumber);
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleConfigVisible = () => {
    setConfigVisible(!configVisible);
  };

  const updateConfig = () => {
    try {
      // Update the MessageService configuration directly
      messageService.updateConfig({
        twilioAccountSid: twilioConfig.accountSid,
        twilioAuthToken: twilioConfig.authToken,
        twilioPhoneNumber: twilioConfig.phoneNumber,
        isSmsEnabled: true
      });
      
      // Save to localStorage for persistence (in a real app, you might store in your database)
      localStorage.setItem('twilioConfig', JSON.stringify({
        accountSid: twilioConfig.accountSid,
        phoneNumber: twilioConfig.phoneNumber,
        // Don't save the auth token to localStorage for security reasons
      }));
      
      setResult({
        success: true,
        message: 'Twilio configuration updated successfully'
      });
    } catch (error) {
      setResult({
        success: false,
        message: `Error updating configuration: ${error.message}`
      });
    }
  };

  return (
    <div className="sms-test-container">
      <h2>SMS Notification Test</h2>
      
      <div className="input-group">
        <label>Doctor's Phone Number</label>
        <input 
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number (e.g., +1234567890)"
        />
      </div>
      
      <button 
        className="test-button"
        onClick={handleSendTest}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Test SMS'}
      </button>
      
      {result && (
        <div className={`result-box ${result.success ? 'success' : 'error'}`}>
          <h3>{result.success ? 'Success' : 'Error'}</h3>
          <p>{result.message}</p>
          {result.twilioResponse && (
            <pre>{JSON.stringify(result.twilioResponse, null, 2)}</pre>
          )}
        </div>
      )}
      
      <button 
        className="config-toggle"
        onClick={toggleConfigVisible}
      >
        {configVisible ? 'Hide Twilio Configuration' : 'Show Twilio Configuration'}
      </button>
      
      {configVisible && (
        <div className="config-section">
          <h3>Twilio Configuration</h3>
          <p className="config-note">
            In a production application, these values should be stored as environment variables
            and not hardcoded or exposed in the user interface.
          </p>
          
          <div className="input-group">
            <label>Account SID</label>
            <input 
              type="text"
              value={twilioConfig.accountSid}
              onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})}
              placeholder="Twilio Account SID"
            />
          </div>
          
          <div className="input-group">
            <label>Auth Token</label>
            <input 
              type="password"
              value={twilioConfig.authToken}
              onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})}
              placeholder="Twilio Auth Token"
            />
          </div>
          
          <div className="input-group">
            <label>Twilio Phone Number</label>
            <input 
              type="text"
              value={twilioConfig.phoneNumber}
              onChange={(e) => setTwilioConfig({...twilioConfig, phoneNumber: e.target.value})}
              placeholder="Twilio Phone Number"
            />
          </div>
          
          <button 
            className="update-config-button"
            onClick={updateConfig}
          >
            Update Configuration
          </button>
        </div>
      )}
      
      <div className="setup-instructions">
        <h3>Setup Instructions</h3>
        <ol>
          <li>Create a <a href="https://www.twilio.com/" target="_blank" rel="noopener noreferrer">Twilio account</a></li>
          <li>Get your Account SID and Auth Token from the Twilio dashboard</li>
          <li>Purchase a phone number from Twilio</li>
          <li>Add the following environment variables to your .env file:
            <pre>
              REACT_APP_TWILIO_ACCOUNT_SID=your_account_sid<br/>
              REACT_APP_TWILIO_AUTH_TOKEN=your_auth_token<br/>
              REACT_APP_TWILIO_PHONE_NUMBER=your_twilio_phone<br/>
              REACT_APP_SMS_NOTIFICATIONS=true
            </pre>
          </li>
          <li>Restart your application</li>
        </ol>
      </div>
      
      <style jsx>{`
        .sms-test-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h2 {
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
          margin-top: 0;
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .test-button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 12px 20px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
        }
        
        .test-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .result-box {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
        }
        
        .success {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }
        
        .error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }
        
        pre {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }
        
        .config-toggle {
          background: none;
          border: 1px solid #ddd;
          padding: 8px 15px;
          margin-top: 20px;
          border-radius: 4px;
          cursor: pointer;
          color: #333;
        }
        
        .config-section {
          margin-top: 20px;
          padding: 15px;
          background-color: #fff;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .config-note {
          color: #721c24;
          background-color: #f8d7da;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        
        .update-config-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }
        
        .setup-instructions {
          margin-top: 30px;
          padding: 15px;
          background-color: #fff;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .setup-instructions h3 {
          margin-top: 0;
        }
        
        .setup-instructions ol {
          padding-left: 20px;
        }
        
        .setup-instructions li {
          margin-bottom: 10px;
        }
        
        .setup-instructions pre {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
};

export default SmsTestComponent;