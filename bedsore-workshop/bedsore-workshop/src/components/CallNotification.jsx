import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '../firebase';
import '../styles/CallNotification.css';

const CallNotification = ({ call, onAccept, onDecline }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Handle accept button click
  const handleAccept = async () => {
    if (isProcessing || !call) return;
    
    setIsProcessing(true);
    try {
      // Update call status
      await update(ref(database, `calls/${call.callId}`), { 
        status: 'accepting' 
      });
      
      // Notify parent component
      if (onAccept) onAccept(call);
    } catch (error) {
      console.error('Error accepting call:', error);
      handleDecline();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle decline button click
  const handleDecline = async () => {
    if (isProcessing || !call) return;
    
    setIsProcessing(true);
    try {
      // Update call status
      await update(ref(database, `calls/${call.callId}`), { 
        status: 'declined',
        endTime: new Date().toISOString()
      });
      
      // Notify parent component
      if (onDecline) onDecline();
    } catch (error) {
      console.error('Error declining call:', error);
      if (onDecline) onDecline();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!call) return null;

  return (
    <div className="incoming-call-container">
      <div className="incoming-call-box">
        <div className="call-header">
          <h2>Incoming Video Call</h2>
        </div>
        
        <div className="caller-profile">
          <div className="caller-avatar">👨‍⚕️</div>
          <div className="caller-info">
            <div className="caller-name">
              {call.doctorName || `Dr. ${call.doctorId}`}
            </div>
            <div className="caller-role">Doctor</div>
          </div>
        </div>
        
        <div className="call-message">
          Your doctor is calling you for a video consultation
        </div>
        
        <div className="call-actions">
          <button 
            className="decline-button"
            onClick={handleDecline}
            disabled={isProcessing}
          >
            <span className="button-icon">❌</span>
            <span>Decline</span>
          </button>
          <button 
            className="accept-button"
            onClick={handleAccept}
            disabled={isProcessing}
          >
            <span className="button-icon">📞</span>
            <span>{isProcessing ? 'Connecting...' : 'Accept'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;