import React, { useState, useEffect } from 'react';
import { ref, get, query, orderByChild, equalTo, set, onValue, update } from 'firebase/database';
import { database } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import VideoCall from '../components/VideoCall';
import '../styles/DoctorDashboard.css';
import messageService from '../utils/MessageService';
import SmsSender from '../components/SmsSender';

const DoctorDashboard = ({ userId, onLogout }) => {
    console.log('DoctorDashboard mounted with userId:', userId);
    
    const [doctorData, setDoctorData] = useState(null);
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [healthRecords, setHealthRecords] = useState({});
    const [bedsoreAssessments, setBedsoreAssessments] = useState({});
    const [activeTab, setActiveTab] = useState('patients');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedHealthRecord, setSelectedHealthRecord] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [callStatus, setCallStatus] = useState(null);
    const [sortBy, setSortBy] = useState('bedsoreRisk'); // Default sort by bedsore risk
    const [messageToPatient, setMessageToPatient] = useState('');

    // Function to calculate bedsore risk (similar to patient's simulateMLPrediction)
    const calculateBedsoreRisk = (patient) => {
        let score = 0;
        console.log("Calculating risk for patient data:", patient);
        
        // Add points for key risk factors - more aggressive scoring
        if (patient.mobilityStatus === 'bedbound') score += 50;
        else if (patient.mobilityStatus === 'chairbound') score += 40;
        else if (patient.mobilityStatus === 'assistance') score += 30;
        else score += 10; // Even without mobility data, give some points
        
        if (patient.age > 70) score += 25;
        else if (patient.age > 60) score += 20;
        else if (patient.age > 40) score += 10;
        else score += 5; // Even younger patients can get bedsores
        
        // IMPORTANT: For any patient with diabetes, immediately add significant points
        if (patient.hasDiabetes === 'yes') {
            score += 30; // Much higher points for diabetes (key factor)
            console.log("Patient has diabetes, adding 30 points to risk score");
        }
        
        // Additional points for diabetes type 1 (even higher risk)
        if (patient.hasDiabetes === 'yes' && patient.diabetesType && 
            (patient.diabetesType === 'type1' || patient.diabetesType === 'type 1')) {
            score += 20; // Extra points for Type 1 diabetes
            console.log("Patient has Type 1 diabetes, adding extra 20 points to risk score");
        }
        
        if (patient.incontinence === 'both') score += 25;
        else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') score += 15;
        
        // Calculate BMI if height and weight are available
        if (patient.height && patient.weight) {
            const heightInMeters = patient.height / 100;
            const bmi = patient.weight / (heightInMeters * heightInMeters);
            
            if (bmi < 18.5 || bmi >= 30) score += 15;
        }
        
        // For patients with breathing issues (from additionalIssues)
        if (patient.additionalIssues && 
            (patient.additionalIssues.includes("breathing") || patient.additionalIssues === "breathing")) {
            score += 20;
            console.log("Patient has breathing issues, adding 20 points to risk score");
        }
        
        // If any significant conditions exist, add points
        if (patient.primaryDiseaseOrIssue && patient.primaryDiseaseOrIssue !== 'none') {
            score += 15;
        }
        
        // Higher baseline score to ensure patients with health data get meaningful risk scores
        score += 15;
        
        // Normalize score to 0-100
        const normalizedScore = Math.min(100, Math.max(0, score));
        
        // ADJUSTED: More aggressive risk level thresholds
        let riskLevel;
        if (normalizedScore < 15) riskLevel = 'low';
        else if (normalizedScore < 30) riskLevel = 'moderate';
        else if (normalizedScore < 45) riskLevel = 'high';
        else riskLevel = 'very-high';
        
        console.log(`Final risk calculation - score: ${normalizedScore}, level: ${riskLevel}`);
        
        return {
            riskScore: normalizedScore,
            riskLevel,
            confidence: Math.round(70 + Math.random() * 25)
        };
    }; 

    // Function to generate bedsore assessments for patients without them
    // Enhanced function to automatically generate bedsore assessments and send notifications
// Update this function in DoctorDashboard.jsx
const generateMissingBedsoreAssessments = async () => {
    try {
        console.log("Checking for patients without bedsore assessments...");
        
        // Get all patients
        const patientsToAssess = patients.filter(patient => {
            // Either the patient has no assessment or we force regenerate for all
            return !(patient.id in bedsoreAssessments);
        });
        
        // Also look for patients where assessment is more than 24 hours old
        const patientsNeedingUpdate = patients.filter(patient => {
            if (!(patient.id in bedsoreAssessments)) return false;
            
            const assessment = bedsoreAssessments[patient.id];
            if (!assessment.timestamp) return true;
            
            const assessmentTime = new Date(assessment.timestamp).getTime();
            const currentTime = new Date().getTime();
            const oneDayMs = 24 * 60 * 60 * 1000;
            
            return (currentTime - assessmentTime) > oneDayMs;
        });
        
        // Combine both lists
        const allPatientsToProcess = [...patientsToAssess, ...patientsNeedingUpdate];
        
        console.log(`Found ${patientsToAssess.length} patients without assessments and ${patientsNeedingUpdate.length} patients needing updated assessments`);
        
        if (allPatientsToProcess.length > 0) {
            const updatedAssessments = {...bedsoreAssessments};
            const newHighRiskPatients = []; // Track newly found high-risk patients
            
            // Generate assessments for each patient
            for (const patient of allPatientsToProcess) {
                // Get patient data from either healthData or most recent health record
                const patientData = patient.healthData || 
                                  (healthRecords[patient.id] && healthRecords[patient.id][0]);
                
                if (patientData) {
                    // Generate risk assessment using our custom logic
                    const risk = calculateBedsoreRisk(patientData);
                    
                    console.log(`Generated risk assessment for patient ${patient.id} (${getPatientName(patient)}): ${risk.riskLevel} (${risk.riskScore})`);
                    
                    // Check if this is a new high-risk assessment
                    const existingAssessment = bedsoreAssessments[patient.id];
                    const becameHighRisk = risk.riskLevel === 'high' || risk.riskLevel === 'very-high';
                    const wasNotHighRisk = !existingAssessment || 
                                          (existingAssessment.riskLevel !== 'high' && 
                                           existingAssessment.riskLevel !== 'very-high');
                    
                    // Also check for risk that's gotten significantly worse
                    const riskSignificantlyWorse = existingAssessment && 
                                                  risk.riskScore > existingAssessment.riskScore + 15;
                    
                    if ((becameHighRisk && wasNotHighRisk) || 
                        (becameHighRisk && riskSignificantlyWorse)) {
                        console.log(`Patient ${patient.id} (${getPatientName(patient)}) ${wasNotHighRisk ? 'newly' : 'increasingly'} identified as high risk`);
                        newHighRiskPatients.push({
                            patient: patient,
                            riskAssessment: risk
                        });
                    }
                    
                    // Save to our local state (with current timestamp)
                    updatedAssessments[patient.id] = {
                        riskLevel: risk.riskLevel,
                        riskScore: risk.riskScore,
                        confidence: risk.confidence,
                        timestamp: new Date().toISOString(),
                        generatedByDoctor: true // Flag that this was auto-generated
                    };
                    
                    // Also save to Firebase for persistence
                    const safeKey = new Date().toISOString().replace(/\./g, '_').replace(/:/g, '-');
                    await set(ref(database, `bedsoreAssessments/${patient.id}/${safeKey}`), {
                        riskLevel: risk.riskLevel,
                        riskScore: risk.riskScore,
                        confidence: risk.confidence,
                        timestamp: new Date().toISOString(),
                        generatedByDoctor: true,
                        generatedById: userId
                    });
                }
            }
            
            // Update state with new assessments
            setBedsoreAssessments(updatedAssessments);
            
            // Send notifications for newly identified high-risk patients
            if (newHighRiskPatients.length > 0) {
                console.log(`Sending automatic notifications for ${newHighRiskPatients.length} newly high-risk patients`);
                await notifyDoctorOfHighRiskPatients(newHighRiskPatients);
            }
            
            // Important: After updating bedsoreAssessments, make sure filtered patients get updated
            setTimeout(() => {
                console.log("Updated assessments, recalculating high priority patients...");
                const highPriorityCount = patients.filter(patient => isHighPriority(patient.id)).length;
                console.log(`After update: ${highPriorityCount} high priority patients`);
                sortPatients(sortBy);
            }, 500);
        }
    } catch (error) {
        console.error("Error generating missing bedsore assessments:", error);
    }
};

  // Update this function in DoctorDashboard.jsx
const notifyDoctorOfHighRiskPatients = async (highRiskPatients) => {
    try {
        if (!doctorData || !doctorData.phoneNumber) {
            console.log("Doctor phone number not available for notifications");
            return;
        }
        
        const doctorPhone = doctorData.phoneNumber;
        const doctorName = doctorData.doctorId || userId;
        
        console.log(`Preparing to send notifications to Dr. ${doctorName} at ${doctorPhone}`);
        
        // Send individual notifications for each high-risk patient
        for (const { patient, riskAssessment } of highRiskPatients) {
            const patientName = getPatientName(patient);
            
            // Create message specifically about this patient
            const message = `URGENT ALERT: Patient ${patientName} has been identified with ${riskAssessment.riskLevel} bedsore risk (score: ${riskAssessment.riskScore}/100). Immediate review required.`;
            
            // Send SMS directly to the doctor's phone number
            const result = await messageService.sendSmsViaTwilio(doctorPhone, message);
            
            console.log(`SMS notification for patient ${patient.id} sent to doctor at ${doctorPhone}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            
            // Add a small delay between messages to prevent flooding
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // If multiple high-risk patients, send a summary notification
        if (highRiskPatients.length > 1) {
            const summaryMessage = `ALERT: ${highRiskPatients.length} patients have been identified with high bedsore risk. Please review your dashboard immediately.`;
            
            // Send summary to doctor's phone
            await messageService.sendSmsViaTwilio(doctorPhone, summaryMessage);
        }
        
        return {
            success: true,
            message: `Sent notifications for ${highRiskPatients.length} high-risk patients`
        };
    } catch (error) {
        console.error("Error sending high-risk notifications:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

    // Add this function to send SMS for a specific patient
    const sendSmsForPatient = async (patient) => {
        if (!patient) return;
        
        try {
            // Make sure we have doctor's phone number
            if (!doctorData || !doctorData.phoneNumber) {
                alert("Doctor phone number not available. Please update your profile.");
                return;
            }
            
            const doctorPhone = doctorData.phoneNumber;
            const risk = getBedsoreRisk(patient.id);
            
            if (!risk) {
                alert("No risk assessment available for this patient");
                return;
            }
            
            const patientName = getPatientName(patient);
            
            // Create message specifically about this patient
            const message = `URGENT: Patient ${patientName} has ${risk.riskLevel} bedsore risk (score: ${risk.riskScore}/100). Immediate medical attention required.`;
            
            // Send SMS directly to the doctor's phone
            const result = await messageService.sendSmsViaTwilio(doctorPhone, message);
            
            if (result.success) {
                alert("SMS notification sent successfully to your phone");
            } else {
                alert(`Failed to send SMS: ${result.message}`);
            }
        } catch (error) {
            console.error("Error sending SMS:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const sendMessageToPatient = async (patient, message) => {
        console.log('sendMessageToPatient called with doctorData:', doctorData);
        if (!patient || !message.trim()) return;
        
        if (!doctorData) {
            console.log('doctorData is null/undefined, current userId:', userId);
            alert('Doctor information is still loading. Please wait and try again.');
            return;
        }
        
        try {
            console.log('Sending message to patient:', patient);
            const patientId = patient.id || patient.key;
            console.log('Patient ID:', patientId);
            
            if (!patientId) {
                alert('Patient ID not found. Cannot send message.');
                return;
            }
            
            const messageId = new Date().getTime().toString();
            const messageData = {
                id: messageId,
                from: userId,
                fromType: 'doctor',
                to: patientId,
                toType: 'patient',
                message: message.trim(),
                timestamp: new Date().toISOString(),
                doctorName: doctorData?.fullName || doctorData?.name || 'Doctor',
                patientName: getPatientName(patient)
            };

            console.log('Message data:', messageData);
            console.log('Storing at path:', `users/${patientId}/messages/${messageId}`);

            // Store message in Firebase under patient's user record
            await set(ref(database, `users/${patientId}/messages/${messageId}`), messageData);

            // Also store in doctor's sent messages for reference
            await set(ref(database, `users/${userId}/sentMessages/${messageId}`), messageData);

            // Send SMS to patient if they have a phone number
            if (patient.phoneNumber || patient.healthData?.phoneNumber) {
                const patientPhone = patient.phoneNumber || patient.healthData.phoneNumber;
                const smsMessage = `Message from Dr. ${doctorData?.fullName || 'Your Doctor'}: ${message}`;
                await messageService.sendSmsViaTwilio(patientPhone, smsMessage);
            }

            setMessageToPatient('');
            alert('Message sent successfully!');
        } catch (error) {
            console.error("Error sending message:", error);
            alert(`Error sending message: ${error.message}`);
        }
    };

    useEffect(() => {
        console.log('DoctorDashboard useEffect triggered with userId:', userId);
        
        if (!userId) {
            console.error('No userId provided to DoctorDashboard');
            return;
        }
        
        const fetchDoctorData = async () => {
            try {
                console.log('Fetching doctor data for userId:', userId);
                const doctorRef = ref(database, `users/${userId}`);
                const snapshot = await get(doctorRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    console.log('Doctor data fetched:', data);
                    console.log('User type:', data.userType);
                    if (data.userType !== 'doctor') {
                        console.error('User is not a doctor:', data.userType);
                        alert('This account is not registered as a doctor.');
                        return;
                    }
                    setDoctorData(data);
                } else {
                    console.error("No doctor data found for userId:", userId);
                    alert('Doctor profile not found. Please contact support.');
                }
            } catch (error) {
                console.error("Error fetching doctor data:", error);
            }
        };

        const fetchPatients = async () => {
            try {
                // First fetch users with userType 'patient'
                const usersRef = ref(database, 'users');
                const patientQuery = query(usersRef, orderByChild('userType'), equalTo('patient'));
                const userSnapshot = await get(patientQuery);
                const patientList = [];

                if (userSnapshot.exists()) {
                    userSnapshot.forEach((childSnapshot) => {
                        const patientId = childSnapshot.key;
                        const patientData = childSnapshot.val();
                        patientList.push({ id: patientId, ...patientData });
                    });
                }

                // Then fetch patient health data from 'patients' path
                const patientsRef = ref(database, 'patients');
                const patientsSnapshot = await get(patientsRef);

                if (patientsSnapshot.exists()) {
                    patientsSnapshot.forEach((childSnapshot) => {
                        const patientId = childSnapshot.key;
                        const healthData = childSnapshot.val();
                        const existingPatientIndex = patientList.findIndex(p => p.id === patientId);

                        if (existingPatientIndex >= 0) {
                            patientList[existingPatientIndex] = {
                                ...patientList[existingPatientIndex],
                                healthData: healthData,
                                // Map the name from healthData if not already set
                                name: patientList[existingPatientIndex].name || healthData.fullName || healthData.name
                            };
                        } else {
                            patientList.push({
                                id: patientId,
                                healthData: healthData,
                                name: healthData.fullName || healthData.name,
                                phoneNumber: healthData.phoneNumber,
                                userType: 'patient'
                            });
                        }
                    });
                }

                // Now fetch additional data from 'healthRecords' path - this contains fullName
                const healthRecordsRef = ref(database, 'healthRecords');
                const healthRecordsSnapshot = await get(healthRecordsRef);

                if (healthRecordsSnapshot.exists()) {
                    healthRecordsSnapshot.forEach((patientSnapshot) => {
                        const patientId = patientSnapshot.key;
                        
                        // Get most recent health record (assuming sorted by timestamp)
                        let latestRecord = null;
                        patientSnapshot.forEach((recordSnapshot) => {
                            const record = recordSnapshot.val();
                            if (!latestRecord || (record.timestamp && record.timestamp > latestRecord.timestamp)) {
                                latestRecord = { id: recordSnapshot.key, ...record };
                            }
                        });
                        
                        if (latestRecord) {
                            const existingPatientIndex = patientList.findIndex(p => p.id === patientId);
                            
                            if (existingPatientIndex >= 0) {
                                patientList[existingPatientIndex] = {
                                    ...patientList[existingPatientIndex],
                                    // Update name if fullName exists
                                    name: latestRecord.fullName || patientList[existingPatientIndex].name,
                                    // Add or merge healthData
                                    healthData: {
                                        ...(patientList[existingPatientIndex].healthData || {}),
                                        fullName: latestRecord.fullName,
                                        ...latestRecord
                                    }
                                };
                            } else {
                                patientList.push({
                                    id: patientId,
                                    name: latestRecord.fullName,
                                    phoneNumber: latestRecord.phoneNumber,
                                    healthData: latestRecord,
                                    userType: 'patient'
                                });
                            }
                        }
                    });
                }

                // Add patient numbers
                const numberedPatients = patientList.map((patient, index) => ({
                    ...patient,
                    patientNumber: index + 1
                }));

                console.log("Patient list after processing:", numberedPatients);
                setPatients(numberedPatients);
                setFilteredPatients(numberedPatients);
            } catch (error) {
                console.error("Error fetching patients:", error);
            }
        };

        const fetchHealthRecords = async () => {
            try {
                const recordsRef = ref(database, 'healthRecords');
                const snapshot = await get(recordsRef);
                const records = {};
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const patientId = childSnapshot.key;
                        records[patientId] = [];
                        childSnapshot.forEach((recordSnapshot) => {
                            records[patientId].push({
                                id: recordSnapshot.key,
                                ...recordSnapshot.val()
                            });
                        });
                    });
                }
                
                setHealthRecords(records);
            } catch (error) {
                console.error("Error fetching health records:", error);
            }
        };

        const fetchBedsoreAssessments = async () => {
            try {
                const assessmentsRef = ref(database, 'bedsoreAssessments');
                const snapshot = await get(assessmentsRef);
                const assessments = {};
                
                console.log('Fetching bedsore assessments...');
                console.log('Snapshot exists:', snapshot.exists());

                if (snapshot.exists()) {
                    // Log all patient IDs that have bedsore assessments
                    const patientIdsWithAssessments = [];
                    
                    snapshot.forEach((patientSnapshot) => {
                        const patientId = patientSnapshot.key;
                        patientIdsWithAssessments.push(patientId);
                        const patientAssessments = [];

                        patientSnapshot.forEach((assessmentSnapshot) => {
                            patientAssessments.push({
                                id: assessmentSnapshot.key,
                                ...assessmentSnapshot.val()
                            });
                        });

                        // Sort by timestamp (newest first) and take the most recent
                        patientAssessments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        assessments[patientId] = patientAssessments[0];
                    });
                    
                    console.log('Patient IDs with bedsore assessments:', patientIdsWithAssessments);
                    
                    // Check if these IDs match with our patients array
                    if (patients.length > 0) {
                        const patientIds = patients.map(p => p.id);
                        console.log('All patient IDs:', patientIds);
                        
                        // Check for patients that don't have assessments
                        const patientsWithoutAssessments = patients.filter(
                            p => !patientIdsWithAssessments.includes(p.id)
                        );
                        
                        console.log('Patients without assessments:', 
                            patientsWithoutAssessments.map(p => ({
                                id: p.id, 
                                name: p.name || p.healthData?.fullName || 'Unknown'
                            }))
                        );
                    }
                } else {
                    console.warn('No bedsore assessments found in database');
                }

                console.log(`Found ${Object.keys(assessments).length} patients with bedsore assessments`);
                setBedsoreAssessments(assessments);
                
                // If patients are loaded, check for missing assessments
                if (patients.length > 0) {
                    generateMissingBedsoreAssessments();
                }
                
                setLoading(false);
            } catch (error) {
                console.error("Error fetching bedsore assessments:", error);
                setLoading(false);
            }
        };

        if (userId) {
            // Use a sequence to ensure data is loaded in the right order
            const loadData = async () => {
                setLoading(true);
                try {
                    await fetchDoctorData();
                    await fetchPatients();
                    await fetchHealthRecords();
                    await fetchBedsoreAssessments();
                } catch (error) {
                    console.error("Error in data loading sequence:", error);
                } finally {
                    setLoading(false);
                }
            };
            
            loadData();
        }
    }, [userId]); // Only depends on userId to avoid infinite loops

    // Effect to apply sorting whenever patients or sort criteria change
    useEffect(() => {
        sortPatients(sortBy);
    }, [patients, sortBy, bedsoreAssessments]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            sortPatients(sortBy);
        } else {
            const filtered = patients.filter(patient =>
                (patient.name && patient.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (patient.phoneNumber && patient.phoneNumber.includes(searchTerm))
            );
            setFilteredPatients(filtered);
        }
    }, [searchTerm, patients, sortBy, bedsoreAssessments]);

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.trim() === '') {
            sortPatients(sortBy);
        } else {
            const filtered = patients.filter(patient =>
                String(patient.patientNumber).includes(term) ||
                (patient.name && patient.name.toLowerCase().includes(term.toLowerCase())) ||
                (patient.phoneNumber && patient.phoneNumber.includes(term)) ||
                (patient.healthData && patient.healthData.phoneNumber && patient.healthData.phoneNumber.includes(term))
            );
            setFilteredPatients(filtered);
        }
    };

    // Function to sort patients based on criteria
    const sortPatients = (criteria) => {
        setSortBy(criteria);

        let sorted = [...patients];

        if (criteria === 'bedsoreRisk') {
            // Sort by bedsore risk level (high risk first)
            sorted.sort((a, b) => {
                const riskA = getBedsoreRiskScore(a.id);
                const riskB = getBedsoreRiskScore(b.id);
                return riskB - riskA; // Higher risk first
            });
        } else if (criteria === 'name') {
            // Sort by name
            sorted.sort((a, b) => {
                const nameA = a.name || '';
                const nameB = b.name || '';
                return nameA.localeCompare(nameB);
            });
        } else if (criteria === 'recordCount') {
            // Sort by record count
            sorted.sort((a, b) => {
                const countA = getPatientRecordsCount(a.id);
                const countB = getPatientRecordsCount(b.id);
                return countB - countA;
            });
        }

        setFilteredPatients(sorted);
    };

    // Helper function to get bedsore risk score for sorting
    const getBedsoreRiskScore = (patientId) => {
        const assessment = bedsoreAssessments[patientId];
        if (!assessment) return 0;

        // Convert risk level to numeric score for sorting
        switch (assessment.riskLevel) {
            case 'very-high': return 4;
            case 'high': return 3;
            case 'moderate': return 2;
            case 'low': return 1;
            default: return 0;
        }
    };

    const viewPatientDetails = (patient) => setSelectedPatient(patient);
    const viewHealthRecord = (record) => setSelectedHealthRecord(record);
    const closeModal = () => {
        setSelectedPatient(null);
        setSelectedHealthRecord(null);
    };
    const getPatientRecordsCount = (patientId) => healthRecords[patientId] ? healthRecords[patientId].length : 0;

    // Get bedsore risk for a patient
    const getBedsoreRisk = (patientId) => {
        const risk = bedsoreAssessments[patientId];
        
        // If no assessment but patient has diabetes, create a default high risk
        if (!risk) {
            const patient = patients.find(p => p.id === patientId);
            if (patient && patient.healthData && patient.healthData.hasDiabetes === 'yes') {
                console.log(`Creating default high risk for diabetic patient ${patientId}`);
                // Return a default high risk for diabetic patients
                return {
                    riskLevel: 'high',
                    riskScore: 60,
                    confidence: 80,
                    timestamp: new Date().toISOString(),
                    generatedOnDemand: true
                };
            }
        }
        
        return risk || null;
    };

    // Format the bedsore risk as a human-readable string
    const formatBedsoreRisk = (risk) => {
        if (!risk) return "Not assessed";

        const riskLevel = risk.riskLevel;
        const displayRisk = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1).replace('-', ' ');

        return `${displayRisk} (${risk.confidence || 0}% confidence)`;
    };

    // Get CSS class for the bedsore risk badge
    const getBedsoreRiskClass = (risk) => {
        if (!risk) return "";

        switch (risk.riskLevel) {
            case 'very-high': return "bedsore-very-high";
            case 'high': return "bedsore-high";
            case 'moderate': return "bedsore-moderate";
            case 'low': return "bedsore-low";
            default: return "";
        }
    };

    // Check if a patient is high priority (high or very high bedsore risk)
    const isHighPriority = (patientId) => {
        const risk = getBedsoreRisk(patientId);
        console.log(`Checking priority for patient ${patientId}:`, risk);
        
        // More robust check with fallback
        if (!risk) {
            // If we have a patient with diabetes but no risk assessment, consider them high priority
            const patient = patients.find(p => p.id === patientId);
            if (patient && patient.healthData && patient.healthData.hasDiabetes === 'yes') {
                console.log(`Patient ${patientId} has diabetes but no risk assessment - marking as high priority`);
                return true;
            }
            return false;
        }
        
        // More robust check for risk level (case-insensitive)
        const riskLevel = risk.riskLevel ? risk.riskLevel.toLowerCase() : '';
        const isHigh = riskLevel === 'high' || riskLevel === 'very-high' || riskLevel === 'very high';
        
        console.log(`Patient ${patientId} priority check: Risk level = ${riskLevel}, Is high priority = ${isHigh}`);
        return isHigh;
    };

    const startVideoCall = async (patient) => {
        try {
            setCallStatus('Initiating call...');

            // Generate a unique call ID
            const callId = uuidv4();

            // Create call record in Firebase
            const callData = {
                callId,
                doctorId: userId,
                doctorName: doctorData.name || `Dr. ${userId}`,
                patientId: patient.id,
                patientName: patient.name || `Patient ${patient.id}`,
                timestamp: new Date().toISOString(),
                status: 'pending',
            };

            // Save call data to Firebase
            await set(ref(database, `calls/${callId}`), callData);

            // Set up listener for call status changes
            const callRef = ref(database, `calls/${callId}/status`);
            const unsubscribe = onValue(callRef, (snapshot) => {
                const status = snapshot.val();

                if (status === 'accepted') {
                    // Patient accepted - set active call which will launch the VideoCall component
                    setActiveCall(callData);
                    setCallStatus('Patient accepted. Connecting...');
                }
                else if (status === 'declined') {
                    setCallStatus('Patient declined the call');
                    setTimeout(() => setCallStatus(null), 3000);
                    unsubscribe();
                }
                else if (status === 'ended') {
                    setActiveCall(null);
                    setCallStatus('Call ended');
                    setTimeout(() => setCallStatus(null), 3000);
                    unsubscribe();
                }
            });

            // Set initial UI state
            setActiveCall({ ...callData, _waiting: true });
            setCallStatus('Calling patient...');

            // Set a timeout for call expiration (if patient doesn't answer)
            setTimeout(() => {
                // Check if call is still pending after 30 seconds
                get(callRef).then((snapshot) => {
                    if (snapshot.exists() && snapshot.val() === 'pending') {
                        // Update status to expired and clean up
                        update(ref(database, `calls/${callId}`), { status: 'expired' });
                        setCallStatus('No answer from patient');
                        setTimeout(() => setCallStatus(null), 3000);
                        setActiveCall(null);
                        unsubscribe();
                    }
                });
            }, 30000); // 30 second timeout
        } catch (error) {
            console.error('Error starting video call:', error);
            setCallStatus('Failed to start call');
            setTimeout(() => setCallStatus(null), 3000);
        }
    };

    const endCall = () => {
        if (activeCall) {
            setActiveCall(null);
            setCallStatus(null);
        }
    };

    // Helper function to get patient name from different possible sources
    const getPatientName = (patient) => {
        // Try all possible places where the name might be stored
        return patient.name || 
               patient.healthData?.fullName || 
               patient.healthData?.name || 
               `Patient ${patient.patientNumber}`;
    };

    if (loading) return <div>Loading...</div>;
    if (!doctorData) return <div>Doctor not found. <button onClick={onLogout}>Return to Login</button></div>;

    // Count high priority patients
    const highPriorityCount = patients.filter(patient => isHighPriority(patient.id)).length;

    return (
        <div className="dashboard">
            <header className="header">
                <h1>Doctor Dashboard</h1>
                <div>
                    <span style={{ marginRight: '15px' }}>Dr. ID: {doctorData.doctorId}</span>
                    <button className="logout-button" onClick={onLogout}>Logout</button>
                </div>
            </header>

            <nav className="nav">
                {['dashboard', 'patients', 'profile'].map(tab => (
                    <div
                        key={tab}
                        className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'patients' && highPriorityCount > 0 && (
                            <span className="priority-badge">{highPriorityCount}</span>
                        )}
                    </div>
                ))}
            </nav>

            <main className="content">
                {activeTab === 'dashboard' && (
                    <div>
                        <div className="welcome">
                            <h2>Welcome, {doctorData.userType || doctorData.doctorId}</h2>
                            <p>Phone: {doctorData.phoneNumber}</p>
                            {doctorData.email && <p>Email: {doctorData.email}</p>}
                        </div>

                        {highPriorityCount > 0 && (
                            <div className="alert alert-urgent">
                                <div className="alert-icon">🚨</div>
                                <div className="alert-text">
                                    <strong>High Priority Alert:</strong> {highPriorityCount} patient{highPriorityCount > 1 ? 's' : ''} with high bedsore risk detected requiring immediate attention.
                                </div>
                                <button className="alert-action" onClick={() => setActiveTab('patients')}>
                                    View Patients
                                </button>
                            </div>
                        )}

                        <div className="card">
                            <h3>Overview</h3>
                            <p>Total Patients: {patients.length}</p>
                            <p>Patients with Health Data: {patients.filter(p => p.healthData).length}</p>
                            <p>Patients with High Bedsore Risk: <span className="high-priority-text">{highPriorityCount}</span></p>
                            <p>Total Health Records: {Object.values(healthRecords).reduce((total, records) => total + records.length, 0)}</p>
                        </div>
                        <div className="card">
                            <h3>Quick Actions</h3>
                            <button className="button" onClick={() => setActiveTab('patients')}>
                                View All Patients
                            </button>
                            {highPriorityCount > 0 && (
                                <button className="button urgent-button" onClick={() => {
                                    setActiveTab('patients');
                                    setSortBy('bedsoreRisk');
                                }}>
                                    View High Priority Patients
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'patients' && (
                    <div className="card">
                        <h2>Patient Management</h2>

                        <div className="patient-controls">
                            <input
                                type="text"
                                placeholder="Search patients by name or phone number..."
                                className="search"
                                value={searchTerm}
                                onChange={handleSearch}
                            />

                            <div className="sort-controls">
                                <label>Sort by:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => sortPatients(e.target.value)}
                                    className="sort-select"
                                >
                                    <option value="bedsoreRisk">Bedsore Risk (High to Low)</option>
                                    <option value="name">Name</option>
                                    <option value="recordCount">Record Count</option>
                                </select>
                            </div>
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Priority</th>
                                    <th className="th">Patient Name</th>
                                    <th className="th">Phone Number</th>
                                    <th className="th">Health Records</th>
                                    <th className="th">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.length === 0 ? (
                                    <tr>
                                        <td className="td" colSpan="6">No patients found</td>
                                    </tr>
                                ) : (
                                    filteredPatients.map(patient => {
                                        const bedsoreRisk = getBedsoreRisk(patient.id);
                                        const isHighRisk = isHighPriority(patient.id);
                                        const patientName = getPatientName(patient);

                                        return (
                                            <tr key={patient.id} className={isHighRisk ? 'high-priority-row' : ''}>
                                                <td className="td priority-cell">
                                                    {isHighRisk && (
                                                        <div className="priority-indicator">
                                                            <span className="priority-icon">⚠️</span>
                                                            <span className="priority-text">HIGH</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="td">{patientName}</td>
                                                <td className="td">{patient.phoneNumber || patient.healthData?.phoneNumber || 'N/A'}</td>
                                                <td className="td">
                                                    {getPatientRecordsCount(patient.id) > 0 ? (
                                                        <span className="badge">
                                                            {getPatientRecordsCount(patient.id)} records
                                                        </span>
                                                    ) : 'No records'}
                                                </td>
                                                <td className="td">
                                                    <button className="details-button" onClick={() => viewPatientDetails(patient)}>
                                                        View Details
                                                    </button>
                                                    <button
                                                        className={`call-button ${isHighRisk ? 'urgent-call' : ''}`}
                                                        onClick={() => startVideoCall(patient)}
                                                    >
                                                        <span className="call-icon">📞</span> Video Call
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div>
                        <div className="card">
                            <h2>Doctor Profile</h2>
                            <p><strong>Doctor ID:</strong> {doctorData.doctorId}</p>
                            <p><strong>Phone Number:</strong> {doctorData.phoneNumber}</p>
                            {doctorData.email && <p><strong>Email:</strong> {doctorData.email}</p>}
                            <p><strong>Account Created:</strong> {new Date(doctorData.createdAt).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="card" style={{ marginTop: '20px' }}>
                            <h2>SMS Notification Test</h2>
                            <SmsSender />
                        </div>
                        
                        <div className="card" style={{ marginTop: '20px' }}>
                            <h2>Notification Settings</h2>
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <h3>SMS Notifications</h3>
                                        <p>Receive text messages when patients develop high bedsore risk</p>
                                    </div>
                                    <div className="setting-control">
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={true} 
                                                onChange={() => {
                                                    messageService.updateConfig({ isSmsEnabled: !messageService.isSmsEnabled });
                                                    alert(`SMS notifications ${messageService.isSmsEnabled ? 'disabled' : 'enabled'}`);
                                                }}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <h3>Emergency Alerts Only</h3>
                                        <p>Only send SMS for very-high risk patients</p>
                                    </div>
                                    <div className="setting-control">
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={false} 
                                                onChange={() => alert('This would toggle notification level settings in a real app')}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {selectedPatient && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                Patient {selectedPatient.patientNumber} Details
                                {isHighPriority(selectedPatient.id) && (
                                    <span className="modal-priority-badge">⚠️ HIGH PRIORITY</span>
                                )}
                            </h2>
                            <button className="close-button" onClick={closeModal}>×</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="card">
                                <h3>Personal Information</h3>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Patient ID:</td>
                                            <td>Patient {selectedPatient.patientNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Name:</td>
                                            <td>{getPatientName(selectedPatient)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Phone Number:</td>
                                            <td>{selectedPatient.phoneNumber || selectedPatient.healthData?.phoneNumber || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Age:</td>
                                            <td>{selectedPatient.healthData?.age || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Gender:</td>
                                            <td>{selectedPatient.healthData?.gender || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Height:</td>
                                            <td>{selectedPatient.healthData?.height ? `${selectedPatient.healthData.height} cm` : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Weight:</td>
                                            <td>{selectedPatient.healthData?.weight ? `${selectedPatient.healthData.weight} kg` : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Blood Type:</td>
                                            <td>{selectedPatient.healthData?.bloodType || 'N/A'}</td>
                                        </tr>
                                        {selectedPatient.email && (
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Email:</td>
                                                <td>{selectedPatient.email}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                    <button
                                        className={`button ${isHighPriority(selectedPatient.id) ? 'urgent-button' : ''}`}
                                        style={{ backgroundColor: isHighPriority(selectedPatient.id) ? '#e53935' : '#27ae60' }}
                                        onClick={() => { closeModal(); startVideoCall(selectedPatient); }}
                                    >
                                        <span style={{ marginRight: '5px' }}>📞</span>
                                        {isHighPriority(selectedPatient.id) ? 'URGENT: Start Video Call' : 'Start Video Call'}
                                    </button>
                                </div>
                            </div>
                            {selectedPatient.healthData && (
                                <div className="card">
                                    <h3>Current Health Status</h3>
                                    <table>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Primary Issue:</td>
                                                <td>{selectedPatient.healthData.primaryDiseaseOrIssue || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Blood Pressure:</td>
                                                <td>{selectedPatient.healthData.bloodPressure || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>BP Condition:</td>
                                                <td>{selectedPatient.healthData.bloodPressureCondition || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Diabetes:</td>
                                                <td>{selectedPatient.healthData.hasDiabetes || 'N/A'}</td>
                                            </tr>
                                            {selectedPatient.healthData.hasDiabetes === 'yes' && (
                                                <tr>
                                                    <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Diabetes Type:</td>
                                                    <td>{selectedPatient.healthData.diabetesType || 'N/A'}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Surgery History:</td>
                                                <td>{selectedPatient.healthData.surgeryHistory || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Additional Issues:</td>
                                                <td>{selectedPatient.healthData.additionalIssues || 'None'}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '8px 0' }}>Last Updated:</td>
                                                <td>{selectedPatient.healthData.lastUpdated ? new Date(selectedPatient.healthData.lastUpdated).toLocaleString() : 'N/A'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Display bedsore risk in patient details */}
                        {getBedsoreRisk(selectedPatient.id) && (
                            <div className={`card bedsore-risk-card ${getBedsoreRiskClass(getBedsoreRisk(selectedPatient.id))}`} style={{ marginTop: '20px' }}>
                                <h3>Bedsore Risk Assessment</h3>
                                <div className="bedsore-risk-details">
                                    <div className="risk-level">
                                        <strong>Risk Level:</strong>
                                        <span className={`risk-badge ${getBedsoreRiskClass(getBedsoreRisk(selectedPatient.id))}`}>
                                            {getBedsoreRisk(selectedPatient.id).riskLevel.charAt(0).toUpperCase() +
                                                getBedsoreRisk(selectedPatient.id).riskLevel.slice(1).replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="risk-confidence">
                                        <strong>Confidence:</strong> {getBedsoreRisk(selectedPatient.id).confidence || 0}%
                                    </div>
                                    <div className="risk-score">
                                        <strong>Risk Score:</strong> {getBedsoreRisk(selectedPatient.id).riskScore || 0}/100
                                    </div>
                                    <div className="risk-date">
                                        <strong>Assessment Date:</strong> {new Date(getBedsoreRisk(selectedPatient.id).timestamp).toLocaleDateString()}
                                    </div>
                                </div>

                                {(getBedsoreRisk(selectedPatient.id).riskLevel === 'high' ||
                                    getBedsoreRisk(selectedPatient.id).riskLevel === 'very-high') && (
                                        <div className="urgent-warning">
                                            <strong>⚠️ URGENT ACTION REQUIRED:</strong> This patient has a high risk of developing bedsores.
                                            Immediate preventive measures should be implemented and close monitoring is essential.
                                        </div>
                                    )}

                                {getBedsoreRisk(selectedPatient.id).riskLevel === 'moderate' && (
                                    <div className="moderate-warning">
                                        <strong>⚠️ ATTENTION NEEDED:</strong> This patient has a moderate risk of developing bedsores.
                                        Regular monitoring and preventive care should be established.
                                    </div>
                                )}
                                
                                {/* Add SMS button for high-risk patients */}
                                {(getBedsoreRisk(selectedPatient.id).riskLevel === 'high' ||
                                  getBedsoreRisk(selectedPatient.id).riskLevel === 'very-high') && (
                                    <div className="risk-actions" style={{ marginTop: '15px' }}>
                                        <button 
                                            className="urgent-button" 
                                            style={{ backgroundColor: '#f44336', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            onClick={() => sendSmsForPatient(selectedPatient)}
                                        >
                                            <span style={{ marginRight: '5px' }}>📱</span> Send SMS Alert
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Message to Patient */}
                        <div className="card" style={{ marginTop: '20px' }}>
                            <h3>Send Message to Patient</h3>
                            {!doctorData && (
                                <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '10px' }}>
                                    Loading doctor information...
                                </p>
                            )}
                            <div style={{ marginBottom: '10px' }}>
                                <textarea
                                    value={messageToPatient}
                                    onChange={(e) => setMessageToPatient(e.target.value)}
                                    placeholder="Type your message to the patient..."
                                    rows={3}
                                    disabled={!doctorData}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontFamily: 'inherit',
                                        backgroundColor: doctorData ? 'white' : '#f5f5f5'
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => sendMessageToPatient(selectedPatient, messageToPatient)}
                                disabled={!messageToPatient.trim() || !doctorData}
                                style={{
                                    backgroundColor: (messageToPatient.trim() && doctorData) ? '#4CAF50' : '#cccccc',
                                    color: 'white',
                                    padding: '8px 15px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: (messageToPatient.trim() && doctorData) ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <span style={{ marginRight: '5px' }}>📤</span> Send Message
                            </button>
                        </div>

                        {selectedPatient.healthData?.currentSymptoms && (
                            <div className="card" style={{ marginTop: '20px' }}>
                                <h3>Current Symptoms</h3>
                                <p>{selectedPatient.healthData.currentSymptoms}</p>
                                {selectedPatient.healthData.symptomDuration && (
                                    <p><strong>Duration: </strong>{selectedPatient.healthData.symptomDuration}</p>
                                )}
                                {selectedPatient.healthData.painLevel && (
                                    <p><strong>Pain Level: </strong>{selectedPatient.healthData.painLevel}/10</p>
                                )}
                            </div>
                        )}
                        <div className="card" style={{ marginTop: '20px' }}>
                            <h3>Health Records History</h3>
                            {healthRecords[selectedPatient.id] && healthRecords[selectedPatient.id].length > 0 ? (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="th">Date</th>
                                            <th className="th">Summary</th>
                                            <th className="th">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {healthRecords[selectedPatient.id].map(record => (
                                            <tr key={record.id}>
                                                <td className="td">{new Date(record.timestamp).toLocaleDateString()}</td>
                                                <td className="td">
                                                    {record.currentSymptoms?.substring(0, 50) || 'Health information record'}
                                                    {record.currentSymptoms?.length > 50 ? '...' : ''}
                                                </td>
                                                <td className="td">
                                                    <button className="details-button" onClick={() => viewHealthRecord(record)}>
                                                        View Record
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p>No health records found for this patient.</p>}
                        </div>
                    </div>
                </div>
            )}

            {selectedHealthRecord && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Health Record</h2>
                            <button className="close-button" onClick={closeModal}>×</button>
                        </div>
                        <div>
                            <p><strong>Date:</strong> {new Date(selectedHealthRecord.timestamp).toLocaleDateString()}</p>
                            <h3>Personal Information</h3>
                            <p><strong>Full Name:</strong> {selectedHealthRecord.fullName}</p>
                            <p><strong>Age:</strong> {selectedHealthRecord.age}</p>
                            <p><strong>Gender:</strong> {selectedHealthRecord.gender}</p>
                            <p><strong>Height:</strong> {selectedHealthRecord.height} cm</p>
                            <p><strong>Weight:</strong> {selectedHealthRecord.weight} kg</p>
                            <p><strong>Blood Type:</strong> {selectedHealthRecord.bloodType}</p>
                            <h3>Vital Signs</h3>
                            <p><strong>Body Temperature:</strong> {selectedHealthRecord.bodyTemperature} °C</p>
                            <p><strong>Heart Rate:</strong> {selectedHealthRecord.heartRate} bpm</p>
                            <p><strong>Blood Pressure:</strong> {selectedHealthRecord.bloodPressure}</p>
                            <p><strong>Respiratory Rate:</strong> {selectedHealthRecord.respiratoryRate} breaths/min</p>
                            <h3>Medical History</h3>
                            <p><strong>Existing Conditions:</strong> {selectedHealthRecord.existingConditions?.join(', ') || 'None'}</p>
                            <p><strong>Allergies:</strong> {selectedHealthRecord.allergies || 'None'}</p>
                            <p><strong>Medications:</strong> {selectedHealthRecord.medications || 'None'}</p>
                            <p><strong>Surgeries:</strong> {selectedHealthRecord.surgeryHistory === 'yes' ? selectedHealthRecord.surgeryDetails : 'None'}</p>
                            <p><strong>Family History:</strong> {selectedHealthRecord.familyHistory || 'None'}</p>
                            <h3>Current Symptoms</h3>
                            <p><strong>Primary Issue:</strong> {selectedHealthRecord.primaryDiseaseOrIssue || 'N/A'}</p>
                            <p><strong>Symptoms:</strong> {selectedHealthRecord.currentSymptoms || 'None'}</p>
                            <p><strong>Duration:</strong> {selectedHealthRecord.symptomDuration || 'N/A'}</p>
                            <p><strong>Pain Level:</strong> {selectedHealthRecord.painLevel || 'N/A'}</p>
                            <h3>Lifestyle</h3>
                            <p><strong>Smoking:</strong> {selectedHealthRecord.smokingStatus || 'N/A'}</p>
                            <p><strong>Alcohol:</strong> {selectedHealthRecord.alcoholConsumption || 'N/A'}</p>
                            <p><strong>Exercise:</strong> {selectedHealthRecord.exerciseFrequency || 'N/A'}</p>
                            <p><strong>Diet:</strong> {selectedHealthRecord.dietDescription || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeCall && (
                <div className="video-modal">
                    <div className="video-container">
                        <VideoCall userId={userId} role="doctor" callData={activeCall} onEndCall={endCall} />
                    </div>
                </div>
            )}

            {callStatus && !activeCall?.status === 'accepted' && (
                <div className="call-status">{callStatus}</div>
            )}
        </div>
    );
};

export default DoctorDashboard;