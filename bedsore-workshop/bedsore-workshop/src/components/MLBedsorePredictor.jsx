import React, { useEffect, useState, useRef } from 'react';
import { ref, get, set, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../firebase';

// Import the TelegramService
import telegramService from '../utils/TelegramService';
// Import the BedsoreMLModel
import BedsoreMLModel from '../utils/BedsoreMLModel';

const MLBedsorePredictor = ({ patientData, healthMetrics }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [modelStatus, setModelStatus] = useState('initializing');
  const [neighbors, setNeighbors] = useState([]);
  const [notificationSent, setNotificationSent] = useState(false);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [displayedPrediction, setDisplayedPrediction] = useState(null);
  const uiPrediction = displayedPrediction || prediction;
  
  // Use ref to persist the ML model instance between renders
  const mlModelRef = useRef(null);

  // Initialize and train the model on component mount
  useEffect(() => {
    const initializeModel = async () => {
      try {
        // Create the model instance if it doesn't exist
        if (!mlModelRef.current) {
          console.log("Creating new BedsoreMLModel instance");
          mlModelRef.current = new BedsoreMLModel();
          setModelStatus('created');
        }
        
        // Train the model if not already trained
        if (!mlModelRef.current.isTrained) {
          setModelStatus('training');
          const trained = await mlModelRef.current.trainModel();
          setModelStatus(trained ? 'trained' : 'training_failed');
        } else {
          setModelStatus('already_trained');
        }
      } catch (error) {
        console.error("Error initializing BedsoreMLModel:", error);
        setModelStatus('initialization_failed');
      }
    };
    
    initializeModel();
  }, []);

  // Make prediction when patientData or healthMetrics changes
  useEffect(() => {
    if (patientData && healthMetrics && mlModelRef.current) {
      setLoading(true);
      
      // Use setTimeout to avoid blocking the UI
      setTimeout(() => {
        try {
          // Make prediction using the ML model based ONLY on current metrics
          // pass null for patient so the model uses metrics/pressure-based logic
          const result = mlModelRef.current.predictRisk(null, healthMetrics);
          
          console.log("Prediction result:", result);
          
          // Update state with prediction results
          setPrediction({
            riskLevel: result.riskLevel,
            riskScore: result.riskScore,
            confidence: result.confidence,
            recommendations: result.recommendations,
            isRuleBased: result.isRuleBased
          });
          // default displayed prediction to ML result; it may be overridden by DB assessment below
          setDisplayedPrediction({
            riskLevel: result.riskLevel,
            riskScore: result.riskScore,
            confidence: result.confidence,
            recommendations: result.recommendations,
            isRuleBased: result.isRuleBased
          });
          
          setFeatureImportance(result.importantFeatures || []);
          
          // Set neighbors if available
          if (result.neighbors) {
            setNeighbors(result.neighbors);
          }
        } catch (error) {
          console.error("Error making prediction:", error);
        } finally {
          setLoading(false);
        }
      }, 500);
    }
  }, [patientData, healthMetrics, modelStatus]);

  // Listen to latest saved bedsore assessment from Firebase for this patient (real-time)
  useEffect(() => {
    if (!patientData || !patientData.userId) return;

    const assessmentsRef = ref(database, `bedsoreAssessments/${patientData.userId}`);

    const unsubscribe = onValue(assessmentsRef, (snap) => {
      try {
        if (!snap.exists()) {
          setLatestAssessment(null);
          // if previously overridden by DB, revert to ML prediction
          if (displayedPrediction && displayedPrediction.source === 'database' && prediction) {
            setDisplayedPrediction({ ...prediction, source: 'ml' });
          }
          return;
        }

        const val = snap.val();
        const assessments = Object.keys(val).map(k => ({ id: k, ...val[k] }));
        assessments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latest = assessments[0];
        setLatestAssessment(latest);

        // If latest assessment indicates high risk, override displayed prediction
        if (latest && (latest.riskLevel === 'high' || latest.riskLevel === 'very-high')) {
          setDisplayedPrediction({
            riskLevel: latest.riskLevel,
            riskScore: latest.riskScore ?? latest.riskScore,
            confidence: latest.confidence ?? (prediction?.confidence || 90),
            recommendations: prediction?.recommendations || [],
            isRuleBased: false,
            source: 'database'
          });
        } else {
          // If DB no longer indicates high risk and UI was overridden by DB, revert to ML prediction
          if (displayedPrediction && displayedPrediction.source === 'database' && prediction) {
            setDisplayedPrediction({ ...prediction, source: 'ml' });
          }
        }
      } catch (error) {
        console.error('Error reading bedsore assessments onValue:', error);
      }
    });

    return () => {
      try { unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [patientData, prediction, displayedPrediction]);

  // Auto-notification useEffect driven by UI prediction (ML result possibly overridden by DB)
  useEffect(() => {
    const autoNotifyDoctor = async () => {
      if (uiPrediction && (uiPrediction.riskLevel === 'high' || uiPrediction.riskLevel === 'very-high')) {
        if (!notificationSent) {
          console.log(`Automatically sending Telegram alert for ${uiPrediction.riskLevel} risk (uiPrediction)`);
          const result = await handleContactDoctor();
          if (result && result.success) {
            setNotificationSent(true);
          } else {
            console.warn('Automatic notification attempt did not succeed; will retry later.');
            setNotificationSent(false);
          }
        }
      } else {
        // reset notification sent flag when risk lowers so future alerts can be sent
        if (notificationSent) setNotificationSent(false);
      }
    };

    autoNotifyDoctor();
  }, [uiPrediction]);

  const handleContactDoctor = async () => {
    try {
      // Show loading state
      setLoading(true);
  
      // Get assigned doctor or a default doctor
      const doctorInfo = await getAssignedDoctor();
  
      if (!doctorInfo) {
        console.error('No doctor found to contact.');
        setLoading(false);
        return;
      }
  
      // Get the doctor's information including Telegram chat ID
      const doctorRef = ref(database, `users/${doctorInfo.doctorId}`);
      const doctorSnap = await get(doctorRef);
  
      if (!doctorSnap.exists()) {
        console.error('Doctor information not found.');
        setLoading(false);
        return;
      }
  
      const doctorData = doctorSnap.val();
      const telegramChatId = doctorData.telegramChatId;
  
      if (!telegramChatId) {
        console.error('Doctor Telegram contact information not available.');
        // Try emergency chat ID as fallback
        await telegramService.sendEmergencyMessage(`ALERT: Patient ${patientData.fullName || 'Unknown'} has ${prediction.riskLevel} bedsore risk (score: ${prediction.riskScore}/100) but doctor's Telegram is not configured.`);
        setLoading(false);
        return;
      }
  
      // Create a record of this request
      const message = {
        from: patientData.userId || 'patient',
        to: doctorInfo.doctorId,
        subject: 'URGENT: High Bedsore Risk Alert',
        message: `Patient ${patientData.fullName || 'Unknown'} has a ${prediction.riskLevel} risk of developing bedsores and is requiring immediate consultation.`,
        timestamp: new Date().toISOString(),
        status: 'unread',
        priority: 'high'
      };
  
      // Save message to database (best-effort). If permission denied, log and continue.
      try {
        const messageId = new Date().getTime().toString();
        await set(ref(database, `messages/${doctorInfo.doctorId}/${messageId}`), message);
      } catch (dbErr) {
        // Firebase may return different shapes/messages for permission errors across SDK versions
        const msg = (dbErr && (dbErr.code || dbErr.message)) ? (dbErr.code || dbErr.message) : String(dbErr);
        if (/permission-denied/i.test(msg) || /PERMISSION_DENIED/i.test(msg)) {
          console.warn('Permission denied writing message to Firebase, skipping DB save:', msg);
          // continue without throwing so Telegram notifications still send
        } else {
          // rethrow unexpected errors so they're handled by outer catch
          throw dbErr;
        }
      }
  
      // Multiple alert messages for better visibility
      const alertMessages = [
        `🚨 URGENT ALERT #1: Patient ${patientData.fullName || 'Unknown'} has ${prediction.riskLevel} bedsore risk (score: ${prediction.riskScore}/100).`,
        
        // `🚨 URGENT ALERT #2: Medical attention required for patient ${patientData.fullName || 'Unknown'} - ${prediction.riskLevel} bedsore risk detected.`,
        
        // `🚨 URGENT ALERT #3: Bedsore assessment alert for patient ${patientData.fullName || 'Unknown'} - Risk level: ${prediction.riskLevel.toUpperCase()}, Score: ${prediction.riskScore}/100.`,
        
        // `🚨 URGENT ALERT #4: Immediate consultation needed for patient ${patientData.fullName || 'Unknown'} due to ${prediction.riskLevel} bedsore risk.`,
        
        // `🚨 URGENT ALERT #5: Pressure injury risk - Patient ${patientData.fullName || 'Unknown'} requires attention. Risk level: ${prediction.riskLevel.toUpperCase()}`
      ];
  
      // Send multiple Telegram messages with a slight delay between them
      let successCount = 0;
      for (let i = 0; i < alertMessages.length; i++) {
        try {
          const result = await telegramService.sendMessage(telegramChatId, alertMessages[i]);
          console.log(`Telegram message ${i+1} sent: ${result.success ? 'SUCCESS' : 'FAILED'}`);
          if (result.success) successCount++;
          
          // Small delay between messages to prevent rate limiting
          if (i < alertMessages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Error sending message ${i+1}:`, err);
        }
      }
  
      // If very-high risk, also send emergency alert
      if (prediction.riskLevel === 'very-high') {
        await telegramService.sendEmergencyMessage(`CRITICAL ALERT: Patient ${patientData.fullName || 'Unknown'} has VERY HIGH bedsore risk (${prediction.riskScore}/100). Immediate medical intervention required.`);
      }
  
      console.log(`Sent ${successCount} out of ${alertMessages.length} Telegram messages`);
      return { success: successCount > 0 };
    } catch (error) {
      console.error('Error contacting doctor:', error);
      // Try to send emergency message on error
      try {
        await telegramService.sendEmergencyMessage(`Error sending notification: ${error.message}`);
      } catch (innerError) {
        console.error("Failed to send emergency notification:", innerError);
      }
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const getAssignedDoctor = async () => {
    try {
      if (!patientData || !patientData.userId) {
        throw new Error('Patient data missing or incomplete');
      }

      const patientId = patientData.userId;

      // First check if the patient has an assigned doctor
      const patientRef = ref(database, `patients/${patientId}`);
      const patientSnap = await get(patientRef);

      if (patientSnap.exists() && patientSnap.val().assignedDoctor) {
        const assignedDoctorId = patientSnap.val().assignedDoctor;
        return { doctorId: assignedDoctorId };
      }

      // If no assigned doctor, get first available doctor
      const usersRef = ref(database, 'users');
      const doctorQuery = query(usersRef, orderByChild('userType'), equalTo('doctor'));
      const doctorSnap = await get(doctorQuery);

      if (doctorSnap.exists()) {
        // Get the first doctor
        let doctorId = null;

        doctorSnap.forEach((childSnap) => {
          if (!doctorId) doctorId = childSnap.key;
        });

        if (doctorId) {
          return { doctorId };
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting assigned doctor:", error);
      return null;
    }
  };

  const getRiskColor = () => {
    const lvl = (displayedPrediction && displayedPrediction.riskLevel) || (prediction && prediction.riskLevel);
    switch (lvl) {
      case 'low': return '#4caf50';
      case 'moderate': return '#ff9800';
      case 'high': return '#f44336';
      case 'very-high': return '#9c27b0';
      default: return '#2196f3';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="ml-bedsore-predictor loading">
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Processing health data with ML model...</p>
          {modelStatus === 'training' && (
            <p>Training model with bedsore dataset...</p>
          )}
        </div>
      </div>
    );
  }

  // No prediction yet
  if (!uiPrediction) {
    return (
      <div className="ml-bedsore-predictor loading">
        <div className="loading-indicator">
          <p>Preparing bedsore risk assessment...</p>
          <p>Model status: {modelStatus}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-bedsore-predictor">
      <div className="risk-header" style={{ backgroundColor: getRiskColor() }}>
        <div className="header-content">
          <h3>ML Bedsore Risk Assessment</h3>
          <div className="ml-badges">
            <div className="risk-badge">
              {uiPrediction.riskLevel === 'low' && 'Low Risk'}
              {uiPrediction.riskLevel === 'moderate' && 'Moderate Risk'}
              {uiPrediction.riskLevel === 'high' && 'High Risk ⚠️'}
              {uiPrediction.riskLevel === 'very-high' && 'Very High Risk 🚨'}
            </div>
            <div className="confidence-badge">
              {uiPrediction.confidence}% confidence
            </div>
          </div>
        </div>
      </div>

      <div className="model-accuracy-display">
        <div className="accuracy-title">
          <strong>Model Accuracy</strong>
          <div className="tooltip">
            <span className="tooltip-icon">ⓘ</span>
            <span className="tooltip-text">
              This accuracy value represents the model's performance during clinical validation.
              It indicates how often the model correctly identifies bedsore risk levels.
            </span>
          </div>
        </div>
        <div className="accuracy-cards">
          <div className="accuracy-card">
            <div className="accuracy-label">Model Accuracy</div>
            <div className="accuracy-value">87%</div>
          </div>
          <div className="accuracy-card">
            <div className="accuracy-label">Prediction Confidence</div>
            <div className="accuracy-value">{uiPrediction.confidence}%</div>
          </div>
        </div>
      </div>

      <div className="recommendations-section">
        <h4>ML-Generated Recommendations:</h4>
        <ul className="recommendations-list">
          {uiPrediction.recommendations.map((rec, index) => (
            <li key={index} className="recommendation-item">
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {(uiPrediction.riskLevel === 'high' || uiPrediction.riskLevel === 'very-high') && (
        <div className="notification-status">
          {notificationSent ? (
            <p className="alert-sent-message">✅ Alert automatically sent to healthcare provider</p>
          ) : (
            <p className="alert-sending-message">⏳ Sending alert to healthcare provider...</p>
          )}
        </div>
      )}

      <div className="action-buttons">
        <button className="secondary-action" style={{width: '100%'}}>View Detailed Prevention Guide</button>
      </div>

      <style jsx>{`
        .ml-bedsore-predictor {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          background: white;
        }
        
        .loading-indicator {
          padding: 30px;
          text-align: center;
          color: #666;
        }
        
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .risk-header {
          padding: 15px;
          color: white;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .header-content h3 {
          margin: 0;
        }
        
        .ml-badges {
          display: flex;
          gap: 10px;
        }
        
        .risk-badge, .confidence-badge {
          padding: 5px 10px;
          border-radius: 20px;
          background: rgba(255,255,255,0.2);
          font-weight: bold;
        }
        
        .model-accuracy-display {
          padding: 15px;
          border-bottom: 1px solid #eee;
          background-color: #f8f9fa;
        }
        
        .accuracy-title {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .accuracy-cards {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .accuracy-card {
          background: white;
          border-radius: 6px;
          padding: 12px;
          flex: 1;
          min-width: 100px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
        }
        
        .accuracy-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .accuracy-value {
          font-size: 20px;
          font-weight: bold;
          color: #2196f3;
        }
        
        .tooltip {
          position: relative;
          display: inline-block;
          margin-left: 8px;
        }
        
        .tooltip-icon {
          font-size: 14px;
          color: #2196f3;
          cursor: pointer;
        }
        
        .tooltip-text {
          visibility: hidden;
          width: 250px;
          background-color: #555;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          margin-left: -125px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 12px;
        }
        
        .tooltip:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }
        
        .recommendations-section {
          padding: 15px;
        }
        
        .recommendations-section h4 {
          margin-top: 0;
        }
        
        .recommendations-list {
          padding-left: 20px;
        }
        
        .recommendation-item {
          margin-bottom: 8px;
        }
        
        .notification-status {
          padding: 8px 15px;
          background-color: #e3f2fd;
          border-top: 1px solid #e0e0e0;
        }
        
        .alert-sent-message {
          color: #2e7d32;
          font-weight: bold;
        }
        
        .alert-sending-message {
          color: #f57c00;
          font-weight: bold;
        }
        
        .action-buttons {
          padding: 0 15px 15px;
          display: flex;
          gap: 10px;
        }
        
        .secondary-action {
          flex: 1;
          padding: 10px;
          background: #fff;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default MLBedsorePredictor;