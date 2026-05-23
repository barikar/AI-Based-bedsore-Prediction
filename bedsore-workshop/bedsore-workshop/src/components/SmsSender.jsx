import React, { useState, useEffect } from 'react';
import messageService from '../utils/MessageService';

const SmsSender = () => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('twilioConfig');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({
          accountSid: parsed.accountSid || '',
          authToken: '',  // Don't load auth token from storage for security
          phoneNumber: parsed.phoneNumber || ''
        });
      }
    } catch (error) {
      console.error('Error loading Twilio config:', error);
    }
  }, []);

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);
    
    try {
      // Send SMS to the target number
      const response = await messageService.sendSmsViaTwilio(
        config.phoneNumber || doctorData?.phoneNumber,
        message || "Test message from Healthcare App"
      );
      
      setResult(response);
      
      if (response.success) {
        // Clear message on success
        setMessage('');
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const updateConfig = () => {
    try {
      // Update message service configuration
      messageService.updateConfig({
        twilioAccountSid: config.accountSid,
        twilioAuthToken: config.authToken,
        twilioPhoneNumber: config.phoneNumber,
        isSmsEnabled: true,
        isDevelopment: false
      });
      
      // Save to localStorage (excluding auth token for security)
      localStorage.setItem('twilioConfig', JSON.stringify({
        accountSid: config.accountSid,
        phoneNumber: config.phoneNumber
      }));
      
      setResult({
        success: true,
        message: 'Twilio configuration updated successfully'
      });
    } catch (error) {
      setResult({
        success: false,
        message: `Failed to update configuration: ${error.message}`
      });
    }
  };

  return (
    <div className="sms-sender">
      <div className="message-input">
        <label>Message Text:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message here"
          rows={4}
        />
      </div>
      
      <button
        className="send-button"
        onClick={handleSend}
        disabled={isSending}
      >
        {isSending ? 'Sending...' : 'Send SMS To Patient'}
      </button>
      
      {result && (
        <div className={`result-box ${result.success ? 'success' : 'error'}`}>
          <h4>{result.success ? 'Success' : 'Error'}</h4>
          <p>{result.message}</p>
          {result.twilioResponse && (
            <pre>{JSON.stringify(result.twilioResponse, null, 2)}</pre>
          )}
        </div>
      )}
      
      <div className="config-section">
        <button
          className="toggle-config"
          onClick={() => setShowConfig(!showConfig)}
        >
          {showConfig ? 'Hide Twilio Configuration' : 'Show Twilio Configuration'}
        </button>
        
        {showConfig && (
          <div className="config-form">
            <div className="input-group">
              <label>Twilio Account SID:</label>
              <input
                type="text"
                value={config.accountSid}
                onChange={(e) => setConfig({...config, accountSid: e.target.value})}
                placeholder="Enter your Twilio Account SID"
              />
            </div>
            
            <div className="input-group">
              <label>Twilio Auth Token:</label>
              <input
                type="password"
                value={config.authToken}
                onChange={(e) => setConfig({...config, authToken: e.target.value})}
                placeholder="Enter your Twilio Auth Token"
              />
            </div>
            
            <div className="input-group">
              <label>Twilio Phone Number:</label>
              <input
                type="text"
                value={config.phoneNumber}
                onChange={(e) => setConfig({...config, phoneNumber: e.target.value})}
                placeholder="Enter your Twilio Phone Number"
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
      </div>
      
      <style jsx>{`
        .sms-sender {
          padding: 20px;
          border-radius: 8px;
          background-color: #f5f5f5;
        }
        
        .message-input {
          margin-bottom: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        textarea, input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
        }
        
        .send-button {
          width: 100%;
          padding: 12px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        
        .send-button:hover {
          background-color: #45a049;
        }
        
        .send-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .result-box {
          margin-top: 15px;
          padding: 12px;
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
        
        h4 {
          margin-top: 0;
          margin-bottom: 8px;
        }
        
        pre {
          white-space: pre-wrap;
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          max-height: 150px;
          overflow-y: auto;
        }
        
        .config-section {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
        }
        
        .toggle-config {
          background: none;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .config-form {
          margin-top: 15px;
        }
        
        .input-group {
          margin-bottom: 12px;
        }
        
        .update-config-button {
          padding: 10px;
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .update-config-button:hover {
          background-color: #0b7dda;
        }
      `}</style>
    </div>
  );
};

export default SmsSender;