import React, { useState, useEffect, useRef } from 'react';
import { ref, get, set, onValue, query, orderByChild, equalTo, update } from 'firebase/database';
import { database } from '../firebase';
import HealthForm from '../components/HealthForm';
import CallNotification from '../components/CallNotification';
import VideoCall from '../components/VideoCall';
import MLBedsorePredictor from '../components/MLBedsorePredictor';
import '../styles/PatientDashboard.css';
import telegramService from '../utils/TelegramService';
import HealthProgressTracker from '../components/HealthProgressTracker';

const PatientDashboard = ({ userId, onLogout }) => {
    const [userData, setUserData] = useState(null);
    const [healthData, setHealthData] = useState(null);
    const [bspData, setBspData] = useState({
        1: { force: 0, pressure: 0 }, 

        2: { force: 0, pressure: 0 },
        3: { force: 0, pressure: 0 },
        4: { force: 0, pressure: 0 }
    });
    const [patientHealthRecord, setPatientHealthRecord] = useState(null);
    const [healthHistory, setHealthHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [recentCalls, setRecentCalls] = useState([]);
    const [bedsoreHistory, setBedsoreHistory] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [warningTimestamp, setWarningTimestamp] = useState(null);
    const [doctorMessages, setDoctorMessages] = useState([]);

    const isReassessing = useRef(false);

    const fetchHealthHistory = async () => {
        try {
            const historyRef = ref(database, `healthRecords/${userId}`);
            const snapshot = await get(historyRef);

            if (snapshot.exists()) {
                const records = [];
                snapshot.forEach((childSnapshot) => {
                    records.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setHealthHistory(records);
            } else {
                setHealthHistory([]);
            }
        } catch (error) {
            console.error("Error fetching health history:", error);
        }
    };

    // Fetch bedsore assessment history for this patient (component scope)
    const fetchBedsoreHistory = async () => {
        try {
            const historyRef = ref(database, `bedsoreAssessments/${userId}`);
            const snapshot = await get(historyRef);

            if (snapshot.exists()) {
                const assessments = [];
                snapshot.forEach((childSnapshot) => {
                    assessments.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                assessments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setBedsoreHistory(assessments);
            } else {
                setBedsoreHistory([]);
            }
        } catch (error) {
            console.error("Error fetching bedsore history:", error);
        }
    };

    const fetchDoctorMessages = () => {
        const messagesRef = ref(database, `users/${userId}/messages`);
        
        const unsubscribe = onValue(messagesRef, (snapshot) => {
            try {
                if (snapshot.exists()) {
                    const messages = [];
                    snapshot.forEach((childSnapshot) => {
                        messages.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });

                    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setDoctorMessages(messages);
                } else {
                    setDoctorMessages([]);
                }
            } catch (error) {
                console.error("Error fetching doctor messages:", error);
                setDoctorMessages([]);
            }
        });

        return unsubscribe;
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userRef = ref(database, `users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    setUserData(snapshot.val());
                } else {
                    console.error("No user data found");
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching user data:", error);
                setLoading(false);
            }
        };

        const fetchHealthData = () => {
            // Listen to the BSP root which contains Pressure (sensors) and angle/heart/humidity/etc.
            const bspRootRef = ref(database, `BSP`);

            const unsubscribe = onValue(bspRootRef, (snapshot) => {
                if (!snapshot.exists()) {
                    console.log("No BSP data available");
                    setBspData({
                        1: { force: 0, pressure: 0 },
                        2: { force: 0, pressure: 0 },
                        3: { force: 0, pressure: 0 },
                        4: { force: 0, pressure: 0 }
                    });
                    setHealthData({
                        angle: 0,
                        heart: 0,
                        humidity: 0,
                        pressure: 0,
                        spo2: 0,
                        temp: 0
                    });
                    return;
                }

                const data = snapshot.val();
                console.log("BSP root Data received:", data);

                // Pressure sensors may live under data.Pressure or directly under numeric keys.
                const pressureNode = data.Pressure || data.pressure || {};

                setBspData({
                    1: {
                        force: pressureNode['1']?.force ?? pressureNode[1]?.force ?? 0,
                        pressure: pressureNode['1']?.pressure ?? pressureNode[1]?.pressure ?? 0
                    },
                    2: {
                        force: pressureNode['2']?.force ?? pressureNode[2]?.force ?? 0,
                        pressure: pressureNode['2']?.pressure ?? pressureNode[2]?.pressure ?? 0
                    },
                    3: {
                        force: pressureNode['3']?.force ?? pressureNode[3]?.force ?? 0,
                        pressure: pressureNode['3']?.pressure ?? pressureNode[3]?.pressure ?? 0
                    },
                    4: {
                        force: pressureNode['4']?.force ?? pressureNode[4]?.force ?? 0,
                        pressure: pressureNode['4']?.pressure ?? pressureNode[4]?.pressure ?? 0
                    }
                });

                // angle, heart, humidity, spo2, temp can be at the same BSP root
                // Blood pressure may be stored under several keys (Bp, BP, bp, bloodPressure, pressure)
                const bpRaw = data.Bp ?? data.BP ?? data.bp ?? data.bloodPressure ?? data.pressure ?? 0;

                setHealthData({
                    angle: data.angle ?? 0,
                    heart: data.heart ?? 0,
                    humidity: data.humidity ?? 0,
                    // store the raw BP value (could be a string like '148/94' or a numeric mmHg)
                    pressure: bpRaw,
                    spo2: data.spo2 ?? 0,
                    temp: data.temp ?? 0
                });
            });

            return () => unsubscribe();
        };

        const fetchPatientHealthRecord = async () => {
            try {
                const patientRef = ref(database, `patients/${userId}`);
                const snapshot = await get(patientRef);

                if (snapshot.exists()) {
                    setPatientHealthRecord(snapshot.val());
                } else {
                    console.log("No patient health record found");
                }
            } catch (error) {
                console.error("Error fetching patient health record:", error);
            }
        };

        // use the component-scoped `fetchBedsoreHistory` defined above

        const setupCallListener = () => {
            const callsRef = ref(database, 'calls');
            const patientCallsQuery = query(callsRef, orderByChild('patientId'), equalTo(userId));

            return onValue(patientCallsQuery, (snapshot) => {
                if (snapshot.exists()) {
                    const calls = [];
                    let pendingCall = null;

                    snapshot.forEach((childSnapshot) => {
                        const call = {
                            callId: childSnapshot.key,
                            ...childSnapshot.val()
                        };

                        calls.push(call);

                        if (call.status === 'pending' && !activeCall) {
                            pendingCall = call;
                        }

                        if (activeCall && call.callId === activeCall.callId) {
                            setActiveCall(call);
                            if (call.status === 'ended') {
                                setTimeout(() => setActiveCall(null), 2000);
                            }
                        }
                    });

                    calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setRecentCalls(calls.slice(0, 10));

                    if (pendingCall && pendingCall.status === 'pending') {
                        playRingtone();
                        setIncomingCall(pendingCall);
                    } else {
                        stopRingtone();
                        setIncomingCall(null);
                    }
                }
            });
        };

        if (userId) {
            fetchUserData();
            fetchPatientHealthRecord();
            fetchHealthHistory();
            fetchBedsoreHistory();
            const unsubscribeMessages = fetchDoctorMessages();
            const unsubscribeData = fetchHealthData();
            const unsubscribeCalls = setupCallListener();
            return () => {
                unsubscribeMessages();
                unsubscribeData();
                unsubscribeCalls();
            };
        }
    }, [userId, activeCall]);

    useEffect(() => {
        if (!patientHealthRecord || !healthData || !bspData) return;
        if (bedsoreHistory.length === 0) return;

        const lastAssessment = bedsoreHistory[0];
        const lastAssessmentTime = new Date(lastAssessment.timestamp).getTime();
        const currentTime = new Date().getTime();

        const sixHoursInMs = 6 * 60 * 60 * 1000;
        const shouldReassessByTime = (currentTime - lastAssessmentTime) > sixHoursInMs;

        // Check for high force in any BSP sensor
        const hasHighPressure =
            bspData[1].force > 20 ||
            bspData[2].force > 20 ||
            bspData[3].force > 20 ||
            bspData[4].force > 20;

        const hasHighHumidity = healthData.humidity > 70;

        if (shouldReassessByTime || hasHighPressure || hasHighHumidity) {
            console.log("Trigger conditions met for automatic bedsore risk reassessment");

            if (!isReassessing.current) {
                isReassessing.current = true;

                const performReassessment = async () => {
                    try {
                        console.log("Performing automatic bedsore risk reassessment");

                        const currentPatientData = {
                            ...patientHealthRecord,
                            currentPressurePoints: {
                                sensor1: bspData[1].force,
                                sensor2: bspData[2].force,
                                sensor3: bspData[3].force,
                                sensor4: bspData[4].force
                            },
                            currentEnvironment: {
                                humidity: healthData.humidity,
                                temperature: healthData.temp
                            },
                            autoReassessmentReason: hasHighPressure ? "high_pressure" :
                                hasHighHumidity ? "high_humidity" : "scheduled"
                        };

                        await saveBedsoreAssessment(currentPatientData, healthData, bspData);

                    } catch (error) {
                        console.error("Error in automatic reassessment:", error);
                    } finally {
                        isReassessing.current = false;
                    }
                };

                performReassessment();
            }
        }
    }, [healthData, bspData, patientHealthRecord, bedsoreHistory]);

    const handleHealthFormSubmit = async (formData) => {
        try {
            const timestamp = new Date().toISOString();
            const safeKey = timestamp.replace(/\./g, '_').replace(/:/g, '-');

            const patientRef = ref(database, `patients/${userId}`);
            const patientSnapshot = await get(patientRef);

            if (patientSnapshot.exists()) {
                await set(ref(database, `patients/${userId}`), {
                    ...patientSnapshot.val(),
                    ...formData,
                    lastUpdated: timestamp
                });
            } else {
                await set(ref(database, `patients/${userId}`), {
                    ...formData,
                    userId: userId,
                    createdAt: timestamp,
                    lastUpdated: timestamp
                });
            }

            await set(ref(database, `healthRecords/${userId}/${safeKey}`), {
                ...formData,
                timestamp,
                userId
            });

            setPatientHealthRecord({
                ...patientHealthRecord,
                ...formData,
                lastUpdated: timestamp
            });

            fetchHealthHistory();

            if (patientHealthRecord || formData) {
                saveBedsoreAssessment({ ...patientHealthRecord, ...formData }, healthData, bspData);
            }

            alert('Health information submitted successfully!');
        } catch (error) {
            console.error("Error submitting health form:", error);
            alert('Failed to submit health information. Please try again.');
        }
    };

    const saveBedsoreAssessment = async (patientData, metrics, bspMetrics) => {
        try {
            if (!patientData) return;

            const timestamp = new Date().toISOString();
            const safeKey = timestamp.replace(/\./g, '_').replace(/:/g, '-');

            const predictionResult = simulateMLPrediction(patientData, metrics, bspMetrics);

            let previousAssessment = null;
            if (bedsoreHistory.length > 0) {
                previousAssessment = bedsoreHistory[0];
            }

            const isHighRisk = predictionResult.riskLevel === 'high' || predictionResult.riskLevel === 'very-high';

            const isNewHighRisk = isHighRisk && (
                !previousAssessment ||
                (previousAssessment.riskLevel !== 'high' && previousAssessment.riskLevel !== 'very-high') ||
                (predictionResult.riskScore > previousAssessment.riskScore + 10)
            );

            // sanitize patientSnapshot to avoid undefined values which Firebase rejects
            const patientSnapshotSanitized = {
                mobilityStatus: patientData.mobilityStatus ?? null,
                age: patientData.age ?? null,
                hasDiabetes: patientData.hasDiabetes ?? null,
                incontinence: patientData.incontinence ?? null,
                height: patientData.height ?? null,
                weight: patientData.weight ?? null
            };

            await set(ref(database, `bedsoreAssessments/${userId}/${safeKey}`), {
                ...predictionResult,
                patientSnapshot: patientSnapshotSanitized,
                timestamp,
                userId
            });

            await fetchBedsoreHistory();

            if (isNewHighRisk) {
                console.log("New high risk detected! Sending automatic notification to doctor...");
                await notifyDoctorOfHighRisk(patientData, predictionResult);
                alert(`ALERT: Your bedsore risk level is now ${predictionResult.riskLevel.toUpperCase()}. Your doctor has been automatically notified via Telegram.`);
            }
            else if (predictionResult.riskLevel === 'very-high') {
                console.log("Very high risk confirmed! Sending automatic notification to doctor...");
                await notifyDoctorOfHighRisk(patientData, predictionResult);
            }

            return predictionResult;
        } catch (error) {
            console.error("Error saving bedsore assessment:", error);
            return null;
        }
    };

    const triggerManualRiskAssessment = async () => {
        try {
            console.log("Manual risk assessment triggered by user click");

            if (!patientHealthRecord || !healthData || !bspData) {
                alert("Unable to perform risk assessment. Missing health data.");
                return;
            }

            setActiveTab('bedsore');

            const predictionResult = simulateMLPrediction(patientHealthRecord, healthData, bspData);
            console.log("Manual risk assessment result:", predictionResult);

            const isHighRisk = predictionResult.riskLevel === 'high' || predictionResult.riskLevel === 'very-high';

            if (isHighRisk) {
                console.log(`HIGH RISK DETECTED (${predictionResult.riskLevel})! Sending Telegram notification...`);

                const doctorInfo = await getAssignedDoctor();
                if (!doctorInfo) {
                    console.error("No doctor found to notify");
                    alert("Risk assessment complete, but no doctor was found to notify.");
                    return;
                }

                const result = await notifyDoctorOfHighRisk(patientHealthRecord, predictionResult);

                if (result && result.success) {
                    alert(`Your bedsore risk level is ${predictionResult.riskLevel.toUpperCase()}. Your doctor has been automatically notified via Telegram.`);
                } else {
                    alert(`Your bedsore risk level is ${predictionResult.riskLevel.toUpperCase()}. However, there was an issue notifying your doctor.`);
                }
            } else {
                console.log(`Risk level is ${predictionResult.riskLevel} - no notification needed`);
                alert(`Your bedsore risk assessment is complete. Your risk level is: ${predictionResult.riskLevel.toUpperCase()}`);
            }

            await saveBedsoreAssessment(patientHealthRecord, healthData, bspData);

        } catch (error) {
            console.error("Error in manual risk assessment:", error);
            alert("There was an error performing your risk assessment. Please try again.");
        }
    };

    const notifyDoctorOfHighRisk = async (patientData, riskAssessment) => {
        try {
            console.log("High risk detected, preparing to notify doctor via Telegram...");

            const doctorInfo = await getAssignedDoctor();

            if (!doctorInfo) {
                console.log("No doctor found for notification");
                const message = `EMERGENCY: Patient ${patientData.fullName || 'Unknown'} has been identified with ${riskAssessment.riskLevel} bedsore risk (${riskAssessment.riskScore}/100) but has no assigned doctor.`;
                await telegramService.sendEmergencyMessage(message);
                return;
            }

            const doctorRef = ref(database, `users/${doctorInfo.doctorId}`);
            const doctorSnapshot = await get(doctorRef);

            if (!doctorSnapshot.exists()) {
                console.log("Doctor record not found");
                const message = `EMERGENCY: Patient ${patientData.fullName || 'Unknown'} has been identified with ${riskAssessment.riskLevel} bedsore risk (${riskAssessment.riskScore}/100) but doctor data is missing.`;
                await telegramService.sendEmergencyMessage(message);
                return;
            }

            const doctorData = doctorSnapshot.val();
            const chatId = doctorData.telegramChatId;

            if (!chatId) {
                console.log("Doctor Telegram chat ID not found");
                const message = `EMERGENCY: Patient ${patientData.fullName || 'Unknown'} has been identified with ${riskAssessment.riskLevel} bedsore risk (${riskAssessment.riskScore}/100) but doctor's Telegram is not configured.`;
                await telegramService.sendEmergencyMessage(message);
                return;
            }

            const patientName = patientData.fullName || userData?.fullName || 'Patient';
            const message = `🚨 URGENT ALERT: Patient ${patientName} has been identified with ${riskAssessment.riskLevel} bedsore risk (${riskAssessment.riskScore}/100). Immediate attention required.`;

            const result = await telegramService.sendMessage(chatId, message);

            console.log(`Telegram message sent to doctor (${doctorInfo.doctorId}): ${result.success ? 'SUCCESS' : 'FAILED'}`);

            if (riskAssessment.riskLevel === 'very-high' && riskAssessment.riskScore > 80) {
                const emergencyMessage = `🚨 CRITICAL ALERT: Patient ${patientName} has VERY HIGH bedsore risk (${riskAssessment.riskScore}/100). Immediate medical intervention required.`;
                await telegramService.sendEmergencyMessage(emergencyMessage);
            }

            return result;
        } catch (error) {
            console.error("Error notifying doctor:", error);
            try {
                const emergencyMessage = `Error sending notification: ${error.message}`;
                await telegramService.sendEmergencyMessage(emergencyMessage);
            } catch (innerError) {
                console.error("Failed to send emergency notification:", innerError);
            }
            return { success: false, message: error.message };
        }
    };
    
    const sendPressureAlert = async (pressureData) => {
        try {
            const highSensors = [];
            if (pressureData[1].force > 20) highSensors.push(`Sensor 1: ${pressureData[1].force}`);
            if (pressureData[2].force > 20) highSensors.push(`Sensor 2: ${pressureData[2].force}`);
            if (pressureData[3].force > 20) highSensors.push(`Sensor 3: ${pressureData[3].force}`);
            if (pressureData[4].force > 20) highSensors.push(`Sensor 4: ${pressureData[4].force}`);

            if (highSensors.length === 0) {
                alert('No high pressure sensors detected to send.');
                return { success: false, message: 'No high pressure sensors' };
            }

            const patientName = patientHealthRecord?.fullName || userData?.fullName || 'Patient';
            const message = `🚨 ALERT: High pressure detected on ${highSensors.join(', ')} for ${patientName}. Please check immediately.`;

            const doctorInfo = await getAssignedDoctor();

            if (!doctorInfo) {
                // Fallback to emergency channel
                const res = await telegramService.sendEmergencyMessage(message);
                if (res && res.success) alert('Telegram emergency alert sent.');
                else alert('Failed to send Telegram emergency alert.');
                return res;
            }

            const doctorRef = ref(database, `users/${doctorInfo.doctorId}`);
            const doctorSnapshot = await get(doctorRef);

            if (!doctorSnapshot.exists() || !doctorSnapshot.val().telegramChatId) {
                const res = await telegramService.sendEmergencyMessage(message);
                if (res && res.success) alert('Telegram emergency alert sent (no doctor chat ID).');
                else alert('Failed to send Telegram emergency alert.');
                return res;
            }

            const chatId = doctorSnapshot.val().telegramChatId;
            const result = await telegramService.sendMessage(chatId, message);

            if (result && result.success) alert('Telegram alert sent to assigned doctor.');
            else alert(`Failed to send Telegram alert: ${result?.message || 'unknown error'}`);

            return result;
        } catch (error) {
            console.error('Error sending pressure alert:', error);
            alert('Error sending Telegram alert. See console for details.');
            return { success: false, message: error.message };
        }
    };

    const getAssignedDoctor = async () => {
        try {
            const patientRef = ref(database, `patients/${userId}`);
            const patientSnap = await get(patientRef);

            if (patientSnap.exists() && patientSnap.val().assignedDoctor) {
                const assignedDoctorId = patientSnap.val().assignedDoctor;
                return { doctorId: assignedDoctorId };
            }

            const usersRef = ref(database, 'users');
            const doctorQuery = query(usersRef, orderByChild('userType'), equalTo('doctor'));
            const doctorSnap = await get(doctorQuery);

            if (doctorSnap.exists()) {
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

    const simulateMLPrediction = (patient, metrics, bspMetrics) => {
        let score = 0;

        if (patient.mobilityStatus === 'bedbound') score += 40;
        else if (patient.mobilityStatus === 'chairbound') score += 30;
        else if (patient.mobilityStatus === 'assistance') score += 20;

        if (patient.age > 70) score += 20;
        else if (patient.age > 60) score += 15;

        if (patient.hasDiabetes === 'yes') score += 15;

        if (patient.incontinence === 'both') score += 25;
        else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') score += 15;

        if (patient.height && patient.weight) {
            const heightInMeters = patient.height / 100;
            const bmi = patient.weight / (heightInMeters * heightInMeters);

            if (bmi < 18.5 || bmi >= 30) score += 15;
        }

        // Add pressure-based scoring from BSP sensors using FORCE values
        if (bspMetrics) {
            // High force thresholds
            if (bspMetrics[1].force > 20) score += 10;
            if (bspMetrics[2].force > 20) score += 10;
            if (bspMetrics[3].force > 20) score += 10;
            if (bspMetrics[4].force > 20) score += 10;

            // Very high force - additional scoring
            if (bspMetrics[1].force > 30) score += 5;
            if (bspMetrics[2].force > 30) score += 5;
            if (bspMetrics[3].force > 30) score += 5;
            if (bspMetrics[4].force > 30) score += 5;
        }

        const normalizedScore = Math.min(100, Math.max(0, score));

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
    };

    const handleAcceptCall = async (call) => {
        try {
            stopRingtone();
            await update(ref(database, `calls/${call.callId}`), { status: 'accepting' });
            setActiveCall(call);
            setIncomingCall(null);
        } catch (error) {
            console.error('Error accepting call:', error);
        }
    };

    const handleDeclineCall = async (call) => {
        try {
            stopRingtone();
            await update(ref(database, `calls/${call.callId}`), { status: 'declined' });
            setIncomingCall(null);
        } catch (error) {
            console.error('Error declining call:', error);
        }
    };

    const ringtoneRef = useRef(null);

    const playRingtone = () => {
        if (!ringtoneRef.current) {
            ringtoneRef.current = new Audio('/ringtone.mp3');
            ringtoneRef.current.loop = true;
        }

        ringtoneRef.current.play().catch(err => {
            console.log('Could not play ringtone (user interaction required):', err);
        });
    };

    const stopRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    };

    const handleEndCall = () => {
        setActiveCall(null);
    };

    const getStatusColor = (metric, value) => {
        if (metric === 'heart') {
            if (value < 60 || value > 100) return '#ff9800';
            return '#4caf50';
        } else if (metric === 'spo2') {
            if (value < 95) return '#f44336';
            return '#4caf50';
        } else if (metric === 'temp') {
            if (value > 37.5) return '#f44336';
            if (value < 36) return '#ff9800';
            return '#4caf50';
        } else if (metric === 'pressure' || metric === 'bloodPressure') {
            // value can be a string like '148/94' or a numeric mmHg value
            if (typeof value === 'string') {
                const parts = value.split('/').map(p => parseInt(p, 10));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const systolic = parts[0];
                    const diastolic = parts[1];
                    // basic color logic: red if hypertensive, orange if elevated, green otherwise
                    if (systolic > 140 || diastolic > 90) return '#f44336';
                    if (systolic > 120 || diastolic > 80) return '#ff9800';
                    return '#4caf50';
                }
                // fallback color for unparseable strings
                return '#2196f3';
            }

            // numeric value handling
            const num = Number(value);
            if (isNaN(num)) return '#2196f3';
            if (num > 140) return '#f44336';
            if (num > 120) return '#ff9800';
            return '#4caf50';
        } else if (metric === 'force') {
            // Force-based color coding
            if (value > 30) return '#f44336'; // Red for very high
            if (value > 20) return '#ff9800'; // Orange for high
            return '#4caf50'; // Green for normal
        } else if (metric === 'bedsoreRisk') {
            if (value === 'low') return '#4caf50';
            if (value === 'moderate') return '#ff9800';
            if (value === 'high') return '#f44336';
            if (value === 'very-high') return '#9c27b0';
            return '#2196f3';
        }
        return '#2196f3';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getBMICategory = (height, weight) => {
        if (!height || !weight) return "Not calculated";

        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);

        if (bmi < 18.5) return "Underweight";
        if (bmi < 25) return "Normal";
        if (bmi < 30) return "Overweight";
        return "Obese";
    };

    const renderHighRiskWarning = () => {
        return (
            <div className="health-warning health-warning-urgent">
                <div className="warning-icon">🚨</div>
                <div className="warning-text">
                    High bedsore risk detected! Follow prevention guidelines.
                </div>
                <button
                    className="warning-action-button"
                    onClick={() => setActiveTab('bedsore')}
                >
                    View Recommendations
                </button>
            </div>
        );
    };

    const renderPressureWarning = (pressureData) => {
        const highPressureSensors = [];

        // Check force values instead of pressure field
        if (pressureData[1].force > 20) highPressureSensors.push('Sensor 1');
        if (pressureData[2].force > 20) highPressureSensors.push('Sensor 2');
        if (pressureData[3].force > 20) highPressureSensors.push('Sensor 3');
        if (pressureData[4].force > 20) highPressureSensors.push('Sensor 4');

        if (highPressureSensors.length === 0) return null;
        // Check latest ML risk (if available) and adjust the presentation so the UI is consistent
        const latestRisk = bedsoreHistory && bedsoreHistory.length > 0 ? bedsoreHistory[0].riskLevel : null;

        if (latestRisk === 'low') {
            // If ML says low risk, show an informational notice rather than an urgent alert
            return (
                <div className="health-warning health-warning-info">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-text">
                        Notice: High pressure detected on {highPressureSensors.join(', ')}. Current ML assessment: <strong>LOW</strong> — monitor and reassess if conditions persist.
                    </div>
                    <button
                        className="warning-action-button"
                        onClick={() => sendPressureAlert(pressureData)}
                    >
                        Send Telegram Alert
                    </button>
                </div>
            );
        }

        // Default: show the urgent alert when ML is not low
        return (
            <div className="health-warning health-warning-urgent">
                <div className="warning-icon">🚨</div>
                <div className="warning-text">
                    ALERT: High pressure detected on {highPressureSensors.join(', ')}!
                </div>
                <button
                    className="warning-action-button"
                    onClick={() => sendPressureAlert(pressureData)}
                >
                    Send Telegram Alert
                </button>
            </div>
        );
    };

    const renderSelectedRecord = () => {
        if (!selectedRecord) return null;

        const calculateBMI = (height, weight) => {
            if (!height || !weight) return "N/A";
            const heightInMeters = height / 100;
            return (weight / (heightInMeters * heightInMeters)).toFixed(1);
        };

        return (
            <div className="record-details">
                <h3>Health Record Details - {formatDate(selectedRecord.timestamp)}</h3>

                <div className="record-section">
                    <h4>Personal Information</h4>
                    <div className="detail-item">
                        <span className="detail-label">Full Name:</span>
                        <span className="detail-value">{selectedRecord.fullName || "Not recorded"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Phone Number:</span>
                        <span className="detail-value">{selectedRecord.phoneNumber || "Not recorded"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Age:</span>
                        <span className="detail-value">{selectedRecord.age || "Not recorded"}</span>
                    </div>
                </div>

                <div className="record-section">
                    <h4>Health Measurements</h4>
                    <div className="detail-item">
                        <span className="detail-label">Height:</span>
                        <span className="detail-value">{selectedRecord.height ? `${selectedRecord.height} cm` : "Not recorded"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Weight:</span>
                        <span className="detail-value">{selectedRecord.weight ? `${selectedRecord.weight} kg` : "Not recorded"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">BMI:</span>
                        <span className="detail-value">{calculateBMI(selectedRecord.height, selectedRecord.weight)} - {getBMICategory(selectedRecord.height, selectedRecord.weight)}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Blood Pressure:</span>
                        <span className="detail-value">{selectedRecord.bloodPressure || "Not recorded"}</span>
                    </div>
                </div>

                <div className="record-section">
                    <h4>Medical History</h4>
                    <div className="detail-item">
                        <span className="detail-label">Diabetes:</span>
                        <span className="detail-value">
                            {selectedRecord.hasDiabetes === 'yes'
                                ? `Yes${selectedRecord.diabetesType ? ` - Type ${selectedRecord.diabetesType.replace('type', '')}` : ''}`
                                : (selectedRecord.hasDiabetes === 'no' ? 'No' : 'Unknown')}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Surgery History:</span>
                        <span className="detail-value">
                            {selectedRecord.surgeryHistory === 'yes'
                                ? `Yes - ${selectedRecord.surgeryDetails || 'No details provided'}`
                                : 'No'}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Existing Conditions:</span>
                        <span className="detail-value">
                            {selectedRecord.existingConditions && selectedRecord.existingConditions.length > 0
                                ? selectedRecord.existingConditions.join(', ')
                                : 'None reported'}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Additional Issues:</span>
                        <span className="detail-value">{selectedRecord.additionalIssues || 'None reported'}</span>
                    </div>
                </div>

                <div className="record-section">
                    <h4>Mobility & Bedsore Risk Factors</h4>
                    <div className="detail-item">
                        <span className="detail-label">Mobility Status:</span>
                        <span className="detail-value">{selectedRecord.mobilityStatus ?
                            selectedRecord.mobilityStatus.charAt(0).toUpperCase() + selectedRecord.mobilityStatus.slice(1) :
                            "Not recorded"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Incontinence:</span>
                        <span className="detail-value">{selectedRecord.incontinence ?
                            (selectedRecord.incontinence === 'no' ? 'None' :
                                selectedRecord.incontinence.charAt(0).toUpperCase() + selectedRecord.incontinence.slice(1)) :
                            "Not recorded"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Skin Condition:</span>
                        <span className="detail-value">{selectedRecord.skinCondition ?
                            selectedRecord.skinCondition.charAt(0).toUpperCase() + selectedRecord.skinCondition.slice(1) :
                            "Not recorded"}</span>
                    </div>
                </div>

                <button
                    className="button back-button"
                    onClick={() => setSelectedRecord(null)}
                >
                    Back to History List
                </button>
            </div>
        );
    };

    if (loading) return <div>Loading...</div>;
    if (!userData) return <div>User not found. <button onClick={onLogout}>Return to Login</button></div>;

    return (
        <div className="dashboard">
            <header className="header">
                <h1>Patient Dashboard</h1>
                <button className="logout-button" onClick={onLogout}>Logout</button>
            </header>

            <nav className="nav">
                {['home', 'messages', 'health', 'history', 'calls', 'bedsore', 'progress'].map(tab => (
                    <div
                        key={tab}
                        className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'bedsore' ? 'Bedsore Risk' :
                            tab === 'progress' ? 'Health Progress' :
                                tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </div>
                ))}
            </nav>

            <main className="content">
                {activeTab === 'home' && (
                    <div>
                        <div className="welcome">
                            <h2>Welcome, {userData.fullName || (healthHistory.length > 0 && healthHistory[0].fullName) || 'Patient'}</h2>
                            <p>Phone: {userData.phoneNumber}</p>
                            {userData.email && <p>Email: {userData.email}</p>}
                        </div>

                        {healthData && bspData && (
                            <div className="card">
                                <h3>Current Health Metrics</h3>
                                <div className="health-metrics-container">
                                    <div className="health-metric">
                                        <div className="metric-title">Angle</div>
                                        <div className="metric-value">{healthData.angle || 0}°</div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Heart Rate</div>
                                        <div className="metric-value" style={{ color: getStatusColor('heart', healthData.heart) }}>
                                            {healthData.heart || 0} bpm
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Humidity</div>
                                        <div className="metric-value">
                                            {healthData.humidity || 0}%
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Blood Pressure</div>
                                        <div className="metric-value" style={{ color: getStatusColor('pressure', healthData.pressure) }}>
                                            {typeof healthData.pressure === 'string' && healthData.pressure.includes('/') ? (
                                                healthData.pressure
                                            ) : (
                                                `${healthData.pressure || 0} mmHg`
                                            )}
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">SpO2</div>
                                        <div className="metric-value" style={{ color: getStatusColor('spo2', healthData.spo2) }}>
                                            {healthData.spo2 || 0}%
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Temperature</div>
                                        <div className="metric-value" style={{ color: getStatusColor('temp', healthData.temp) }}>
                                            {healthData.temp || 0}°C
                                        </div>
                                    </div>

                                    {/* BSP Pressure Sensors */}
                                    <div className="health-metric">
                                        <div className="metric-title">Sensor 1 Pressure</div>
                                        <div className="metric-value" style={{ color: getStatusColor('force', bspData[1].force) }}>
                                            Force: {bspData[1].force || 0}<br />
                                            Pressure: {bspData[1].pressure || 0}
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Sensor 2 Pressure</div>
                                        <div className="metric-value" style={{ color: getStatusColor('force', bspData[2].force) }}>
                                            Force: {bspData[2].force || 0}<br />
                                            Pressure: {bspData[2].pressure || 0}
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Sensor 3 Pressure</div>
                                        <div className="metric-value" style={{ color: getStatusColor('force', bspData[3].force) }}>
                                            Force: {bspData[3].force || 0}<br />
                                            Pressure: {bspData[3].pressure || 0}
                                        </div>
                                    </div>
                                    <div className="health-metric">
                                        <div className="metric-title">Sensor 4 Pressure</div>
                                        <div className="metric-value" style={{ color: getStatusColor('force', bspData[4].force) }}>
                                            Force: {bspData[4].force || 0}<br />
                                            Pressure: {bspData[4].pressure || 0}
                                        </div>
                                    </div>
                                </div>

                                {renderPressureWarning(bspData)}
                                {bedsoreHistory.length > 0 && (bedsoreHistory[0].riskLevel === 'high' || bedsoreHistory[0].riskLevel === 'very-high') &&
                                    renderHighRiskWarning()
                                }
                            </div>
                        )}

                        <div className="card">
                            <h3>Your Health Progress</h3>
                            <div className="health-progress-preview">
                                <p>Track your health metrics over time</p>
                                <div className="progress-metrics">
                                    <div className="metric">
                                        <span className="metric-label">Weight</span>
                                        <span className="metric-value">{healthHistory.length > 0 ? `${healthHistory[0].weight || '–'} kg` : '–'}</span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Blood Pressure</span>
                                        <span className="metric-value">{healthHistory.length > 0 ? healthHistory[0].bloodPressure || '–' : '–'}</span>
                                    </div>
                                </div>
                                <button
                                    className="progress-button"
                                    onClick={() => setActiveTab('progress')}
                                    style={{
                                        padding: '10px 15px',
                                        backgroundColor: '#2196F3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        marginTop: '15px',
                                        display: 'block',
                                        width: '100%'
                                    }}
                                >
                                    View Health Progress & Download Reports
                                </button>
                            </div>
                            <style jsx>{`
    .health-progress-preview {
      padding: 10px 0;
    }
    .progress-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .metric {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 16px;
      font-weight: bold;
    }
  `}</style>
                            <h3>Quick Actions</h3>
                            <button
                                className="button"
                                style={{ marginRight: '10px' }}
                                onClick={() => setActiveTab('health')}
                            >
                                Fill Health Form
                            </button>
                            <button
                                className="button"
                                style={{ marginRight: '10px' }}
                                onClick={() => setActiveTab('history')}
                            >
                                View Health History
                            </button>
                            <button
                                className="button"
                                onClick={triggerManualRiskAssessment}
                            >
                                ML Bedsore Assessment
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="card">
                        <h2>Messages from Doctor</h2>
                        {doctorMessages.length > 0 ? (
                            <div className="messages-list">
                                {doctorMessages.map(message => (
                                    <div key={message.id} className="message-item" style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        marginBottom: '10px',
                                        backgroundColor: '#f9f9f9'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <strong>From: Dr. {message.doctorName}</strong>
                                            <span style={{ color: '#666', fontSize: '0.9em' }}>
                                                {new Date(message.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ lineHeight: '1.5' }}>
                                            {message.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No messages from your doctor yet.</p>
                        )}
                    </div>
                )}

                {activeTab === 'health' && (
                    <div className="card">
                        <h2>Health Information Form</h2>
                        <HealthForm onSubmit={handleHealthFormSubmit} userId={userId} />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="card">
                        <h2>Medical History</h2>
                        {selectedRecord ? (
                            renderSelectedRecord()
                        ) : (
                            <>
                                {healthHistory.length > 0 ? (
                                    <div className="history-container">
                                        <div className="history-header">
                                            <span className="header-date">Date</span>
                                            <span className="header-bmi">BMI</span>
                                            <span className="header-bp">Blood Pressure</span>
                                            <span className="header-conditions">Conditions</span>
                                            <span className="header-risk">Bedsore Risk</span>
                                            <span className="header-actions">Actions</span>
                                        </div>
                                        {healthHistory.map((record) => {
                                            const bedsoreEntry = bedsoreHistory.find(assessment =>
                                                new Date(assessment.timestamp).toDateString() === new Date(record.timestamp).toDateString()
                                            );
                                            let bmiCategory = getBMICategory(record.height, record.weight);
                                            return (
                                                <div key={record.id} className="history-row">
                                                    <span className="row-date">{formatDate(record.timestamp)}</span>
                                                    <span className="row-bmi">
                                                        {record.height && record.weight ? (
                                                            <span className={`bmi-tag ${bmiCategory.toLowerCase()}`}>
                                                                {bmiCategory}
                                                            </span>
                                                        ) : "Not recorded"}
                                                    </span>
                                                    <span className="row-bp">
                                                        {record.bloodPressure || "Not recorded"}
                                                    </span>
                                                    <span className="row-conditions">
                                                        {record.existingConditions && record.existingConditions.length > 0
                                                            ? record.existingConditions.slice(0, 2).join(', ') +
                                                            (record.existingConditions.length > 2 ? '...' : '')
                                                            : "None reported"}
                                                    </span>
                                                    <span className="row-risk">
                                                        {bedsoreEntry ? (
                                                            <span className={`risk-tag ${bedsoreEntry.riskLevel}`}>
                                                                {bedsoreEntry.riskLevel.charAt(0).toUpperCase() +
                                                                    bedsoreEntry.riskLevel.slice(1).replace('-', ' ')}
                                                            </span>
                                                        ) : "Not assessed"}
                                                    </span>
                                                    <span className="row-actions">
                                                        <button
                                                            className="button view-button"
                                                            onClick={() => setSelectedRecord(record)}
                                                        >
                                                            View Details
                                                        </button>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-history">
                                        <p>No health records found. Please fill out the health form to begin tracking your health history.</p>
                                        <button
                                            className="button"
                                            onClick={() => setActiveTab('health')}
                                        >
                                            Fill Health Form
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'calls' && (
                    <div className="card">
                        <h2>Video Calls History</h2>
                        {recentCalls.length > 0 ? (
                            <table className="calls-list">
                                <thead>
                                    <tr>
                                        <th className="calls-header">Date</th>
                                        <th className="calls-header">Doctor</th>
                                        <th className="calls-header">Status</th>
                                        <th className="calls-header">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCalls.map(call => (
                                        <tr key={call.callId}>
                                            <td className="calls-data">
                                                {new Date(call.timestamp).toLocaleString()}
                                            </td>
                                            <td className="calls-data">
                                                {call.doctorName || `Dr. ID: ${call.doctorId}`}
                                            </td>
                                            <td className="calls-data">
                                                {call.status === 'pending' ? 'Waiting' :
                                                    call.status === 'accepted' ? 'Connected' :
                                                        call.status === 'declined' ? 'Declined' : 'Ended'}
                                            </td>
                                            <td className="calls-data">
                                                {call.endTime && call.status === 'ended' ?
                                                    `${Math.round((new Date(call.endTime) - new Date(call.timestamp)) / 1000 / 60)} min` :
                                                    call.status === 'pending' ? 'Incoming...' :
                                                        call.status === 'declined' ? '-' : 'In progress'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No video calls history.</p>
                        )}
                    </div>
                )}

                {activeTab === 'bedsore' && (
                    <div>
                        <div className="card">
                            <h2>ML-Based Bedsore Risk Assessment</h2>
                            {patientHealthRecord ? (
                                <>
                                    {/* Merge healthData and bspData into a metrics object expected by the ML model */}
                                    <MLBedsorePredictor
                                        patientData={patientHealthRecord}
                                        healthMetrics={{
                                            // copy basic health metrics
                                            ...healthData,
                                            // normalize naming expected by model
                                            heartRate: healthData?.heart ?? healthData?.heartRate,
                                            temperature: healthData?.temp ?? healthData?.temperature,
                                            spo2: healthData?.spo2,
                                            humidity: healthData?.humidity,
                                            angle: healthData?.angle,
                                            // map BSP sensor force values into model pressure fields
                                            backPressure_L: bspData?.[1]?.force ?? 0,
                                            backPressure_R: bspData?.[2]?.force ?? 0,
                                            legPressure_L: bspData?.[3]?.force ?? 0,
                                            legPressure_R: bspData?.[4]?.force ?? 0,
                                            // shoulder sensors may not be available; set to 0
                                            shoulderPressure_L: bspData?.[1]?.force ?? 0,
                                            shoulderPressure_R: bspData?.[2]?.force ?? 0,
                                            // keep BP raw value if present
                                            bp: typeof healthData?.pressure === 'string' ? null : healthData?.pressure
                                        }}
                                    />
                                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                        <p className="info-text">
                                            Bedsore risk assessments are automatically performed and alerts are sent to your healthcare provider when high-risk is detected.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <p>No health data available for bedsore risk assessment.</p>
                                    <button
                                        className="button"
                                        onClick={() => setActiveTab('health')}
                                    >
                                        Complete Health Form
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'progress' && (
                    <div className="card">
                        <h2>Health Progress Tracking</h2>
                        <HealthProgressTracker userId={userId} />
                    </div>
                )}
            </main>

            {incomingCall && !activeCall && (
                <CallNotification
                    call={incomingCall}
                    onAccept={handleAcceptCall}
                    onDecline={handleDeclineCall}
                />
            )}

            {activeCall && (
                <div className="video-modal">
                    <div className="video-container">
                        <VideoCall
                            userId={userId}
                            role="patient"
                            callData={activeCall}
                            onEndCall={handleEndCall}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
