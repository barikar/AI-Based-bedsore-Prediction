// zegoManager.js - Improved singleton for managing Zegocloud instances

import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { ref, update } from 'firebase/database';
import { database } from '../firebase';

// Private variables for singleton
let _instance = null;
let _callId = null;
let _isJoining = false;
let _zegoView = null;

const ZegoManager = {
  /**
   * Join a Zegocloud room
   * @param {string} callId - The unique call ID
   * @param {string} userId - The user ID
   * @param {string} role - The user role ('doctor' or 'patient')
   * @param {HTMLElement} container - The DOM element to render the call UI
   * @param {Object} callbacks - Callback functions
   * @returns {Promise<boolean>} Success status
   */
  async joinRoom(callId, userId, role, container, callbacks = {}) {
    // Don't join if already joining or already in this call
    if (_isJoining || (_instance && _callId === callId)) {
      console.log(`Already joining or in call ${callId}`);
      if (_instance && _callId === callId && callbacks.onJoinRoom) {
        // If we're already in this call but the callback was requested, trigger it
        callbacks.onJoinRoom();
      }
      return true; // Return success since we're already connected
    }

    // If in a different call, leave it first
    if (_instance && _callId !== callId) {
      console.log(`Leaving existing call ${_callId} before joining ${callId}`);
      this.leaveRoom();
    }

    // Set joining flag
    _isJoining = true;
    _callId = callId;

    try {
      console.log(`Initializing call ${callId} for ${role}`);

      // Generate token - using consistent app credentials
      const appID =556258501;
      const serverSecret ="bde5ebde6ee65344da775f071969a46c";

      // Clear the container first
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const token = await ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        callId,
        userId,
        role // Keep lowercase role for consistency
      );

      // Create instance
      _instance = ZegoUIKitPrebuilt.create(token);

      // Configure ZegoCloud UI kit
      _zegoView = _instance.joinRoom({
        container,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showScreenSharingButton: true,
        showTurnOffRemoteCameraButton: true,
        showTurnOffRemoteMicrophoneButton: true,
        showRemoveUserButton: role === 'doctor', // Only doctors can remove users
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        showTextChat: true,
        showUserList: false, // Hide user list to simplify UI
        maxUsers: 2, // Limit to 2 users for 1-on-1 calls
        layout: "Auto", // Use automatic layout
        showLayoutButton: false, // Hide layout button
        showNonVideoUser: true, // Show users even if video is off
        showBottomMenuBar: true, // Show bottom control bar
        showPreJoinView: false, // Skip pre-join view for simpler UX
        preJoinViewConfig: { // Configure pre-join view if needed
          title: role === 'doctor' ? 'Doctor Call' : 'Patient Call',
        },
        onJoinRoom: () => {
          _isJoining = false;
          console.log(`${role} joined call ${callId}`);
          
          // Update call status if this is the patient joining
          if (role === 'patient') {
            update(ref(database, `calls/${callId}`), { status: 'accepted' })
              .catch(error => console.error(`Error updating call status for ${callId}:`, error));
          }
          
          // Show the zego component by making it visible
          if (container) {
            container.style.opacity = '1';
            container.style.zIndex = '10';
          }
          
          if (callbacks.onJoinRoom) callbacks.onJoinRoom();
        },
        onLeaveRoom: () => {
          console.log(`${role} left call ${callId}`);
          if (callbacks.onLeaveRoom) callbacks.onLeaveRoom();
        },
        onUserLeave: (users) => {
          console.log(`User left call ${callId}`, users);
          if (callbacks.onUserLeave) callbacks.onUserLeave(users);
        },
        onError: (error) => {
          _isJoining = false;
          console.error(`Call error:`, error);
          if (callbacks.onError) callbacks.onError(error);
        }
      });

      return true;
    } catch (error) {
      _isJoining = false;
      _callId = null;
      _instance = null;
      _zegoView = null;
      console.error('Error joining room:', error);
      if (callbacks.onError) callbacks.onError(error);
      return false;
    }
  },

  /**
   * Leave the current Zegocloud room and update database
   * @param {boolean} updateDatabase - Whether to update the call status in database
   */
  async leaveRoom(updateDatabase = true) {
    if (_instance) {
      const currentCallId = _callId;
      console.log(`Leaving call ${currentCallId}`);
      
      // Destroy the instance first
      _instance.destroy();
      _instance = null;
      _callId = null;
      _isJoining = false;
      _zegoView = null;
      
      // Update call status in Firebase if requested
      if (updateDatabase && currentCallId) {
        try {
          await update(ref(database, `calls/${currentCallId}`), {
            status: 'ended',
            endTime: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error updating call status for ${currentCallId}:`, error);
        }
      }
      
      return true;
    }
    return false;
  },

  /**
   * Check if currently in a call
   * @returns {boolean} True if in a call
   */
  isInCall() {
    return !!_instance;
  },

  /**
   * Get the current call ID
   * @returns {string|null} The current call ID or null
   */
  getCurrentCallId() {
    return _callId;
  },
  
  /**
   * Force a UI refresh of the ZegoCloud view
   * This can be useful if the UI is not displaying correctly
   */
  refreshUI() {
    if (_zegoView && typeof _zegoView.setLocalVideoView === 'function') {
      // This can trigger a UI refresh in some cases
      _zegoView.setLocalVideoView();
    }
  }
};

export default ZegoManager; 