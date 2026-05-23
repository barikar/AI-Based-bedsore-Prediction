import React, { useEffect, useRef, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import ZegoManager from '../components/zegoManager';
import '../styles/VideoCall.css';

const VideoCall = ({ userId, role, callData, onEndCall }) => {
  const [status, setStatus] = useState('Initializing...');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const callContainerRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // Monitor call status changes
  useEffect(() => {
    if (!callData?.callId) return;
    
    const callRef = ref(database, `calls/${callData.callId}`);
    const unsubscribe = onValue(callRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.status === 'ended') {
        // Call was ended from the other side
        console.log('Call was ended remotely');
        if (isConnected) {
          ZegoManager.leaveRoom(false); // Don't update DB since we just read that it's ended
          setIsConnected(false);
          if (onEndCall) onEndCall();
        }
      }
    });
    
    return () => unsubscribe();
  }, [callData?.callId, isConnected, onEndCall]);

  useEffect(() => {
    // Skip if no call data or container not ready
    if (!callData || !callData.callId || !callContainerRef.current) return;
    
    // Skip if already initialized
    if (hasInitializedRef.current) return;
    
    // Mark as initialized to prevent duplicate calls
    hasInitializedRef.current = true;
    
    const callId = callData.callId;

    const initializeCall = async () => {
      try {
        setStatus('Connecting to call...');
        console.log('Initializing call with Zego:', callId, userId, role);
        
        // Join the room using our global manager
        const success = await ZegoManager.joinRoom(
          callId,
          userId,
          role,
          callContainerRef.current,
          {
            onJoinRoom: () => {
              console.log('Successfully joined call room!');
              setStatus('Connected');
              setIsConnected(true);
              setError(null);
              
              // Ensure container is visible
              if (callContainerRef.current) {
                callContainerRef.current.style.opacity = '1';
              }
            },
            onLeaveRoom: () => {
              console.log('Left call room');
              handleEndCall();
            },
            onUserLeave: (users) => {
              console.log('User left the call', users);
              // Only automatically end call if we're a patient and the doctor leaves
              if (role === 'patient') {
                handleEndCall();
              }
            },
            onError: (error) => {
              console.error('Call error:', error);
              setStatus('Connection error: ' + (error.message || 'Unknown error'));
              setError(error);
              setTimeout(() => handleEndCall(), 3000);
            }
          }
        );
        
        if (!success) {
          setStatus('Failed to join call');
          setError(new Error('Failed to join call'));
          setTimeout(() => handleEndCall(), 3000);
        }
      } catch (error) {
        console.error('Error initializing call:', error);
        setStatus('Failed to start call: ' + (error.message || 'Unknown error'));
        setError(error);
        setTimeout(() => handleEndCall(), 3000);
      }
    };

    initializeCall();

    // Clean up when unmounting
    return () => {
      // Only leave the room if this component was responsible for joining
      if (hasInitializedRef.current && ZegoManager.getCurrentCallId() === callId) {
        console.log('Component unmounting, leaving call');
        ZegoManager.leaveRoom(false); // Don't update database on unmount
      }
    };
  }, [callData?.callId, userId, role]);

  const handleEndCall = async () => {
    if (!callData) return;
    
    try {
      console.log('Ending call:', callData.callId);
      // Use the ZegoManager to leave the room and update status
      await ZegoManager.leaveRoom(true); // Update database
      
      setIsConnected(false);
      if (onEndCall) onEndCall();
    } catch (error) {
      console.error('Error ending call:', error);
      ZegoManager.leaveRoom(false); // Try again without database update
      if (onEndCall) onEndCall();
    }
  };

  return (
    <div className="video-call-container">
      {/* Overlay shown when call is connecting */}
      {!isConnected && (
        <div className="call-status-overlay">
          <div className="call-status-content">
            <div className="call-icon">
              {role === 'doctor' ? '👨‍⚕️' : '📞'}
            </div>
            <h2>
              {role === 'doctor' ? 'Calling patient...' : 'Connecting to doctor...'}
            </h2>
            <p>{status}</p>
            {error && (
              <p className="error-message">
                {error.message || 'Connection failed'}
              </p>
            )}
            <button className="end-call-button" onClick={handleEndCall}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Container for the Zegocloud UI */}
      <div 
        ref={callContainerRef} 
        className="zego-container"
        style={{ 
          width: '100%', 
          height: '90vh',
          opacity: isConnected ? 1 : 0.3,
          position: 'relative',
          zIndex: isConnected ? 10 : 1
        }}
      />
      
      {/* End call button shown when connected */}
      {isConnected && (
        <div className="custom-call-controls">
          <button className="end-call-button" onClick={handleEndCall}>
            End Call
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;