// MonitoringService.js
// This service continuously monitors patient data in the background
// and automatically triggers risk assessments and notifications

import { ref, get, onValue, query, orderByChild, equalTo, set } from 'firebase/database';
import { database } from '../firebase';
import messageService from './MessageService';
import telegramService from './TelegramService';

class MonitoringService {
  constructor() {
    this.isInitialized = false;
    this.monitoringIntervals = {};
    this.assessmentResults = {};
    this.lastNotificationTimes = {};
    this.emergencyNumber = '+919353267558';
    this.monitoringStopped = false;
  }

  // Start continuous monitoring for all patients
  initialize() {
    if (this.isInitialized) return;
    
    console.log('Starting automatic patient monitoring service...');
    
    // Set up database listeners for patient data
    this.setupPatientDataListeners();
    
    // Set up periodic monitoring for all patients
    this.startPeriodicMonitoring();
    
    this.isInitialized = true;
  }

  // Set up real-time listeners for patient data changes
  setupPatientDataListeners() {
    try {
      // Listen for all patients
      const usersRef = ref(database, 'users');
      const patientQuery = query(usersRef, orderByChild('userType'), equalTo('patient'));
      
      onValue(patientQuery, (snapshot) => {
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const patientId = childSnapshot.key;
            
            // Set up monitoring for this patient if not already monitoring
            if (!this.monitoringIntervals[patientId]) {
              this.setupPatientMonitoring(patientId);
            }
          });
        }
      });
      
      // Listen for BSP (sensor) data changes
      const bspRef = ref(database, 'BSP');
      onValue(bspRef, this.handleHealthDataChange.bind(this));
      
      // Also listen for health records changes
      const healthRecordsRef = ref(database, 'healthRecords');
      onValue(healthRecordsRef, this.handleHealthDataChange.bind(this));
      
      // Listen for environment data changes
      const envDataRef = ref(database, 'environmentData');
      onValue(envDataRef, this.handleEnvironmentDataChange.bind(this));
      
    } catch (error) {
      console.error('Error setting up patient data listeners:', error);
    }
  }

  // Set up monitoring for an individual patient
  setupPatientMonitoring(patientId) {
    if (this.monitoringIntervals[patientId]) return;
    
    console.log(`Starting automatic monitoring for patient: ${patientId}`);
    
    // Listen for changes to this patient's health records
    const healthRecordsRef = ref(database, `healthRecords/${patientId}`);
    onValue(healthRecordsRef, (snapshot) => {
      if (snapshot.exists()) {
        this.assessPatientRisk(patientId);
      }
    });
    
    // Also start a timer to periodically check this patient (every 15 minutes)
    this.monitoringIntervals[patientId] = setInterval(() => {
      if (!this.monitoringStopped) {
        this.assessPatientRisk(patientId);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  // Handler for health data changes
  async handleHealthDataChange(snapshot) {
    if (!snapshot.exists() || this.monitoringStopped) return;
    
    const rawData = snapshot.val();
    console.log('Health data change detected:', rawData);
    
    // Handle BSP data structure - extract sensor values
    let data = {};
    
    // Check if this is a numbered sensor structure from BSP
    if (typeof rawData === 'object') {
      // Check for numeric keys (1, 2, 3, 4 from BSP sensors)
      const numericKeys = Object.keys(rawData).filter(k => !isNaN(k));
      
      if (numericKeys.length > 0) {
        // It's a sensor structure - extract pressure from each sensor
        data.backPressure_L = (rawData[1]?.pressure || 0);
        data.backPressure_R = (rawData[2]?.pressure || 0);
        data.legPressure_L = (rawData[3]?.pressure || 0);
        data.legPressure_R = (rawData[4]?.pressure || 0);
        data.shoulderPressure_L = (rawData[5]?.pressure || 0);
        data.shoulderPressure_R = (rawData[6]?.pressure || 0);
      } else {
        // It's a health record structure
        data = rawData;
      }
    } else {
      data = rawData;
    }
    
    // Skip if no meaningful data
    if (!data || (data.backPressure_L === 0 && data.backPressure_R === 0 && data.heart_rate === 0)) {
      return;
    }
    
    console.log('Processed health data for alerts:', data);
    
    // Check for warning flags
    if (data.warning && data.warning > 0) {
      console.log(`Warning flag detected in health data: ${data.warning}`);
      // Find which patient this data belongs to and assess them
      const patientId = await this.findPatientForHealthData();
      if (patientId) {
        this.assessPatientRisk(patientId, true); // true = urgent assessment
      }
    }
    
    // Check for concerning pressure values
    const highPressure = 
      data.backPressure_L > 80 || 
      data.backPressure_R > 80 || 
      data.shoulderPressure_L > 80 || 
      data.shoulderPressure_R > 80 || 
      data.legPressure_L > 80 || 
      data.legPressure_R > 80;
    
    if (highPressure) {
      console.log('High pressure detected in health data');
      const patientId = await this.findPatientForHealthData();
      if (patientId) {
        this.assessPatientRisk(patientId, true);
      }
    }
    
    // Check for ALL critical health metrics
    const alerts = [];
    
    // Heart Rate alerts
    if (data.heart_rate > 94) {
      alerts.push(`Heart Rate: ${data.heart_rate} bpm (Critical - above 94)`);
    }
    
    // Blood Pressure alerts
    if (data.bp_systolic >= 140 || data.bp_diastolic >= 90) {
      alerts.push(`Blood Pressure: ${data.bp_systolic}/${data.bp_diastolic} (High - Stage 2)`);
    } else if (data.bp_systolic >= 130 || data.bp_diastolic >= 80) {
      alerts.push(`Blood Pressure: ${data.bp_systolic}/${data.bp_diastolic} (Stage 1)`);
    }
    
    // Temperature alerts (too high or too low)
    if (data.temperature > 38.5) {
      alerts.push(`Temperature: ${data.temperature}°C (High fever)`);
    } else if (data.temperature < 36) {
      alerts.push(`Temperature: ${data.temperature}°C (Low - Hypothermia)`);
    }
    
    // SpO2 (Oxygen saturation) alerts
    if (data.spo2 < 95) {
      alerts.push(`SpO2: ${data.spo2}% (Low oxygen saturation)`);
    }
    
    // Humidity alerts (high humidity promotes bedsores)
    if (data.humidity > 70) {
      alerts.push(`Humidity: ${data.humidity}% (High - risk for skin breakdown)`);
    }
    
    // Pressure alerts (categorized by severity)
    const pressures = {
      'Back Left': data.backPressure_L,
      'Back Right': data.backPressure_R,
      'Leg Left': data.legPressure_L,
      'Leg Right': data.legPressure_R,
      'Shoulder Left': data.shoulderPressure_L,
      'Shoulder Right': data.shoulderPressure_R
    };
    
    for (const [location, pressure] of Object.entries(pressures)) {
      if (pressure > 0) {
        let severity = '';
        if (pressure > 100) {
          severity = 'Critical';
        } else if (pressure >= 80 && pressure <= 100) {
          severity = 'High';
        } else if (pressure >= 50 && pressure < 80) {
          severity = 'Medium';
        } else {
          severity = 'Low';
        }
        
        // Only send alert if severity is Medium or higher
        if (severity === 'Critical' || severity === 'High' || severity === 'Medium') {
          alerts.push(`${location} Pressure: ${pressure} (${severity})`);
        }
      }
    }
    
    // Duration alerts (prolonged immobility)
    if (data.duration_min > 120) {
      alerts.push(`Sitting Duration: ${data.duration_min} minutes (Extended immobility)`);
    }
    
    // Send alerts if any critical metrics detected
    if (alerts.length > 0) {
      console.log(`Critical health metrics detected: ${alerts.join(', ')}`);
      console.log('Finding patient ID for alerts...');
      const patientId = await this.findPatientForHealthData();
      console.log('Patient ID for alerts:', patientId);
      if (patientId) {
        // Send immediate Telegram notification with all alerts
        console.log('Sending Telegram alert for patient:', patientId);
        await this.sendVitalSignsAlert(patientId, data, alerts);
        // Also trigger urgent risk assessment
        this.assessPatientRisk(patientId, true);
      } else {
        console.log('No patient ID found - skipping alert');
      }
    } else {
      console.log('No critical metrics detected - data:', data);
    }
    
    // Check for long sitting duration
    if (data.sittingDuration > 120) { // More than 2 hours
      console.log(`Extended sitting duration detected: ${data.sittingDuration} minutes`);
      const patientId = await this.findPatientForHealthData();
      if (patientId) {
        this.assessPatientRisk(patientId);
      }
    }
  }

  // Handler for environment data changes
  async handleEnvironmentDataChange(snapshot) {
    if (!snapshot.exists() || this.monitoringStopped) return;
    
    const data = snapshot.val();
    
    // Check for high humidity
    const hasHighHumidity = Object.values(data).some(sensor => 
      sensor && sensor.humidity && sensor.humidity > 70
    );
    
    if (hasHighHumidity) {
      console.log('High humidity detected in environment data');
      const patientId = await this.findPatientForHealthData();
      if (patientId) {
        this.assessPatientRisk(patientId);
      }
    }
  }

  // Helper function to find the patient for current health data
  // In a real system, this would be a direct relationship
  async findPatientForHealthData() {
    try {
      // In a real system, you'd have a direct way to know which patient
      // is associated with the health data. Here we're using a dummy approach.
      
      // Get the first patient for demo purposes
      const usersRef = ref(database, 'users');
      const patientQuery = query(usersRef, orderByChild('userType'), equalTo('patient'));
      const snapshot = await get(patientQuery);
      
      if (snapshot.exists()) {
        let firstPatient = null;
        snapshot.forEach((childSnapshot) => {
          if (!firstPatient) {
            firstPatient = childSnapshot.key;
          }
        });
        return firstPatient;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding patient for health data:', error);
      return null;
    }
  }

  // Start periodic risk assessment for all patients
  startPeriodicMonitoring() {
    // Also check for any new patients every 30 minutes
    setInterval(async () => {
      if (this.monitoringStopped) return;
      
      try {
        console.log('Performing periodic check for all patients...');
        const usersRef = ref(database, 'users');
        const patientQuery = query(usersRef, orderByChild('userType'), equalTo('patient'));
        const snapshot = await get(patientQuery);
        
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const patientId = childSnapshot.key;
            this.assessPatientRisk(patientId);
          });
        }
      } catch (error) {
        console.error('Error in periodic monitoring:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Assess risk level for a specific patient
  async assessPatientRisk(patientId, isUrgent = false) {
    if (!patientId || this.monitoringStopped) return;
    
    try {
      console.log(`Automatically assessing risk for patient: ${patientId}`);
      
      // Check if we've assessed this patient recently (unless urgent)
      if (!isUrgent && this.recentlyAssessed(patientId)) {
        console.log(`Skipping assessment for patient ${patientId} - recently assessed`);
        return;
      }
      
      // Get patient health data
      const patientRef = ref(database, `patients/${patientId}`);
      const patientSnapshot = await get(patientRef);
      
      if (!patientSnapshot.exists()) {
        console.log(`No patient data found for ${patientId}`);
        return;
      }
      
      const patientData = patientSnapshot.val();
      
      // Get health metrics if available
      const healthMetrics = await this.getHealthMetrics();
      
      // Assess bedsore risk
      const risk = this.calculateBedsoreRisk(patientData, healthMetrics);
      
      console.log(`Risk assessment result for ${patientId}: ${risk.riskLevel} (${risk.riskScore})`);
      
      // Check previous assessment to see if risk has increased
      const previousRisk = await this.getPreviousRiskAssessment(patientId);
      
      // Save the new assessment
      this.saveRiskAssessment(patientId, risk);
      
      // Check if this is a new high risk or worsened risk
      const isHighRisk = risk.riskLevel === 'high' || risk.riskLevel === 'very-high';
      
      const isNewHighRisk = isHighRisk && (
        !previousRisk || 
        (previousRisk.riskLevel !== 'high' && previousRisk.riskLevel !== 'very-high')
      );
      
      const isWorseningRisk = isHighRisk && previousRisk && 
        risk.riskScore > previousRisk.riskScore + 10;
      
      // Send notification if needed
      if (isUrgent || isNewHighRisk || isWorseningRisk) {
        await this.sendRiskNotification(patientId, patientData, risk, isUrgent);
        this.lastNotificationTimes[patientId] = Date.now();
      }
      
      // Mark this patient as recently assessed
      this.assessmentResults[patientId] = {
        timestamp: Date.now(),
        result: risk
      };
      
    } catch (error) {
      console.error(`Error assessing risk for patient ${patientId}:`, error);
    }
  }

  // Check if we've assessed this patient recently (within the last hour)
  recentlyAssessed(patientId) {
    const lastAssessment = this.assessmentResults[patientId];
    if (!lastAssessment) return false;
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return lastAssessment.timestamp > oneHourAgo;
  }

  // Get previous risk assessment for a patient
  async getPreviousRiskAssessment(patientId) {
    try {
      const assessmentsRef = ref(database, `bedsoreAssessments/${patientId}`);
      const snapshot = await get(assessmentsRef);
      
      if (!snapshot.exists()) return null;
      
      let mostRecent = null;
      let mostRecentTime = 0;
      
      snapshot.forEach((childSnapshot) => {
        const assessment = childSnapshot.val();
        const timestamp = new Date(assessment.timestamp).getTime();
        
        if (timestamp > mostRecentTime) {
          mostRecent = assessment;
          mostRecentTime = timestamp;
        }
      });
      
      return mostRecent;
    } catch (error) {
      console.error(`Error getting previous risk assessment for ${patientId}:`, error);
      return null;
    }
  }

  // Save a new risk assessment
  async saveRiskAssessment(patientId, risk) {
    try {
      const timestamp = new Date().toISOString();
      const safeKey = timestamp.replace(/\./g, '_').replace(/:/g, '-');
      
      await set(ref(database, `bedsoreAssessments/${patientId}/${safeKey}`), {
        ...risk,
        timestamp,
        generatedAutomatically: true
      });
      
      console.log(`Saved risk assessment for patient ${patientId}`);
    } catch (error) {
      console.error(`Error saving risk assessment for ${patientId}:`, error);
    }
  }

  // Send notification for high-risk patient
  async sendRiskNotification(patientId, patientData, risk, isUrgent) {
    try {
      console.log(`Preparing to send notification for high-risk patient ${patientId}`);
      
      // Rate limiting - don't send another notification if we sent one recently
      const lastNotification = this.lastNotificationTimes[patientId];
      if (lastNotification) {
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        if (lastNotification > twoHoursAgo && !isUrgent) {
          console.log(`Skipping notification for ${patientId} - notified recently`);
          return;
        }
      }
      
      // Get assigned doctor
      const doctorId = await this.getAssignedDoctor(patientId);
      
      if (!doctorId) {
        console.log('No doctor found - sending to emergency number');
        await this.sendEmergencyNotification(patientData, risk);
        return;
      }
      
      // Get doctor data
      const doctorRef = ref(database, `users/${doctorId}`);
      const doctorSnapshot = await get(doctorRef);
      
      if (!doctorSnapshot.exists()) {
        console.log('Doctor record not found - sending to emergency number');
        await this.sendEmergencyNotification(patientData, risk);
        return;
      }
      
      const doctorData = doctorSnapshot.val();
      const doctorPhone = doctorData.phoneNumber;
      
      if (!doctorPhone) {
        console.log('Doctor phone not found - sending to emergency number');
        await this.sendEmergencyNotification(patientData, risk);
        return;
      }
      
      // Format patient name
      const patientName = patientData.fullName || patientData.name || `Patient ${patientId}`;
      
      // Create message based on risk level and urgency
      let message;
      
      if (isUrgent) {
        message = `URGENT ALERT: Patient ${patientName} requires IMMEDIATE attention. ${risk.riskLevel.toUpperCase()} bedsore risk (${risk.riskScore}/100) with urgent sensor readings.`;
      } else if (risk.riskLevel === 'very-high') {
        message = `CRITICAL ALERT: Patient ${patientName} has VERY HIGH bedsore risk (${risk.riskScore}/100). Immediate preventative measures required.`;
      } else {
        message = `ALERT: Patient ${patientName} has been identified with ${risk.riskLevel} bedsore risk (${risk.riskScore}/100). Please review their case.`;
      }
      
      // Send SMS notification
      const result = await messageService.sendSmsViaTwilio(doctorPhone, message);
      
      console.log(`Sent notification to doctor (${doctorId}) at ${doctorPhone}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      // For very high risk, also send to emergency number
      if (risk.riskLevel === 'very-high' || isUrgent) {
        await this.sendEmergencyNotification(patientData, risk);
      }
      
      return result;
    } catch (error) {
      console.error('Error sending notification:', error);
      await this.sendEmergencyNotification(patientData, risk);
    }
  }

  // Send notification to emergency number
  async sendEmergencyNotification(patientData, risk) {
    try {
      const patientName = patientData.fullName || patientData.name || 'Unknown patient';
      
      const message = `EMERGENCY ALERT: Patient ${patientName} has ${risk.riskLevel.toUpperCase()} bedsore risk (${risk.riskScore}/100) requiring immediate attention. This is a fallback notification.`;
      
      const result = await messageService.sendSmsViaTwilio(this.emergencyNumber, message);
      
      console.log(`Sent emergency notification: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return result;
    } catch (error) {
      console.error('Error sending emergency notification:', error);
    }
  }

  // Send Telegram alert for critical vital signs
  async sendVitalSignsAlert(patientId, healthData, alerts = []) {
    try {
      console.log(`Sending vital signs alert for patient ${patientId}`);
      
      // Get patient data
      const patientRef = ref(database, `patients/${patientId}`);
      const patientSnapshot = await get(patientRef);
      
      if (!patientSnapshot.exists()) {
        console.log(`Patient data not found for ${patientId}`);
        return;
      }
      
      const patientData = patientSnapshot.val();
      const patientName = patientData.fullName || patientData.name || `Patient ${patientId}`;
      
      // Create comprehensive alert message
      let message = `🚨 CRITICAL HEALTH ALERT\n\nPatient: ${patientName}\nID: ${patientId}\n\n`;
      
      if (alerts && alerts.length > 0) {
        message += `Critical Metrics:\n`;
        alerts.forEach(alert => {
          message += `⚠️ ${alert}\n`;
        });
      } else {
        // Fallback if no alerts array provided
        const alertReasons = [];
        if (healthData.heart_rate > 94) {
          alertReasons.push(`Heart Rate: ${healthData.heart_rate} bpm (above 94)`);
        }
        if (healthData.temperature > 38.5) {
          alertReasons.push(`Temperature: ${healthData.temperature}°C (High fever)`);
        }
        if (healthData.spo2 < 95) {
          alertReasons.push(`SpO2: ${healthData.spo2}% (Low)`);
        }
        if (healthData.humidity > 70) {
          alertReasons.push(`Humidity: ${healthData.humidity}% (High)`);
        }
        
        message += `Issues Detected:\n`;
        alertReasons.forEach(reason => {
          message += `⚠️ ${reason}\n`;
        });
      }
      
      message += `\nImmediate medical attention required!`;
      
      // Send Telegram notification
      const result = await telegramService.sendEmergencyMessage(message);
      
      console.log(`Vital signs alert sent: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return result;
    } catch (error) {
      console.error('Error sending vital signs alert:', error);
    }
  }

  // Get health metrics from the Firebase database
  async getHealthMetrics() {
    try {
      const healthDataRef = ref(database, 'healthData');
      const snapshot = await get(healthDataRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      return null;
    }
  }

  // Get assigned doctor for a patient
  async getAssignedDoctor(patientId) {
    try {
      const patientRef = ref(database, `patients/${patientId}`);
      const snapshot = await get(patientRef);
      
      if (snapshot.exists() && snapshot.val().assignedDoctor) {
        return snapshot.val().assignedDoctor;
      }
      
      // If no assigned doctor, find any doctor
      const usersRef = ref(database, 'users');
      const doctorQuery = query(usersRef, orderByChild('userType'), equalTo('doctor'));
      const doctorSnapshot = await get(doctorQuery);
      
      if (doctorSnapshot.exists()) {
        let firstDoctorId = null;
        doctorSnapshot.forEach((childSnapshot) => {
          if (!firstDoctorId) {
            firstDoctorId = childSnapshot.key;
          }
        });
        
        return firstDoctorId;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting assigned doctor for ${patientId}:`, error);
      return null;
    }
  }

  // Calculate bedsore risk (similar to logic in other components)
  calculateBedsoreRisk(patient, metrics) {
    let score = 0;

    // Add points for mobility
    if (patient.mobilityStatus === 'bedbound') score += 40;
    else if (patient.mobilityStatus === 'chairbound') score += 30;
    else if (patient.mobilityStatus === 'assistance') score += 20;

    // Add points for age
    if (patient.age > 70) score += 20;
    else if (patient.age > 60) score += 15;

    // Add points for medical conditions
    if (patient.hasDiabetes === 'yes') score += 15;
    
    // More points for Type 1 diabetes
    if (patient.hasDiabetes === 'yes' && patient.diabetesType === 'type1') {
      score += 10;
    }

    // Add points for incontinence
    if (patient.incontinence === 'both') score += 25;
    else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') score += 15;

    // Add points for BMI (if height and weight are available)
    if (patient.height && patient.weight) {
      const heightInMeters = patient.height / 100;
      const bmi = patient.weight / (heightInMeters * heightInMeters);

      if (bmi < 18.5 || bmi >= 30) score += 15;
    }

    // Add points if metrics show long sitting duration
    if (metrics && metrics.sittingDuration > 120) {
      score += 20;
    }

    // Add points for high pressure readings
    if (metrics) {
      if (metrics.backPressure_L > 80 || metrics.backPressure_R > 80) score += 15;
      if (metrics.shoulderPressure_L > 80 || metrics.shoulderPressure_R > 80) score += 15;
      if (metrics.legPressure_L > 80 || metrics.legPressure_R > 80) score += 15;
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, Math.max(0, score));

    // Determine risk level
    let riskLevel;
    if (normalizedScore < 20) riskLevel = 'low';
    else if (normalizedScore < 40) riskLevel = 'moderate';
    else if (normalizedScore < 60) riskLevel = 'high';
    else riskLevel = 'very-high';

    return {
      riskScore: normalizedScore,
      riskLevel,
      confidence: Math.round(70 + Math.random() * 25)
    };
  }

  // Stop all monitoring
  stop() {
    console.log('Stopping patient monitoring service...');
    this.monitoringStopped = true;
    
    // Clear all intervals
    Object.values(this.monitoringIntervals).forEach(interval => {
      clearInterval(interval);
    });
    
    this.monitoringIntervals = {};
    this.isInitialized = false;
  }
}

// Create and export singleton instance
const monitoringService = new MonitoringService();
export default monitoringService;