
// // // BedsoreMLModel.js
// // import * as tf from '@tensorflow/tfjs';

// // import Papa from 'papaparse';

// // class BedsoreMLModel {
// //   constructor() {
// //     this.model = null;
// //     this.featureColumns = [
// //       'age', 'mobilityStatus', 'hasDiabetes', 'incontinence', 
// //       'height', 'weight', 'bmi', 'sittingDuration'
// //     ];
// //     this.labelColumn = 'riskLevel';
// //     this.categoryMapping = {
// //       'low': 0,
// //       'moderate': 1,
// //       'high': 2,
// //       'very-high': 3
// //     };
// //     this.reverseCategoryMapping = {
// //       0: 'low',
// //       1: 'moderate',
// //       2: 'high',
// //       3: 'very-high'
// //     };
// //     this.isTrained = false;
// //     this.isTraining = false;
// //     this.featureMin = {};
// //     this.featureMax = {};
// //   }

// //   /**
// //    * Load dataset from a CSV file
// //    * @param {string} datasetPath - Path to the CSV dataset
// //    * @returns {Promise<Array>} - Parsed data
// //    */
// //   async loadDataset(datasetPath) {
// //     try {
// //       const response = await window.fs.readFile(datasetPath, { encoding: 'utf8' });

// //       // Parse CSV data
// //       const parsedData = Papa.parse(response, {
// //         header: true,
// //         dynamicTyping: true,
// //         skipEmptyLines: true
// //       });

// //       console.log(`Loaded dataset with ${parsedData.data.length} records`);

// //       if (parsedData.errors.length > 0) {
// //         console.error("Errors parsing CSV:", parsedData.errors);
// //       }

// //       return parsedData.data;
// //     } catch (error) {
// //       console.error("Error loading dataset:", error);
// //       throw error;
// //     }
// //   }

// //   /**
// //    * Preprocess dataset for training
// //    * @param {Array} data - Raw data from CSV
// //    * @returns {Object} - Processed features and labels as tensors
// //    */
// //   preprocessData(data) {
// //     // Handle missing values and preprocessing
// //     const processedData = data.filter(row => {
// //       // Filter out rows with missing values in key fields
// //       return row.age && row.mobilityStatus && row.riskLevel;
// //     }).map(row => {
// //       // Create a copy to avoid modifying the original
// //       const processedRow = {...row};

// //       // Convert categorical variables to numeric
// //       if (typeof processedRow.mobilityStatus === 'string') {
// //         switch (processedRow.mobilityStatus.toLowerCase()) {
// //           case 'bedbound': processedRow.mobilityStatus = 3; break;
// //           case 'chairbound': processedRow.mobilityStatus = 2; break;
// //           case 'assistance': processedRow.mobilityStatus = 1; break;
// //           default: processedRow.mobilityStatus = 0; // Independent
// //         }
// //       }

// //       if (typeof processedRow.hasDiabetes === 'string') {
// //         processedRow.hasDiabetes = processedRow.hasDiabetes.toLowerCase() === 'yes' ? 1 : 0;
// //       }

// //       if (typeof processedRow.incontinence === 'string') {
// //         switch (processedRow.incontinence.toLowerCase()) {
// //           case 'both': processedRow.incontinence = 3; break;
// //           case 'fecal': processedRow.incontinence = 2; break;
// //           case 'urinary': processedRow.incontinence = 1; break;
// //           default: processedRow.incontinence = 0; // No incontinence
// //         }
// //       }

// //       // Calculate BMI if height and weight are available but BMI is not
// //       if (!processedRow.bmi && processedRow.height && processedRow.weight) {
// //         const heightInMeters = processedRow.height / 100;
// //         processedRow.bmi = processedRow.weight / (heightInMeters * heightInMeters);
// //       }

// //       // Convert risk level to numeric if it's a string
// //       if (typeof processedRow.riskLevel === 'string') {
// //         const riskKey = processedRow.riskLevel.toLowerCase().replace(' ', '-');
// //         processedRow.riskLevel = this.categoryMapping[riskKey] || 0;
// //       }

// //       return processedRow;
// //     });

// //     // Extract features and labels
// //     const features = processedData.map(row => {
// //       return this.featureColumns.map(col => {
// //         // Return 0 for missing values
// //         return row[col] === undefined || row[col] === null ? 0 : row[col];
// //       });
// //     });

// //     const labels = processedData.map(row => {
// //       // One-hot encode the labels for classification
// //       const labelValue = row[this.labelColumn];
// //       return [
// //         labelValue === 0 ? 1 : 0,
// //         labelValue === 1 ? 1 : 0,
// //         labelValue === 2 ? 1 : 0,
// //         labelValue === 3 ? 1 : 0
// //       ];
// //     });

// //     // Calculate min/max for normalization
// //     this.calculateNormalizationParams(features);

// //     // Normalize features
// //     const normalizedFeatures = this.normalizeFeatures(features);

// //     return {
// //       features: tf.tensor2d(normalizedFeatures),
// //       labels: tf.tensor2d(labels)
// //     };
// //   }

// //   /**
// //    * Calculate min and max values for each feature for normalization
// //    * @param {Array} features - Feature array
// //    */
// //   calculateNormalizationParams(features) {
// //     // Initialize with the first row
// //     if (features.length === 0) return;

// //     this.featureColumns.forEach((col, i) => {
// //       this.featureMin[col] = features[0][i];
// //       this.featureMax[col] = features[0][i];
// //     });

// //     // Find min and max for each feature
// //     features.forEach(row => {
// //       this.featureColumns.forEach((col, i) => {
// //         this.featureMin[col] = Math.min(this.featureMin[col], row[i]);
// //         this.featureMax[col] = Math.max(this.featureMax[col], row[i]);
// //       });
// //     });
// //   }

// //   /**
// //    * Normalize features using min-max scaling
// //    * @param {Array} features - Feature array
// //    * @returns {Array} - Normalized features
// //    */
// //   normalizeFeatures(features) {
// //     return features.map(row => {
// //       return row.map((value, i) => {
// //         const col = this.featureColumns[i];
// //         const min = this.featureMin[col];
// //         const max = this.featureMax[col];

// //         // If min and max are the same, return 0.5 to avoid division by zero
// //         if (min === max) return 0.5;

// //         // Normalize to [0, 1]
// //         return (value - min) / (max - min);
// //       });
// //     });
// //   }

// //   /**
// //    * Normalize a single patient's features
// //    * @param {Object} patient - Patient data
// //    * @returns {Array} - Normalized features
// //    */
// //   normalizePatientFeatures(patient) {
// //     // Extract and normalize features from patient data
// //     const features = this.featureColumns.map(col => {
// //       let value = patient[col];

// //       // Handle categorical variables
// //       if (col === 'mobilityStatus' && typeof value === 'string') {
// //         switch (value.toLowerCase()) {
// //           case 'bedbound': value = 3; break;
// //           case 'chairbound': value = 2; break;
// //           case 'assistance': value = 1; break;
// //           default: value = 0; // Independent
// //         }
// //       }

// //       if (col === 'hasDiabetes' && typeof value === 'string') {
// //         value = value.toLowerCase() === 'yes' ? 1 : 0;
// //       }

// //       if (col === 'incontinence' && typeof value === 'string') {
// //         switch (value.toLowerCase()) {
// //           case 'both': value = 3; break;
// //           case 'fecal': value = 2; break;
// //           case 'urinary': value = 1; break;
// //           default: value = 0; // No incontinence
// //         }
// //       }

// //       // Calculate BMI if needed
// //       if (col === 'bmi' && (!value || value === 0) && patient.height && patient.weight) {
// //         const heightInMeters = patient.height / 100;
// //         value = patient.weight / (heightInMeters * heightInMeters);
// //       }

// //       // Fill missing values with 0
// //       if (value === undefined || value === null) {
// //         value = 0;
// //       }

// //       // Normalize using min-max scaling
// //       const min = this.featureMin[col] || 0;
// //       const max = this.featureMax[col] || 1;

// //       // If min and max are the same, return 0.5 to avoid division by zero
// //       if (min === max) return 0.5;

// //       return (value - min) / (max - min);
// //     });

// //     return features;
// //   }

// //   /**
// //    * Create and compile the neural network model
// //    * @returns {tf.Sequential} - TensorFlow model
// //    */
// //   createModel() {
// //     const model = tf.sequential();

// //     // Input layer and first hidden layer
// //     model.add(tf.layers.dense({
// //       units: 16,
// //       activation: 'relu',
// //       inputShape: [this.featureColumns.length]
// //     }));

// //     // Add dropout for regularization
// //     model.add(tf.layers.dropout({ rate: 0.2 }));

// //     // Second hidden layer
// //     model.add(tf.layers.dense({
// //       units: 8,
// //       activation: 'relu'
// //     }));

// //     // Output layer with 4 units (one for each risk category)
// //     model.add(tf.layers.dense({
// //       units: 4,
// //       activation: 'softmax'
// //     }));

// //     // Compile the model
// //     model.compile({
// //       optimizer: 'adam',
// //       loss: 'categoricalCrossentropy',
// //       metrics: ['accuracy']
// //     });

// //     return model;
// //   }

// //   /**
// //    * Train the model on the provided dataset
// //    * @param {string} datasetPath - Path to the CSV dataset
// //    * @returns {Promise<void>}
// //    */
// //   async trainModel(datasetPath) {
// //     if (this.isTraining) {
// //       console.log("Model is already training");
// //       return;
// //     }

// //     this.isTraining = true;

// //     try {
// //       console.log("Loading dataset...");
// //       const data = await this.loadDataset(datasetPath);

// //       console.log("Preprocessing data...");
// //       const { features, labels } = this.preprocessData(data);

// //       console.log("Creating model...");
// //       this.model = this.createModel();

// //       console.log("Training model...");
// //       const epochs = 50;
// //       const batchSize = 32;

// //       await this.model.fit(features, labels, {
// //         epochs,
// //         batchSize,
// //         validationSplit: 0.2,
// //         callbacks: {
// //           onEpochEnd: (epoch, logs) => {
// //             console.log(`Epoch ${epoch + 1} of ${epochs}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
// //           }
// //         }
// //       });

// //       console.log("Model training complete!");
// //       this.isTrained = true;
// //     } catch (error) {
// //       console.error("Error training model:", error);
// //       throw error;
// //     } finally {
// //       this.isTraining = false;
// //     }
// //   }

// //   /**
// //    * Predict the bedsore risk for a patient
// //    * @param {Object} patientData - Patient data
// //    * @returns {Object} - Prediction results with risk level and score
// //    */
// //   predictRisk(patientData) {
// //     // If model is not trained, use a simpler rule-based approach as fallback
// //     if (!this.model || !this.isTrained) {
// //       return this.predictRiskRuleBased(patientData);
// //     }

// //     try {
// //       // Preprocess and normalize patient data
// //       const normalizedFeatures = this.normalizePatientFeatures(patientData);

// //       // Convert to tensor and predict
// //       const featureTensor = tf.tensor2d([normalizedFeatures]);
// //       const prediction = this.model.predict(featureTensor);

// //       // Get the probabilities and risk level
// //       const probabilities = prediction.dataSync();
// //       const predictedClassIndex = probabilities.indexOf(Math.max(...probabilities));
// //       const predictedRiskLevel = this.reverseCategoryMapping[predictedClassIndex];

// //       // Calculate a risk score (0-100) based on probabilities
// //       // Weighted average of probabilities (giving higher weights to higher risk levels)
// //       const weightedScore = (
// //         probabilities[0] * 0 +   // Low risk
// //         probabilities[1] * 33 +  // Moderate risk
// //         probabilities[2] * 66 +  // High risk
// //         probabilities[3] * 100   // Very high risk
// //       );

// //       // Calculate confidence as the highest probability
// //       const confidence = Math.round(Math.max(...probabilities) * 100);

// //       // Generate list of contributing factors
// //       const contributingFactors = this.getContributingFactors(patientData, predictedRiskLevel);

// //       // Clean up tensors
// //       prediction.dispose();
// //       featureTensor.dispose();

// //       return {
// //         riskLevel: predictedRiskLevel,
// //         riskScore: Math.round(weightedScore),
// //         confidence,
// //         contributingFactors,
// //         patientData
// //       };
// //     } catch (error) {
// //       console.error("Error predicting risk:", error);
// //       return this.predictRiskRuleBased(patientData);
// //     }
// //   }

// //   /**
// //    * Fallback rule-based prediction method
// //    * @param {Object} patient - Patient data
// //    * @returns {Object} - Prediction results
// //    */
// //   predictRiskRuleBased(patient) {
// //     let score = 0;

// //     // Add points for key risk factors
// //     if (patient.mobilityStatus === 'bedbound') score += 40;
// //     else if (patient.mobilityStatus === 'chairbound') score += 30;
// //     else if (patient.mobilityStatus === 'assistance') score += 20;

// //     if (patient.age > 70) score += 20;
// //     else if (patient.age > 60) score += 15;

// //     if (patient.hasDiabetes === 'yes') score += 15;

// //     if (patient.incontinence === 'both') score += 25;
// //     else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') score += 15;

// //     // Calculate BMI if height and weight are available
// //     if (patient.height && patient.weight) {
// //       const heightInMeters = patient.height / 100;
// //       const bmi = patient.weight / (heightInMeters * heightInMeters);

// //       if (bmi < 18.5 || bmi >= 30) score += 15;
// //     }

// //     // Add points for sensor data if available
// //     if (patient.sittingDuration > 120) score += 20;

// //     // Normalize score to 0-100
// //     const normalizedScore = Math.min(100, Math.max(0, score));

// //     // Determine risk level
// //     let riskLevel;
// //     if (normalizedScore < 20) riskLevel = 'low';
// //     else if (normalizedScore < 40) riskLevel = 'moderate';
// //     else if (normalizedScore < 60) riskLevel = 'high';
// //     else riskLevel = 'very-high';

// //     // Identify contributing factors
// //     const contributingFactors = this.getContributingFactors(patient, riskLevel);

// //     return {
// //       riskLevel,
// //       riskScore: normalizedScore,
// //       confidence: Math.round(70 + Math.random() * 25), // Simulate confidence level
// //       contributingFactors,
// //       patientData: patient
// //     };
// //   }

// //   /**
// //    * Get the contributing factors for the risk assessment
// //    * @param {Object} patient - Patient data
// //    * @param {string} riskLevel - Predicted risk level
// //    * @returns {Array} - List of contributing factors
// //    */
// //   getContributingFactors(patient, riskLevel) {
// //     const factors = [];

// //     if (patient.mobilityStatus === 'bedbound') {
// //       factors.push("Bedbound status significantly increases pressure ulcer risk");
// //     } else if (patient.mobilityStatus === 'chairbound') {
// //       factors.push("Limited mobility (chairbound) increases risk of pressure damage");
// //     } else if (patient.mobilityStatus === 'assistance') {
// //       factors.push("Requires assistance with mobility - moderate risk factor");
// //     }

// //     if (patient.age > 70) {
// //       factors.push("Advanced age (>70) - skin is more vulnerable to pressure damage");
// //     } else if (patient.age > 60) {
// //       factors.push("Age over 60 increases susceptibility to pressure injuries");
// //     }

// //     if (patient.hasDiabetes === 'yes') {
// //       factors.push("Diabetes reduces circulation and increases pressure ulcer risk");
// //     }

// //     if (patient.incontinence === 'both') {
// //       factors.push("Double incontinence significantly increases skin vulnerability");
// //     } else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') {
// //       factors.push(`${patient.incontinence.charAt(0).toUpperCase() + patient.incontinence.slice(1)} incontinence increases skin moisture and irritation`);
// //     }

// //     if (patient.height && patient.weight) {
// //       const heightInMeters = patient.height / 100;
// //       const bmi = patient.weight / (heightInMeters * heightInMeters);

// //       if (bmi < 18.5) {
// //         factors.push("Underweight BMI increases risk due to less padding over bony prominences");
// //       } else if (bmi >= 30) {
// //         factors.push("Obesity increases risk due to reduced mobility and skin fold pressure");
// //       }
// //     }

// //     if (patient.sittingDuration > 180) {
// //       factors.push("Extended sitting duration (>3 hours) without position change");
// //     } else if (patient.sittingDuration > 120) {
// //       factors.push("Prolonged sitting duration (>2 hours) increases pressure risk");
// //     }

// //     // If we don't have enough specific factors, add generic ones based on risk level
// //     if (factors.length < 2) {
// //       if (riskLevel === 'high' || riskLevel === 'very-high') {
// //         factors.push("Multiple risk factors present requiring immediate intervention");
// //       } else if (riskLevel === 'moderate') {
// //         factors.push("Combination of risk factors requiring preventive measures");
// //       } else {
// //         factors.push("Some risk factors present requiring monitoring");
// //       }
// //     }

// //     return factors;
// //   }

// //   /**
// //    * Generate recommendations based on risk level and patient data
// //    * @param {Object} patientData - Patient data
// //    * @param {Object} assessment - Risk assessment results
// //    * @returns {Array} - List of recommendations
// //    */
// //   generateRecommendations(patientData, assessment) {
// //     const recommendations = [];
// //     const riskLevel = assessment.riskLevel;

// //     // Common recommendations for all risk levels
// //     recommendations.push("Conduct regular skin assessment at least once daily");
// //     recommendations.push("Ensure adequate hydration and nutrition");

// //     // Mobility-specific recommendations
// //     if (patientData.mobilityStatus === 'bedbound') {
// //       recommendations.push("Implement a strict turning schedule every 2 hours");
// //       recommendations.push("Use pressure redistribution mattress");
// //       recommendations.push("Elevate heels off the bed surface");
// //     } else if (patientData.mobilityStatus === 'chairbound') {
// //       recommendations.push("Ensure weight shifts every 15-30 minutes while seated");
// //       recommendations.push("Use pressure redistribution cushion on seating surfaces");
// //       recommendations.push("Limit continuous sitting to 1 hour when possible");
// //     }

// //     // Incontinence management
// //     if (patientData.incontinence === 'both' || patientData.incontinence === 'fecal' || patientData.incontinence === 'urinary') {
// //       recommendations.push("Implement incontinence management program");
// //       recommendations.push("Clean skin promptly after incontinence episodes");
// //       recommendations.push("Apply moisture barrier to protect skin");
// //     }

// //     // Nutritional considerations
// //     if (patientData.height && patientData.weight) {
// //       const heightInMeters = patientData.height / 100;
// //       const bmi = patientData.weight / (heightInMeters * heightInMeters);

// //       if (bmi < 18.5) {
// //         recommendations.push("Consult dietitian for nutritional support - focus on protein intake");
// //       } else if (bmi >= 30) {
// //         recommendations.push("Manage weight through appropriate diet and mobility plan");
// //       }
// //     }

// //     // Additional recommendations based on risk level
// //     if (riskLevel === 'high' || riskLevel === 'very-high') {
// //       recommendations.push("Consult wound care specialist for preventive plan");
// //       recommendations.push("Consider advanced support surfaces (air-fluidized or low air loss)");
// //       recommendations.push("Document all interventions and assessments in detail");
// //       recommendations.push("Monitor for skin changes every shift (minimum 3 times daily)");
// //     } else if (riskLevel === 'moderate') {
// //       recommendations.push("Use foam dressings on high-risk areas as preventive measure");
// //       recommendations.push("Implement moisture management protocol");
// //       recommendations.push("Monitor for skin changes twice daily");
// //     }

// //     // Filter out duplicates and return
// //     return [...new Set(recommendations)];
// //   }

// //   /**
// //    * Generate a treatment plan for existing bedsores
// //    * @param {Array} bedsores - List of existing bedsores
// //    * @returns {Array} - Treatment plans for each bedsore
// //    */
// //   generateTreatmentPlan(bedsores) {
// //     return bedsores.map(bedsore => {
// //       const stage = bedsore.stage || 'unknown';
// //       const location = bedsore.location || 'unspecified';
// //       const recommendations = [];

// //       // Basic recommendations for all stages
// //       recommendations.push("Relieve pressure completely from affected area");

// //       // Stage-specific recommendations
// //       if (stage.includes('1') || stage === 'stage1') {
// //         recommendations.push("Keep area clean and dry");
// //         recommendations.push("Apply transparent film dressing to protect area");
// //         recommendations.push("Monitor closely for deterioration");
// //       } else if (stage.includes('2') || stage === 'stage2') {
// //         recommendations.push("Clean wound gently with saline or wound cleanser");
// //         recommendations.push("Apply hydrocolloid or foam dressing");
// //         recommendations.push("Change dressing every 3-5 days or when saturated");
// //         recommendations.push("Monitor for signs of infection");
// //       } else if (stage.includes('3') || stage === 'stage3') {
// //         recommendations.push("Consult wound care specialist");
// //         recommendations.push("Perform wound assessment and measurement weekly");
// //         recommendations.push("Consider negative pressure wound therapy");
// //         recommendations.push("Manage exudate with appropriate absorbent dressings");
// //         recommendations.push("Ensure adequate protein intake for wound healing");
// //       } else if (stage.includes('4') || stage === 'stage4') {
// //         recommendations.push("Urgent consultation with wound care team");
// //         recommendations.push("Assess need for surgical debridement");
// //         recommendations.push("Consider advanced wound care therapies");
// //         recommendations.push("Implement comprehensive nutrition support plan");
// //         recommendations.push("Monitor for complications (osteomyelitis, sepsis)");
// //       } else {
// //         // Unstageable or deep tissue injury
// //         recommendations.push("Do not remove stable eschar on heels or dry areas");
// //         recommendations.push("Monitor closely for changes in wound appearance");
// //         recommendations.push("Consult wound care specialist for assessment");
// //         recommendations.push("Apply appropriate dressing based on wound characteristics");
// //       }

// //       // Location-specific recommendations
// //       if (location.toLowerCase().includes('sacrum') || location.toLowerCase().includes('coccyx')) {
// //         recommendations.push("Use 30-degree side-lying position when in bed");
// //         recommendations.push("Consider prone positioning if medically appropriate");
// //       } else if (location.toLowerCase().includes('heel')) {
// //         recommendations.push("Float heels completely off surface using pillows or heel suspension device");
// //         recommendations.push("Do not position directly on the affected heel");
// //       } else if (location.toLowerCase().includes('trochanter') || location.toLowerCase().includes('hip')) {
// //         recommendations.push("Avoid positioning directly on the greater trochanter");
// //         recommendations.push("Use 30-degree lateral position with pillow support");
// //       }

// //       return {
// //         location,
// //         stage,
// //         recommendations: [...new Set(recommendations)]
// //       };
// //     });
// //   }
// // }

// // export default BedsoreMLModel;

// // BedsoreMLModel.js - Firebase compatible version
// import { ref, get } from 'firebase/database';
// import { database } from '../firebase';

// class BedsoreMLModel {
//   constructor() {
//     this.isTrained = false;
//     this.isTraining = false;
//     this.dataset = null;
//     this.featureRanges = {
//       // Pressure readings
//       backPressure_L: { min: 0, max: 100 },
//       backPressure_R: { min: 0, max: 100 },
//       legPressure_L: { min: 0, max: 100 },
//       legPressure_R: { min: 0, max: 100 },
//       shoulderPressure_L: { min: 0, max: 100 },
//       shoulderPressure_R: { min: 0, max: 100 },

//       // Vital signs
//       temperature: { min: 34, max: 42 },
//       heart_rate: { min: 40, max: 180 },
//       spo2: { min: 70, max: 100 },
//       bp_systolic: { min: 70, max: 220 },
//       bp_diastolic: { min: 40, max: 120 },

//       // Environmental factors
//       humidity: { min: 0, max: 100 },

//       // Position metrics
//       duration_min: { min: 0, max: 480 },
//       angle_degree: { min: 0, max: 90 }
//     };
//     this.K_VALUE = 7; // Number of neighbors for kNN algorithm
//   }

//   /**
//    * Load dataset from Firebase
//    * @param {string} path - Firebase path to dataset (default: 'bedsoreDataset')
//    * @returns {Promise<Array>} - Dataset as array
//    */
//   async loadDataset(path = 'C:\Users\ADMIN\Desktop\Spherenex\bedsore\bedsore_dataset (2).csv') {
//     try {
//       console.log(`Loading bedsore dataset from Firebase path: ${path}`);
//       this.isTraining = true;

//       // Reference to the dataset in Firebase
//       const datasetRef = ref(database, path);
//       const snapshot = await get(datasetRef);

//       if (snapshot.exists()) {
//         // Convert Firebase snapshot to array
//         const dataArray = [];
//         snapshot.forEach((childSnapshot) => {
//           dataArray.push({
//             id: childSnapshot.key,
//             ...childSnapshot.val()
//           });
//         });

//         console.log(`Loaded dataset with ${dataArray.length} records from Firebase`);
//         this.dataset = dataArray;
//       } else {
//         console.log("No dataset found in Firebase, using synthetic data");
//         // Create a synthetic dataset
//         this.dataset = this.createSyntheticDataset();
//       }

//       // Calculate feature ranges for the loaded dataset
//       this.calculateFeatureRanges();

//       this.isTrained = true;
//       this.isTraining = false;
//       return this.dataset;
//     } catch (error) {
//       console.error("Error loading dataset from Firebase:", error);
//       this.isTraining = false;
//       // Create synthetic dataset as fallback
//       this.dataset = this.createSyntheticDataset();
//       this.calculateFeatureRanges();
//       this.isTrained = true;
//       return this.dataset;
//     }
//   }

//   /**
//    * Create a synthetic dataset for testing/fallback
//    * @returns {Array} - Synthetic dataset
//    */
//   createSyntheticDataset() {
//     console.log("Creating synthetic dataset for model");
//     const syntheticData = [];

//     // Generate synthetic data with various risk levels
//     // Low risk cases
//     for (let i = 0; i < 15; i++) {
//       syntheticData.push({
//         backPressure_L: this.randomBetween(0, 20),
//         backPressure_R: this.randomBetween(0, 20),
//         legPressure_L: this.randomBetween(0, 20),
//         legPressure_R: this.randomBetween(0, 20),
//         shoulderPressure_L: this.randomBetween(0, 20),
//         shoulderPressure_R: this.randomBetween(0, 20),
//         temperature: this.randomBetween(36, 37),
//         heart_rate: this.randomBetween(60, 90),
//         spo2: this.randomBetween(95, 100),
//         bp_systolic: this.randomBetween(110, 130),
//         bp_diastolic: this.randomBetween(70, 85),
//         humidity: this.randomBetween(40, 60),
//         duration_min: this.randomBetween(0, 90),
//         angle_degree: this.randomBetween(20, 40),
//         bedsore_risk: 'low'
//       });
//     }

//     // Moderate risk cases
//     for (let i = 0; i < 15; i++) {
//       syntheticData.push({
//         backPressure_L: this.randomBetween(15, 35),
//         backPressure_R: this.randomBetween(15, 35),
//         legPressure_L: this.randomBetween(15, 35),
//         legPressure_R: this.randomBetween(15, 35),
//         shoulderPressure_L: this.randomBetween(15, 35),
//         shoulderPressure_R: this.randomBetween(15, 35),
//         temperature: this.randomBetween(35.5, 37.5),
//         heart_rate: this.randomBetween(55, 100),
//         spo2: this.randomBetween(92, 98),
//         bp_systolic: this.randomBetween(100, 140),
//         bp_diastolic: this.randomBetween(65, 90),
//         humidity: this.randomBetween(35, 65),
//         duration_min: this.randomBetween(90, 150),
//         angle_degree: this.randomBetween(15, 45),
//         bedsore_risk: 'moderate'
//       });
//     }

//     // High risk cases
//     for (let i = 0; i < 15; i++) {
//       syntheticData.push({
//         backPressure_L: this.randomBetween(30, 50),
//         backPressure_R: this.randomBetween(30, 50),
//         legPressure_L: this.randomBetween(30, 50),
//         legPressure_R: this.randomBetween(30, 50),
//         shoulderPressure_L: this.randomBetween(30, 50),
//         shoulderPressure_R: this.randomBetween(30, 50),
//         temperature: this.randomBetween(35, 38),
//         heart_rate: this.randomBetween(50, 110),
//         spo2: this.randomBetween(88, 95),
//         bp_systolic: this.randomBetween(90, 150),
//         bp_diastolic: this.randomBetween(60, 95),
//         humidity: this.randomBetween(30, 70),
//         duration_min: this.randomBetween(150, 240),
//         angle_degree: this.randomBetween(10, 50),
//         bedsore_risk: 'high'
//       });
//     }

//     // Very high risk cases
//     for (let i = 0; i < 15; i++) {
//       syntheticData.push({
//         backPressure_L: this.randomBetween(40, 70),
//         backPressure_R: this.randomBetween(40, 70),
//         legPressure_L: this.randomBetween(40, 70),
//         legPressure_R: this.randomBetween(40, 70),
//         shoulderPressure_L: this.randomBetween(40, 70),
//         shoulderPressure_R: this.randomBetween(40, 70),
//         temperature: this.randomBetween(34.5, 38.5),
//         heart_rate: this.randomBetween(45, 120),
//         spo2: this.randomBetween(85, 93),
//         bp_systolic: this.randomBetween(80, 160),
//         bp_diastolic: this.randomBetween(55, 100),
//         humidity: this.randomBetween(25, 75),
//         duration_min: this.randomBetween(240, 480),
//         angle_degree: this.randomBetween(5, 55),
//         bedsore_risk: 'very-high'
//       });
//     }

//     console.log(`Created synthetic dataset with ${syntheticData.length} records`);
//     return syntheticData;
//   }

//   /**
//    * Helper function to generate random number between min and max
//    * @param {number} min - Minimum value
//    * @param {number} max - Maximum value
//    * @returns {number} - Random number
//    */
//   randomBetween(min, max) {
//     return Math.random() * (max - min) + min;
//   }

//   /**
//    * Calculate the min/max ranges for each feature based on dataset
//    */
//   calculateFeatureRanges() {
//     if (!this.dataset || this.dataset.length === 0) return;

//     // Initialize ranges with first record values
//     const firstRecord = this.dataset[0];

//     // Update ranges with dataset values
//     this.dataset.forEach(record => {
//       Object.keys(this.featureRanges).forEach(feature => {
//         // Skip if feature doesn't exist in record
//         if (record[feature] === undefined || record[feature] === null) return;

//         // Update min/max values
//         if (record[feature] < this.featureRanges[feature].min) {
//           this.featureRanges[feature].min = record[feature];
//         }
//         if (record[feature] > this.featureRanges[feature].max) {
//           this.featureRanges[feature].max = record[feature];
//         }
//       });
//     });

//     console.log("Feature ranges calculated from dataset");
//   }

//   /**
//    * Train the model by loading the dataset and calculating feature ranges
//    * @param {string} datasetPath - Firebase path to the dataset
//    * @returns {Promise<boolean>} - Whether training was successful
//    */
//   async trainModel(datasetPath = 'bedsoreDataset') {
//     try {
//       if (this.isTraining) {
//         console.log("Model is already training");
//         return false;
//       }

//       console.log("Training bedsore prediction model...");
//       this.isTraining = true;

//       // Load dataset and calculate feature ranges
//       await this.loadDataset(datasetPath);

//       this.isTrained = true;
//       this.isTraining = false;
//       console.log("Model training complete");
//       return true;
//     } catch (error) {
//       console.error("Error training model:", error);
//       this.isTraining = false;
//       return false;
//     }
//   }

//   /**
//    * Normalize a patient feature for comparison with dataset
//    * @param {string} feature - Feature name
//    * @param {number} value - Feature value
//    * @returns {number} - Normalized value (0-1)
//    */
//   normalizeFeature(feature, value) {
//     if (this.featureRanges[feature]) {
//       const { min, max } = this.featureRanges[feature];
//       if (max === min) return 0.5;
//       return (value - min) / (max - min);
//     }
//     return value; // Return original value if no range info
//   }

//   /**
//    * Normalize patient data for prediction
//    * @param {Object} patient - Patient data
//    * @param {Object} metrics - Health metrics
//    * @returns {Object} - Normalized patient features
//    */
//   normalizePatientData(patient, metrics) {
//     return {
//       // Pressure readings
//       backPressure_L: metrics?.backPressure_L || 0,
//       backPressure_R: metrics?.backPressure_R || 0,
//       legPressure_L: metrics?.legPressure_L || 0,
//       legPressure_R: metrics?.legPressure_R || 0,
//       shoulderPressure_L: metrics?.shoulderPressure_L || 0,
//       shoulderPressure_R: metrics?.shoulderPressure_R || 0,

//       // Vital signs
//       temperature: metrics?.temperature || 36.5,
//       heart_rate: metrics?.heartRate || 75,
//       spo2: metrics?.spo2 || 98,
//       bp_systolic: metrics?.bp?.systolic || 120,
//       bp_diastolic: metrics?.bp?.diastolic || 80,

//       // Environmental factors
//       humidity: metrics?.humidity || 50,

//       // Position metrics
//       duration_min: metrics?.sittingDuration || 0,
//       angle_degree: metrics?.Angle || metrics?.angle || 0,

//       // Patient health data (derived flags for the model)
//       is_bedbound: patient?.mobilityStatus === 'bedbound' ? 1 : 0,
//       is_chairbound: patient?.mobilityStatus === 'chairbound' ? 1 : 0,
//       has_diabetes: patient?.hasDiabetes === 'yes' ? 1 : 0,
//       has_incontinence: patient?.incontinence !== 'no' && patient?.incontinence ? 1 : 0
//     };
//   }

//   /**
//    * Predict bedsore risk using k-nearest neighbors algorithm
//    * @param {Object} patient - Patient data
//    * @param {Object} metrics - Health metrics
//    * @returns {Object} - Prediction results
//    */
//   predictRisk(patient, metrics) {
//     // Ensure model is trained
//     if (!this.isTrained || !this.dataset || this.dataset.length === 0) {
//       console.log("Model not trained or dataset empty, using fallback prediction");
//       return this.predictRiskRuleBased(patient, metrics);
//     }

//     try {
//       console.log("Predicting bedsore risk using kNN classification...");

//       // Extract features from patient data
//       const patientFeatures = this.normalizePatientData(patient, metrics);

//       // Calculate distances to all dataset records
//       const neighbors = this.findNearestNeighbors(patientFeatures);

//       // Classify based on nearest neighbors
//       const prediction = this.classifyByNeighbors(neighbors);

//       // Calculate feature importance
//       const importantFeatures = this.calculateFeatureImportance(patientFeatures, neighbors, prediction.riskLevel);

//       // Generate recommendations
//       const recommendations = this.generateRecommendations(prediction.riskLevel, importantFeatures, patient);

//       return {
//         ...prediction,
//         importantFeatures,
//         recommendations,
//         neighbors: neighbors.slice(0, 5) // Include top 5 neighbors for reference
//       };
//     } catch (error) {
//       console.error("Error in kNN prediction:", error);
//       return this.predictRiskRuleBased(patient, metrics);
//     }
//   }

//   /**
//    * Find k nearest neighbors to patient in dataset
//    * @param {Object} patientFeatures - Patient features
//    * @returns {Array} - Nearest neighbors with distances
//    */
//   findNearestNeighbors(patientFeatures) {
//     // Feature weights for distance calculation
//     const weights = {
//       // Pressure readings (high importance)
//       backPressure_L: 2,
//       backPressure_R: 2,
//       legPressure_L: 2.5,
//       legPressure_R: 2.5,
//       shoulderPressure_L: 2.5,
//       shoulderPressure_R: 2.5,

//       // Position factors (high importance)
//       duration_min: 3,
//       angle_degree: 1.5,

//       // Vital signs (medium importance)
//       temperature: 1,
//       heart_rate: 1.5,
//       spo2: 1.5,
//       bp_systolic: 1,
//       bp_diastolic: 1,

//       // Environmental factors (low importance)
//       humidity: 0.5,

//       // Patient condition flags (high importance)
//       is_bedbound: 3,
//       is_chairbound: 2,
//       has_diabetes: 2.5,
//       has_incontinence: 2
//     };

//     // Calculate distance for each record
//     const recordsWithDistances = this.dataset.map(record => {
//       let weightedDistance = 0;
//       let totalWeight = 0;
//       let featureDistances = {};

//       // Feature-by-feature distance calculation
//       Object.keys(weights).forEach(feature => {
//         // Skip if feature is not in patient data
//         if (patientFeatures[feature] === undefined) return;

//         // Get record value (or infer if missing)
//         let recordValue = record[feature];

//         // Skip if record value is missing and can't be inferred
//         if (recordValue === undefined || recordValue === null) {
//           // For some features, try to infer values from risk level
//           if (feature === 'is_bedbound') {
//             recordValue = record.bedsore_risk?.includes('high') ? 0.7 : 0.3;
//           } else if (feature === 'has_diabetes') {
//             recordValue = 0; // Conservative default
//           } else {
//             return; // Skip this feature
//           }
//         }

//         // Calculate normalized feature distance
//         const featureWeight = weights[feature];

//         // For binary features, use exact match/mismatch
//         if (feature === 'is_bedbound' || feature === 'is_chairbound' || 
//             feature === 'has_diabetes' || feature === 'has_incontinence') {
//           const featureDistance = patientFeatures[feature] === recordValue ? 0 : 1;
//           weightedDistance += featureWeight * featureDistance;
//           featureDistances[feature] = featureDistance;
//         } else {
//           // Normalize values using feature ranges
//           const patientNormalized = this.normalizeFeature(feature, patientFeatures[feature]);
//           const recordNormalized = this.normalizeFeature(feature, recordValue);

//           // Calculate absolute difference
//           const featureDistance = Math.abs(patientNormalized - recordNormalized);

//           // Add weighted distance
//           weightedDistance += featureWeight * featureDistance;
//           featureDistances[feature] = featureDistance;
//         }

//         totalWeight += featureWeight;
//       });

//       // Normalize final distance
//       const normalizedDistance = totalWeight > 0 ? weightedDistance / totalWeight : Infinity;

//       return {
//         record,
//         distance: normalizedDistance,
//         featureDistances
//       };
//     });

//     // Sort by distance (nearest first) and take k neighbors
//     return recordsWithDistances
//       .sort((a, b) => a.distance - b.distance)
//       .slice(0, this.K_VALUE);
//   }

//   /**
//    * Classify risk level based on nearest neighbors
//    * @param {Array} neighbors - Nearest neighbors with distances
//    * @returns {Object} - Classification result
//    */
//   classifyByNeighbors(neighbors) {
//     // Count risk levels among neighbors
//     const riskCounts = {};

//     neighbors.forEach(({ record }) => {
//       const risk = this.standardizeRiskLevel(record.bedsore_risk);
//       riskCounts[risk] = (riskCounts[risk] || 0) + 1;
//     });

//     // Find majority risk level
//     let predictedRiskLevel = 'low';
//     let maxCount = 0;

//     Object.entries(riskCounts).forEach(([risk, count]) => {
//       if (count > maxCount) {
//         maxCount = count;
//         predictedRiskLevel = risk;
//       }
//     });

//     // Break ties in favor of higher risk level
//     if (Object.values(riskCounts).filter(count => count === maxCount).length > 1) {
//       if (riskCounts['high'] === maxCount) {
//         predictedRiskLevel = 'high';
//       } else if (riskCounts['very-high'] === maxCount) {
//         predictedRiskLevel = 'very-high';
//       }
//     }

//     // Calculate confidence as percentage of neighbors with the same prediction
//     const confidence = Math.round((maxCount / neighbors.length) * 100);

//     // Calculate risk score based on risk level
//     let riskScore;
//     switch (predictedRiskLevel) {
//       case 'very-high':
//         riskScore = 85 + Math.random() * 15;
//         break;
//       case 'high':
//         riskScore = 60 + Math.random() * 20;
//         break;
//       case 'moderate':
//         riskScore = 30 + Math.random() * 25;
//         break;
//       case 'low':
//       default:
//         riskScore = 5 + Math.random() * 20;
//     }

//     return {
//       riskLevel: predictedRiskLevel,
//       riskScore: Math.round(riskScore),
//       confidence
//     };
//   }

//   /**
//    * Standardize risk level string to one of four categories
//    * @param {string} riskString - Raw risk level string
//    * @returns {string} - Standardized risk level
//    */
//   standardizeRiskLevel(riskString) {
//     if (!riskString) return 'low';

//     const lowerRisk = String(riskString).toLowerCase();

//     if (lowerRisk.includes('very') && lowerRisk.includes('high')) {
//       return 'very-high';
//     } else if (lowerRisk.includes('high')) {
//       return 'high';
//     } else if (lowerRisk.includes('moderate') || lowerRisk.includes('med')) {
//       return 'moderate';
//     } else {
//       return 'low';
//     }
//   }

//   /**
//    * Calculate feature importance based on neighbors
//    * @param {Object} patientFeatures - Patient features
//    * @param {Array} neighbors - Nearest neighbors
//    * @param {string} predictedRiskLevel - Predicted risk level
//    * @returns {Array} - Important features
//    */
//   calculateFeatureImportance(patientFeatures, neighbors, predictedRiskLevel) {
//     // Define feature display names
//     const featureDisplayNames = {
//       backPressure_L: 'Back Pressure (Left)',
//       backPressure_R: 'Back Pressure (Right)',
//       legPressure_L: 'Leg Pressure (Left)',
//       legPressure_R: 'Leg Pressure (Right)',
//       shoulderPressure_L: 'Shoulder Pressure (Left)',
//       shoulderPressure_R: 'Shoulder Pressure (Right)',
//       temperature: 'Body Temperature',
//       heart_rate: 'Heart Rate',
//       spo2: 'Oxygen Saturation',
//       bp_systolic: 'Systolic Blood Pressure',
//       bp_diastolic: 'Diastolic Blood Pressure',
//       humidity: 'Skin Humidity',
//       duration_min: 'Sitting/Lying Duration',
//       angle_degree: 'Body Position Angle',
//       is_bedbound: 'Bedbound Status',
//       is_chairbound: 'Chairbound Status',
//       has_diabetes: 'Diabetes',
//       has_incontinence: 'Incontinence'
//     };

//     // Group neighbors by risk level
//     const neighborsByRisk = {};
//     neighbors.forEach(neighbor => {
//       const risk = this.standardizeRiskLevel(neighbor.record.bedsore_risk);
//       if (!neighborsByRisk[risk]) neighborsByRisk[risk] = [];
//       neighborsByRisk[risk].push(neighbor);
//     });

//     // Use neighbors with same risk level for importance calculation
//     const sameRiskNeighbors = neighborsByRisk[predictedRiskLevel] || neighbors;

//     // Calculate average values for neighbors with same risk
//     const averages = {};
//     Object.keys(featureDisplayNames).forEach(feature => {
//       const values = sameRiskNeighbors
//         .map(n => n.record[feature])
//         .filter(v => v !== undefined && v !== null);

//       if (values.length > 0) {
//         averages[feature] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
//       }
//     });

//     // Base weights for feature types
//     const baseWeights = {
//       pressure: 2.5,
//       position: 2.0,
//       vitals: 1.5,
//       condition: 3.0,
//       environmental: 1.0
//     };

//     // Feature type mapping
//     const featureTypes = {
//       backPressure_L: 'pressure',
//       backPressure_R: 'pressure',
//       legPressure_L: 'pressure',
//       legPressure_R: 'pressure',
//       shoulderPressure_L: 'pressure',
//       shoulderPressure_R: 'pressure',
//       temperature: 'vitals',
//       heart_rate: 'vitals',
//       spo2: 'vitals',
//       bp_systolic: 'vitals',
//       bp_diastolic: 'vitals',
//       humidity: 'environmental',
//       duration_min: 'position',
//       angle_degree: 'position',
//       is_bedbound: 'condition',
//       is_chairbound: 'condition',
//       has_diabetes: 'condition',
//       has_incontinence: 'condition'
//     };

//     // Calculate importance for each feature
//     const featureImportance = [];

//     Object.keys(featureDisplayNames).forEach(feature => {
//       if (patientFeatures[feature] === undefined) return;

//       const featureType = featureTypes[feature] || 'other';
//       const baseWeight = baseWeights[featureType] || 1.0;
//       let importance = baseWeight;

//       // For binary features, higher importance if matches typical value for risk level
//       if (feature === 'is_bedbound' || feature === 'is_chairbound' || 
//           feature === 'has_diabetes' || feature === 'has_incontinence') {
//         if (averages[feature] !== undefined) {
//           const match = Math.abs(patientFeatures[feature] - averages[feature]) < 0.5;

//           // Extra importance for risk factors in high risk prediction
//           if ((predictedRiskLevel === 'high' || predictedRiskLevel === 'very-high') && 
//               patientFeatures[feature] > 0.5) {
//             importance = baseWeight * 1.5;
//           } else if (match) {
//             importance = baseWeight;
//           } else {
//             importance = baseWeight * 0.5;
//           }
//         }
//       } 
//       // For numerical features, importance based on similarity to typical values
//       else if (averages[feature] !== undefined) {
//         const patientValue = patientFeatures[feature];
//         const typicalValue = averages[feature];

//         // Normalize difference
//         const max = this.featureRanges[feature]?.max || 100;
//         const min = this.featureRanges[feature]?.min || 0;
//         const range = max - min || 1;

//         const normalizedDiff = Math.abs(patientValue - typicalValue) / range;
//         const similarity = 1 - Math.min(1, normalizedDiff);

//         // Higher similarity = higher importance
//         importance = baseWeight * (0.3 + similarity * 0.7);

//         // Boost importance for extreme values
//         if (patientValue <= min + range * 0.2 || patientValue >= max - range * 0.2) {
//           importance *= 1.2;
//         }
//       }

//       // Special case handling for high-risk factors
//       if (predictedRiskLevel === 'high' || predictedRiskLevel === 'very-high') {
//         if ((feature === 'is_bedbound' && patientFeatures[feature] > 0.5) ||
//             (feature === 'has_diabetes' && patientFeatures[feature] > 0.5) ||
//             (feature === 'duration_min' && patientFeatures[feature] > 120)) {
//           importance *= 1.3;
//         }
//       }

//       // Add feature to importance list
//       featureImportance.push({
//         name: featureDisplayNames[feature] || feature,
//         value: patientFeatures[feature],
//         importance: importance,
//         isRiskFactor: this.isClinicalRiskFactor(feature, patientFeatures[feature])
//       });
//     });

//     // Sort by importance and return top 5
//     return featureImportance
//       .sort((a, b) => b.importance - a.importance)
//       .slice(0, 5);
//   }

//   /**
//    * Check if a feature value indicates clinical risk
//    * @param {string} feature - Feature name 
//    * @param {number} value - Feature value
//    * @returns {boolean} - Is risk factor
//    */
//   isClinicalRiskFactor(feature, value) {
//     switch (feature) {
//       case 'is_bedbound':
//       case 'is_chairbound':
//       case 'has_diabetes':
//       case 'has_incontinence':
//         return value > 0.5;
//       case 'duration_min':
//         return value > 120; // Over 2 hours
//       case 'backPressure_L':
//       case 'backPressure_R':
//       case 'legPressure_L':
//       case 'legPressure_R':
//       case 'shoulderPressure_L':
//       case 'shoulderPressure_R':
//         return value > 30; // High pressure
//       case 'spo2':
//         return value < 92; // Low oxygen
//       case 'temperature':
//         return value > 38 || value < 36; // Fever or hypothermia
//       default:
//         return false;
//     }
//   }

//   /**
//    * Generate recommendations based on risk level and patient features
//    * @param {string} riskLevel - Predicted risk level
//    * @param {Array} importantFeatures - Important features
//    * @param {Object} patient - Patient data
//    * @returns {Array} - Recommendations
//    */
//   generateRecommendations(riskLevel, importantFeatures, patient) {
//     const baseRecommendations = {
//       'low': [
//         "Continue regular skin inspections daily",
//         "Stay well-hydrated and maintain good nutrition",
//         "Change positions at least every 4 hours when sitting or lying"
//       ],
//       'moderate': [
//         "Inspect skin twice daily, especially over bony areas",
//         "Use pressure-redistributing cushions when sitting",
//         "Change position at least every 2 hours",
//         "Ensure adequate nutrition and hydration",
//         "Keep skin clean and dry"
//       ],
//       'high': [
//         "Implement strict repositioning schedule (every 1-2 hours)",
//         "Use specialized pressure-relieving mattress",
//         "Consider consultation with wound specialist",
//         "Implement moisture management for incontinence",
//         "Ensure optimal nutrition with protein supplements if needed",
//         "Apply protective skin barriers to high-risk areas"
//       ],
//       'very-high': [
//         "URGENT: Consult healthcare provider immediately",
//         "Consider specialized air-fluidized or low air loss bed surface",
//         "Implement strict repositioning schedule (every 1 hour)",
//         "Apply protective dressings to high-risk areas preventively",
//         "Request nutritional assessment and intervention",
//         "Monitor skin condition every shift/several times daily",
//         "Consider prophylactic dressings for high-risk areas"
//       ]
//     };

//     let recommendations = [...baseRecommendations[riskLevel]];

//     // Add feature-specific recommendations
//     importantFeatures.forEach(feature => {
//       // Add recommendations based on feature name and value
//       if (feature.name === 'Sitting/Lying Duration' && feature.value > 120) {
//         recommendations.push("Reduce continuous sitting/lying duration - implement a movement schedule");
//       }

//       if (feature.name.includes('Pressure') && feature.value > 30) {
//         recommendations.push(`Reduce pressure on ${feature.name.toLowerCase()} - consider pressure redistribution aids`);
//       }

//       if (feature.name === 'Body Position Angle' && 
//          (feature.value < 15 || feature.value > 45)) {
//         recommendations.push("Adjust body position angle to between 15-45 degrees when in bed to reduce pressure");
//       }

//       if (feature.name === 'Bedbound Status' && feature.value > 0.5) {
//         recommendations.push("Use pillows and foam wedges to offload pressure points when in bed");
//         recommendations.push("Implement a strict turning schedule with documented position changes");
//       }

//       if (feature.name === 'Diabetes' && feature.value > 0.5) {
//         recommendations.push("Monitor blood glucose levels closely as poor glycemic control impairs healing");
//         recommendations.push("Pay special attention to feet and heels during skin inspections");
//       }

//       if (feature.name === 'Incontinence' && feature.value > 0.5) {
//         recommendations.push("Use absorbent products designed for minimal skin contact with moisture");
//         recommendations.push("Apply barrier creams to protect skin from moisture damage");
//       }
//     });

//     // Add mobility-specific recommendations
//     if (patient.mobilityStatus === 'bedbound') {
//       recommendations.push("For bedbound patients, ensure heels are elevated off the bed surface");
//     } else if (patient.mobilityStatus === 'chairbound') {
//       recommendations.push("For chairbound patients, perform pressure relief maneuvers every 15-30 minutes");
//     }

//     // Make list unique and limit to reasonable number
//     const uniqueRecommendations = [...new Set(recommendations)];
//     return uniqueRecommendations.slice(0, riskLevel === 'low' ? 5 : 8);
//   }

//   /**
//    * Fallback rule-based prediction method
//    * @param {Object} patient - Patient data
//    * @param {Object} metrics - Health metrics
//    * @returns {Object} - Prediction results
//    */
//   predictRiskRuleBased(patient, metrics) {
//     console.log("Using rule-based prediction as fallback");

//     let score = 0;

//     // Add points for key risk factors
//     if (patient.mobilityStatus === 'bedbound') score += 40;
//     else if (patient.mobilityStatus === 'chairbound') score += 30;
//     else if (patient.mobilityStatus === 'assistance') score += 20;

//     if (patient.age > 70) score += 20;
//     else if (patient.age > 60) score += 15;

//     if (patient.hasDiabetes === 'yes') score += 15;

//     if (patient.incontinence === 'both') score += 25;
//     else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') score += 15;

//     // Calculate BMI if height and weight are available
//     if (patient.height && patient.weight) {
//       const heightInMeters = patient.height / 100;
//       const bmi = patient.weight / (heightInMeters * heightInMeters);

//       if (bmi < 18.5 || bmi >= 30) score += 15;
//     }

//     // Add points for sensor data if available
//     if (metrics?.sittingDuration > 120) score += 20;

//     // Add points for pressure readings
//     if (metrics) {
//       if ((metrics.backPressure_L > 30) || (metrics.backPressure_R > 30)) score += 10;
//       if ((metrics.legPressure_L > 30) || (metrics.legPressure_R > 30)) score += 10;
//       if ((metrics.shoulderPressure_L > 30) || (metrics.shoulderPressure_R > 30)) score += 10;
//     }

//     // Normalize score to 0-100
//     const riskScore = Math.min(100, Math.max(0, score));

//     // Determine risk level
//     let riskLevel;
//     if (riskScore < 20) riskLevel = 'low';
//     else if (riskScore < 40) riskLevel = 'moderate';
//     else if (riskScore < 60) riskLevel = 'high';
//     else riskLevel = 'very-high';

//     // Generate mock feature importance
//     const importantFeatures = [
//       { 
//         name: 'Mobility Status', 
//         value: patient.mobilityStatus === 'bedbound' ? 1 : 
//                patient.mobilityStatus === 'chairbound' ? 0.7 : 
//                patient.mobilityStatus === 'assistance' ? 0.5 : 0.1,
//         importance: 10,
//         isRiskFactor: patient.mobilityStatus === 'bedbound' || patient.mobilityStatus === 'chairbound'
//       },
//       { 
//         name: 'Age', 
//         value: patient.age || 50, 
//         importance: 8,
//         isRiskFactor: (patient.age || 0) > 60
//       },
//       { 
//         name: 'Diabetes', 
//         value: patient.hasDiabetes === 'yes' ? 1 : 0, 
//         importance: 7,
//         isRiskFactor: patient.hasDiabetes === 'yes'
//       },
//       { 
//         name: 'Incontinence', 
//         value: patient.incontinence === 'both' ? 1 : 
//                patient.incontinence === 'fecal' || patient.incontinence === 'urinary' ? 0.7 : 0,
//         importance: 6,
//         isRiskFactor: patient.incontinence && patient.incontinence !== 'no'
//       },
//       { 
//         name: 'Sitting Duration', 
//         value: metrics?.sittingDuration || 0, 
//         importance: 5,
//         isRiskFactor: (metrics?.sittingDuration || 0) > 120
//       }
//     ];

//     // Generate recommendations
//     const recommendations = this.generateRecommendations(riskLevel, importantFeatures, patient);

//     return {
//       riskLevel,
//       riskScore,
//       confidence: 70,
//       importantFeatures,
//       recommendations,
//       isRuleBased: true
//     };
//   }
// }

// export default BedsoreMLModel;

// BedsoreMLModel.js - Firebase compatible version
import { ref, get } from 'firebase/database';
import { database } from '../firebase';

class BedsoreMLModel {
  constructor() {
    this.isTrained = false;
    this.isTraining = false;
    this.dataset = null;

    // Define pressure thresholds in mmHg
    this.VERY_HIGH_PRESSURE_THRESHOLD = 80;
    this.HIGH_PRESSURE_THRESHOLD = 50;
    this.MODERATE_PRESSURE_THRESHOLD = 30;
    this.LOW_PRESSURE_THRESHOLD = 15;

    this.featureRanges = {
      // Pressure readings
      backPressure_L: { min: 0, max: 100 },
      backPressure_R: { min: 0, max: 100 },
      legPressure_L: { min: 0, max: 100 },
      legPressure_R: { min: 0, max: 100 },
      shoulderPressure_L: { min: 0, max: 100 },
      shoulderPressure_R: { min: 0, max: 100 },

      // Vital signs
      temperature: { min: 34, max: 42 },
      heart_rate: { min: 40, max: 180 },
      spo2: { min: 70, max: 100 },
      bp_systolic: { min: 70, max: 220 },
      bp_diastolic: { min: 40, max: 120 },

      // Environmental factors
      humidity: { min: 0, max: 100 },

      // Position metrics
      duration_min: { min: 0, max: 480 },
      angle_degree: { min: 0, max: 90 }
    };

    this.K_VALUE = 7; // Number of neighbors for kNN algorithm
  }

  /**
   * Load dataset from Firebase
   * @param {string} path - Firebase path to dataset (default: 'bedsoreDataset')
   * @returns {Promise<Array>} - Dataset as array
   */
  async loadDataset(path = 'bedsoreDataset') {
    try {
      console.log(`Loading bedsore dataset from Firebase path: ${path}`);
      this.isTraining = true;

      // Reference to the dataset in Firebase
      const datasetRef = ref(database, path);
      const snapshot = await get(datasetRef);

      if (snapshot.exists()) {
        // Convert Firebase snapshot to array
        const dataArray = [];
        snapshot.forEach((childSnapshot) => {
          dataArray.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });

        console.log(`Loaded dataset with ${dataArray.length} records from Firebase`);
        this.dataset = dataArray;
      } else {
        console.log("No dataset found in Firebase, using synthetic data");
        // Create a synthetic dataset
        this.dataset = this.createSyntheticDataset();
      }

      // Calculate feature ranges for the loaded dataset
      this.calculateFeatureRanges();

      this.isTrained = true;
      this.isTraining = false;
      return this.dataset;
    } catch (error) {
      console.error("Error loading dataset from Firebase:", error);
      this.isTraining = false;
      // Create synthetic dataset as fallback
      this.dataset = this.createSyntheticDataset();
      this.calculateFeatureRanges();
      this.isTrained = true;
      return this.dataset;
    }
  }

  /**
   * Create a synthetic dataset for testing/fallback
   * @returns {Array} - Synthetic dataset
   */
  createSyntheticDataset() {
    console.log("Creating synthetic dataset for model");
    const syntheticData = [];

    // Generate synthetic data with various risk levels
    // Low risk cases
    for (let i = 0; i < 15; i++) {
      syntheticData.push({
        backPressure_L: this.randomBetween(0, 20),
        backPressure_R: this.randomBetween(0, 20),
        legPressure_L: this.randomBetween(0, 20),
        legPressure_R: this.randomBetween(0, 20),
        shoulderPressure_L: this.randomBetween(0, 20),
        shoulderPressure_R: this.randomBetween(0, 20),
        temperature: this.randomBetween(36, 37),
        heart_rate: this.randomBetween(60, 90),
        spo2: this.randomBetween(95, 100),
        bp_systolic: this.randomBetween(110, 130),
        bp_diastolic: this.randomBetween(70, 85),
        humidity: this.randomBetween(40, 60),
        duration_min: this.randomBetween(0, 90),
        angle_degree: this.randomBetween(20, 40),
        bedsore_risk: 'low'
      });
    }

    // Moderate risk cases
    for (let i = 0; i < 15; i++) {
      syntheticData.push({
        backPressure_L: this.randomBetween(15, 35),
        backPressure_R: this.randomBetween(15, 35),
        legPressure_L: this.randomBetween(15, 35),
        legPressure_R: this.randomBetween(15, 35),
        shoulderPressure_L: this.randomBetween(15, 35),
        shoulderPressure_R: this.randomBetween(15, 35),
        temperature: this.randomBetween(35.5, 37.5),
        heart_rate: this.randomBetween(55, 100),
        spo2: this.randomBetween(92, 98),
        bp_systolic: this.randomBetween(100, 140),
        bp_diastolic: this.randomBetween(65, 90),
        humidity: this.randomBetween(35, 65),
        duration_min: this.randomBetween(90, 150),
        angle_degree: this.randomBetween(15, 45),
        bedsore_risk: 'moderate'
      });
    }

    // High risk cases
    for (let i = 0; i < 15; i++) {
      syntheticData.push({
        backPressure_L: this.randomBetween(30, 50),
        backPressure_R: this.randomBetween(30, 50),
        legPressure_L: this.randomBetween(30, 50),
        legPressure_R: this.randomBetween(30, 50),
        shoulderPressure_L: this.randomBetween(30, 50),
        shoulderPressure_R: this.randomBetween(30, 50),
        temperature: this.randomBetween(35, 38),
        heart_rate: this.randomBetween(50, 110),
        spo2: this.randomBetween(88, 95),
        bp_systolic: this.randomBetween(90, 150),
        bp_diastolic: this.randomBetween(60, 95),
        humidity: this.randomBetween(30, 70),
        duration_min: this.randomBetween(150, 240),
        angle_degree: this.randomBetween(10, 50),
        bedsore_risk: 'high'
      });
    }

    // Very high risk cases
    for (let i = 0; i < 15; i++) {
      syntheticData.push({
        backPressure_L: this.randomBetween(40, 70),
        backPressure_R: this.randomBetween(40, 70),
        legPressure_L: this.randomBetween(40, 70),
        legPressure_R: this.randomBetween(40, 70),
        shoulderPressure_L: this.randomBetween(40, 70),
        shoulderPressure_R: this.randomBetween(40, 70),
        temperature: this.randomBetween(34.5, 38.5),
        heart_rate: this.randomBetween(45, 120),
        spo2: this.randomBetween(85, 93),
        bp_systolic: this.randomBetween(80, 160),
        bp_diastolic: this.randomBetween(55, 100),
        humidity: this.randomBetween(25, 75),
        duration_min: this.randomBetween(240, 480),
        angle_degree: this.randomBetween(5, 55),
        bedsore_risk: 'very-high'
      });
    }

    console.log(`Created synthetic dataset with ${syntheticData.length} records`);
    return syntheticData;
  }

  /**
   * Helper function to generate random number between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} - Random number
   */
  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Calculate the min/max ranges for each feature based on dataset
   */
  calculateFeatureRanges() {
    if (!this.dataset || this.dataset.length === 0) return;

    // Initialize ranges with first record values
    const firstRecord = this.dataset[0];

    // Update ranges with dataset values
    this.dataset.forEach(record => {
      Object.keys(this.featureRanges).forEach(feature => {
        // Skip if feature doesn't exist in record
        if (record[feature] === undefined || record[feature] === null) return;

        // Update min/max values
        if (record[feature] < this.featureRanges[feature].min) {
          this.featureRanges[feature].min = record[feature];
        }
        if (record[feature] > this.featureRanges[feature].max) {
          this.featureRanges[feature].max = record[feature];
        }
      });
    });

    console.log("Feature ranges calculated from dataset");
  }

  /**
   * Train the model by loading the dataset and calculating feature ranges
   * @param {string} datasetPath - Firebase path to the dataset
   * @returns {Promise<boolean>} - Whether training was successful
   */
  async trainModel(datasetPath = 'bedsoreDataset') {
    try {
      if (this.isTraining) {
        console.log("Model is already training");
        return false;
      }

      console.log("Training bedsore prediction model...");
      this.isTraining = true;

      // Load dataset and calculate feature ranges
      await this.loadDataset(datasetPath);

      this.isTrained = true;
      this.isTraining = false;
      console.log("Model training complete");
      return true;
    } catch (error) {
      console.error("Error training model:", error);
      this.isTraining = false;
      return false;
    }
  }

  /**
   * Get pressure-based risk level
   * @param {Object} metrics - Health metrics data
   * @returns {Object} - Risk assessment based on pressure
   */
  getPressureBasedRisk(metrics) {
    if (!metrics) return { riskLevel: null };

    // Create array of all pressure readings for analysis
    const pressureReadings = [
      { name: 'Back Pressure (Left)', value: metrics.backPressure_L || 0, key: 'backPressure_L' },
      { name: 'Back Pressure (Right)', value: metrics.backPressure_R || 0, key: 'backPressure_R' },
      { name: 'Leg Pressure (Left)', value: metrics.legPressure_L || 0, key: 'legPressure_L' },
      { name: 'Leg Pressure (Right)', value: metrics.legPressure_R || 0, key: 'legPressure_R' },
      { name: 'Shoulder Pressure (Left)', value: metrics.shoulderPressure_L || 0, key: 'shoulderPressure_L' },
      { name: 'Shoulder Pressure (Right)', value: metrics.shoulderPressure_R || 0, key: 'shoulderPressure_R' }
    ];

    // Sort by highest value first
    pressureReadings.sort((a, b) => b.value - a.value);
    const highestPressurePoint = pressureReadings[0];

    // Get the maximum pressure value
    const maxPressure = highestPressurePoint.value;

    // Determine risk level based on maximum pressure
    let riskLevel, riskScore, confidence;

    if (maxPressure >= this.VERY_HIGH_PRESSURE_THRESHOLD) {
      riskLevel = 'very-high';
      riskScore = 90 + Math.random() * 10; // 90-100
      confidence = 95;
    } else if (maxPressure >= this.HIGH_PRESSURE_THRESHOLD) {
      riskLevel = 'high';
      riskScore = 65 + Math.random() * 20; // 65-85
      confidence = 90;
    } else if (maxPressure >= this.MODERATE_PRESSURE_THRESHOLD) {
      riskLevel = 'moderate';
      riskScore = 35 + Math.random() * 25; // 35-60
      confidence = 85;
    } else if (maxPressure > this.LOW_PRESSURE_THRESHOLD) {
      riskLevel = 'low';
      riskScore = 15 + Math.random() * 15; // 15-30
      confidence = 80;
    } else {
      return { riskLevel: null }; // No significant pressure detected
    }

    // Return the complete assessment
    return {
      riskLevel,
      riskScore: Math.round(riskScore),
      confidence: Math.round(confidence),
      highestPressurePoint,
      pressureRiskDetected: true
    };
  }

  /**
   * Normalize a patient feature for comparison with dataset
   * @param {string} feature - Feature name
   * @param {number} value - Feature value
   * @returns {number} - Normalized value (0-1)
   */
  normalizeFeature(feature, value) {
    if (this.featureRanges[feature]) {
      const { min, max } = this.featureRanges[feature];
      if (max === min) return 0.5;
      return (value - min) / (max - min);
    }
    return value; // Return original value if no range info
  }

  /**
   * Normalize patient data for prediction
   * @param {Object} patient - Patient data
   * @param {Object} metrics - Health metrics
   * @returns {Object} - Normalized patient features
   */
  normalizePatientData(patient, metrics) {
    return {
      // Pressure readings
      backPressure_L: metrics?.backPressure_L || 0,
      backPressure_R: metrics?.backPressure_R || 0,
      legPressure_L: metrics?.legPressure_L || 0,
      legPressure_R: metrics?.legPressure_R || 0,
      shoulderPressure_L: metrics?.shoulderPressure_L || 0,
      shoulderPressure_R: metrics?.shoulderPressure_R || 0,

      // Vital signs
      temperature: metrics?.temperature || 36.5,
      heart_rate: metrics?.heartRate || 75,
      spo2: metrics?.spo2 || 98,
      bp_systolic: metrics?.bp?.systolic || 120,
      bp_diastolic: metrics?.bp?.diastolic || 80,

      // Environmental factors
      humidity: metrics?.humidity || 50,

      // Position metrics
      duration_min: metrics?.sittingDuration || 0,
      angle_degree: metrics?.Angle || metrics?.angle || 0,

      // Patient health data (derived flags for the model)
      is_bedbound: patient?.mobilityStatus === 'bedbound' ? 1 : 0,
      is_chairbound: patient?.mobilityStatus === 'chairbound' ? 1 : 0,
      has_diabetes: patient?.hasDiabetes === 'yes' ? 1 : 0,
      has_incontinence: patient?.incontinence !== 'no' && patient?.incontinence ? 1 : 0
    };
  }

  /**
   * Predict bedsore risk using k-nearest neighbors algorithm
   * @param {Object} patient - Patient data
   * @param {Object} metrics - Health metrics
   * @returns {Object} - Prediction results
   */
  predictRisk(patient, metrics) {
    // Ensure model is trained
    if (!this.isTrained || !this.dataset || this.dataset.length === 0) {
      console.log("Model not trained or dataset empty, using fallback prediction");
      return this.predictRiskRuleBased(patient, metrics);
    }

    try {
      console.log("Predicting bedsore risk using kNN classification...");

      // Check for pressure-based risk first
      const pressureRisk = this.getPressureBasedRisk(metrics);

      // If significant pressure is detected, use the pressure-based risk
      if (pressureRisk.riskLevel) {
        console.log(`Pressure-based risk detected - level: ${pressureRisk.riskLevel}`);

        // Calculate feature importance with pressure as primary factor
        const importantFeatures = this.calculatePressureBasedFeatureImportance(metrics);

        // Generate recommendations based on detected risk level
        const recommendations = this.generateRecommendations(
          pressureRisk.riskLevel,
          importantFeatures,
          patient
        );

        return {
          riskLevel: pressureRisk.riskLevel,
          riskScore: pressureRisk.riskScore,
          confidence: pressureRisk.confidence,
          importantFeatures,
          recommendations,
          pressureRiskDetected: true,
          highestPressurePoint: pressureRisk.highestPressurePoint
        };
      }

      // If no significant pressure, proceed with normal prediction
      // Extract features from patient data
      const patientFeatures = this.normalizePatientData(patient, metrics);

      // Calculate distances to all dataset records
      const neighbors = this.findNearestNeighbors(patientFeatures);

      // Classify based on nearest neighbors
      const prediction = this.classifyByNeighbors(neighbors);

      // Calculate feature importance
      const importantFeatures = this.calculateFeatureImportance(patientFeatures, neighbors, prediction.riskLevel);

      // Generate recommendations
      const recommendations = this.generateRecommendations(prediction.riskLevel, importantFeatures, patient);

      return {
        ...prediction,
        importantFeatures,
        recommendations,
        neighbors: neighbors.slice(0, 5) // Include top 5 neighbors for reference
      };
    } catch (error) {
      console.error("Error in kNN prediction:", error);
      return this.predictRiskRuleBased(patient, metrics);
    }
  }

  /**
   * Calculate feature importance based specifically on pressure readings
   * @param {Object} metrics - Health metrics
   * @returns {Array} - Important features focused on pressure
   */
  calculatePressureBasedFeatureImportance(metrics) {
    // Create array of all pressure readings for analysis
    const pressureReadings = [
      { name: 'Back Pressure (Left)', value: metrics?.backPressure_L || 0, key: 'backPressure_L' },
      { name: 'Back Pressure (Right)', value: metrics?.backPressure_R || 0, key: 'backPressure_R' },
      { name: 'Leg Pressure (Left)', value: metrics?.legPressure_L || 0, key: 'legPressure_L' },
      { name: 'Leg Pressure (Right)', value: metrics?.legPressure_R || 0, key: 'legPressure_R' },
      { name: 'Shoulder Pressure (Left)', value: metrics?.shoulderPressure_L || 0, key: 'shoulderPressure_L' },
      { name: 'Shoulder Pressure (Right)', value: metrics?.shoulderPressure_R || 0, key: 'shoulderPressure_R' }
    ];

    // Sort pressure readings by value (highest first)
    pressureReadings.sort((a, b) => b.value - a.value);

    // Create feature importance list with pressure readings as primary factors
    const importantFeatures = pressureReadings
      .filter(p => p.value > 0) // Only include non-zero readings
      .map((pressure, index) => {
        // Determine if this pressure is a risk factor and at what level
        let isRiskFactor = false;
        let riskLevel = '';

        if (pressure.value >= this.VERY_HIGH_PRESSURE_THRESHOLD) {
          isRiskFactor = true;
          riskLevel = 'very-high';
        } else if (pressure.value >= this.HIGH_PRESSURE_THRESHOLD) {
          isRiskFactor = true;
          riskLevel = 'high';
        } else if (pressure.value >= this.MODERATE_PRESSURE_THRESHOLD) {
          isRiskFactor = true;
          riskLevel = 'moderate';
        } else if (pressure.value > this.LOW_PRESSURE_THRESHOLD) {
          isRiskFactor = false;
          riskLevel = 'low';
        }

        return {
          name: pressure.name,
          value: pressure.value,
          importance: 10 - (index * 0.5), // Higher importance for higher pressures
          isRiskFactor,
          riskLevel
        };
      });

    // Add other relevant factors
    if (metrics?.sittingDuration > 120) {
      importantFeatures.push({
        name: 'Sitting/Lying Duration',
        value: metrics.sittingDuration,
        importance: 8,
        isRiskFactor: true,
        riskLevel: metrics.sittingDuration > 240 ? 'high' : 'moderate'
      });
    }

    // Return top 5 factors
    return importantFeatures.slice(0, 5);
  }

  /**
   * Find k nearest neighbors to patient in dataset
   * @param {Object} patientFeatures - Patient features
   * @returns {Array} - Nearest neighbors with distances
   */
  findNearestNeighbors(patientFeatures) {
    // Feature weights for distance calculation
    const weights = {
      // Pressure readings (high importance)
      backPressure_L: 2,
      backPressure_R: 2,
      legPressure_L: 2.5,
      legPressure_R: 2.5,
      shoulderPressure_L: 2.5,
      shoulderPressure_R: 2.5,

      // Position factors (high importance)
      duration_min: 3,
      angle_degree: 1.5,

      // Vital signs (medium importance)
      temperature: 1,
      heart_rate: 1.5,
      spo2: 1.5,
      bp_systolic: 1,
      bp_diastolic: 1,

      // Environmental factors (low importance)
      humidity: 0.5,

      // Patient condition flags (high importance)
      is_bedbound: 3,
      is_chairbound: 2,
      has_diabetes: 2.5,
      has_incontinence: 2
    };

    // Calculate distance for each record
    const recordsWithDistances = this.dataset.map(record => {
      let weightedDistance = 0;
      let totalWeight = 0;
      let featureDistances = {};

      // Feature-by-feature distance calculation
      Object.keys(weights).forEach(feature => {
        // Skip if feature is not in patient data
        if (patientFeatures[feature] === undefined) return;

        // Get record value (or infer if missing)
        let recordValue = record[feature];

        // Skip if record value is missing and can't be inferred
        if (recordValue === undefined || recordValue === null) {
          // For some features, try to infer values from risk level
          if (feature === 'is_bedbound') {
            recordValue = record.bedsore_risk?.includes('high') ? 0.7 : 0.3;
          } else if (feature === 'has_diabetes') {
            recordValue = 0; // Conservative default
          } else {
            return; // Skip this feature
          }
        }

        // Calculate normalized feature distance
        const featureWeight = weights[feature];

        // For binary features, use exact match/mismatch
        if (feature === 'is_bedbound' || feature === 'is_chairbound' ||
          feature === 'has_diabetes' || feature === 'has_incontinence') {
          const featureDistance = patientFeatures[feature] === recordValue ? 0 : 1;
          weightedDistance += featureWeight * featureDistance;
          featureDistances[feature] = featureDistance;
        } else {
          // Normalize values using feature ranges
          const patientNormalized = this.normalizeFeature(feature, patientFeatures[feature]);
          const recordNormalized = this.normalizeFeature(feature, recordValue);

          // Calculate absolute difference
          const featureDistance = Math.abs(patientNormalized - recordNormalized);

          // Add weighted distance
          weightedDistance += featureWeight * featureDistance;
          featureDistances[feature] = featureDistance;
        }

        totalWeight += featureWeight;
      });

      // Normalize final distance
      const normalizedDistance = totalWeight > 0 ? weightedDistance / totalWeight : Infinity;

      return {
        record,
        distance: normalizedDistance,
        featureDistances
      };
    });

    // Sort by distance (nearest first) and take k neighbors
    return recordsWithDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.K_VALUE);
  }

  /**
   * Classify risk level based on nearest neighbors
   * @param {Array} neighbors - Nearest neighbors with distances
   * @returns {Object} - Classification result
   */
  classifyByNeighbors(neighbors) {
    // Count risk levels among neighbors
    const riskCounts = {};

    neighbors.forEach(({ record }) => {
      const risk = this.standardizeRiskLevel(record.bedsore_risk);
      riskCounts[risk] = (riskCounts[risk] || 0) + 1;
    });

    // Find majority risk level
    let predictedRiskLevel = 'low';
    let maxCount = 0;

    Object.entries(riskCounts).forEach(([risk, count]) => {
      if (count > maxCount) {
        maxCount = count;
        predictedRiskLevel = risk;
      }
    });

    // Break ties in favor of higher risk level
    if (Object.values(riskCounts).filter(count => count === maxCount).length > 1) {
      if (riskCounts['high'] === maxCount) {
        predictedRiskLevel = 'high';
      } else if (riskCounts['very-high'] === maxCount) {
        predictedRiskLevel = 'very-high';
      }
    }

    // Calculate confidence as percentage of neighbors with the same prediction
    const confidence = Math.round((maxCount / neighbors.length) * 100);

    // Calculate risk score based on risk level
    let riskScore;
    switch (predictedRiskLevel) {
      case 'very-high':
        riskScore = 85 + Math.random() * 15;
        break;
      case 'high':
        riskScore = 60 + Math.random() * 20;
        break;
      case 'moderate':
        riskScore = 30 + Math.random() * 25;
        break;
      case 'low':
      default:
        riskScore = 5 + Math.random() * 20;
    }

    return {
      riskLevel: predictedRiskLevel,
      riskScore: Math.round(riskScore),
      confidence
    };
  }

  /**
   * Standardize risk level string to one of four categories
   * @param {string} riskString - Raw risk level string
   * @returns {string} - Standardized risk level
   */
  standardizeRiskLevel(riskString) {
    if (!riskString) return 'low';

    const lowerRisk = String(riskString).toLowerCase();

    if (lowerRisk.includes('very') && lowerRisk.includes('high')) {
      return 'very-high';
    } else if (lowerRisk.includes('high')) {
      return 'high';
    } else if (lowerRisk.includes('moderate') || lowerRisk.includes('med')) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate feature importance based on neighbors
   * @param {Object} patientFeatures - Patient features
   * @param {Array} neighbors - Nearest neighbors
   * @param {string} predictedRiskLevel - Predicted risk level
   * @returns {Array} - Important features
   */
  calculateFeatureImportance(patientFeatures, neighbors, predictedRiskLevel) {
    // Define feature display names
    const featureDisplayNames = {
      backPressure_L: 'Back Pressure (Left)',
      backPressure_R: 'Back Pressure (Right)',
      legPressure_L: 'Leg Pressure (Left)',
      legPressure_R: 'Leg Pressure (Right)',
      shoulderPressure_L: 'Shoulder Pressure (Left)',
      shoulderPressure_R: 'Shoulder Pressure (Right)',
      temperature: 'Body Temperature',
      heart_rate: 'Heart Rate',
      spo2: 'Oxygen Saturation',
      bp_systolic: 'Systolic Blood Pressure',
      bp_diastolic: 'Diastolic Blood Pressure',
      humidity: 'Skin Humidity',
      duration_min: 'Sitting/Lying Duration',
      angle_degree: 'Body Position Angle',
      is_bedbound: 'Bedbound Status',
      is_chairbound: 'Chairbound Status',
      has_diabetes: 'Diabetes',
      has_incontinence: 'Incontinence'
    };

    // Group neighbors by risk level
    const neighborsByRisk = {};
    neighbors.forEach(neighbor => {
      const risk = this.standardizeRiskLevel(neighbor.record.bedsore_risk);
      if (!neighborsByRisk[risk]) neighborsByRisk[risk] = [];
      neighborsByRisk[risk].push(neighbor);
    });

    // Use neighbors with same risk level for importance calculation
    const sameRiskNeighbors = neighborsByRisk[predictedRiskLevel] || neighbors;

    // Calculate average values for neighbors with same risk
    const averages = {};
    Object.keys(featureDisplayNames).forEach(feature => {
      const values = sameRiskNeighbors
        .map(n => n.record[feature])
        .filter(v => v !== undefined && v !== null);

      if (values.length > 0) {
        averages[feature] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
      }
    });

    // Base weights for feature types
    const baseWeights = {
      pressure: 2.5,
      position: 2.0,
      vitals: 1.5,
      condition: 3.0,
      environmental: 1.0
    };

    // Feature type mapping
    const featureTypes = {
      backPressure_L: 'pressure',
      backPressure_R: 'pressure',
      legPressure_L: 'pressure',
      legPressure_R: 'pressure',
      shoulderPressure_L: 'pressure',
      shoulderPressure_R: 'pressure',
      temperature: 'vitals',
      heart_rate: 'vitals',
      spo2: 'vitals',
      bp_systolic: 'vitals',
      bp_diastolic: 'vitals',
      humidity: 'environmental',
      duration_min: 'position',
      angle_degree: 'position',
      is_bedbound: 'condition',
      is_chairbound: 'condition',
      has_diabetes: 'condition',
      has_incontinence: 'condition'
    };

    // Calculate importance for each feature
    const featureImportance = [];

    Object.keys(featureDisplayNames).forEach(feature => {
      if (patientFeatures[feature] === undefined) return;

      const featureType = featureTypes[feature] || 'other';
      const baseWeight = baseWeights[featureType] || 1.0;
      let importance = baseWeight;

      // For binary features, higher importance if matches typical value for risk level
      if (feature === 'is_bedbound' || feature === 'is_chairbound' ||
        feature === 'has_diabetes' || feature === 'has_incontinence') {
        if (averages[feature] !== undefined) {
          const match = Math.abs(patientFeatures[feature] - averages[feature]) < 0.5;

          // Extra importance for risk factors in high risk prediction
          if ((predictedRiskLevel === 'high' || predictedRiskLevel === 'very-high') &&
            patientFeatures[feature] > 0.5) {
            importance = baseWeight * 1.5;
          } else if (match) {
            importance = baseWeight;
          } else {
            importance = baseWeight * 0.5;
          }
        }
      }
      // For numerical features, importance based on similarity to typical values
      else if (averages[feature] !== undefined) {
        const patientValue = patientFeatures[feature];
        const typicalValue = averages[feature];

        // Normalize difference
        const max = this.featureRanges[feature]?.max || 100;
        const min = this.featureRanges[feature]?.min || 0;
        const range = max - min || 1;

        const normalizedDiff = Math.abs(patientValue - typicalValue) / range;
        const similarity = 1 - Math.min(1, normalizedDiff);

        // Higher similarity = higher importance
        importance = baseWeight * (0.3 + similarity * 0.7);

        // Boost importance for extreme values
        if (patientValue <= min + range * 0.2 || patientValue >= max - range * 0.2) {
          importance *= 1.2;
        }
      }

      // Special case handling for high-risk factors
      if (predictedRiskLevel === 'high' || predictedRiskLevel === 'very-high') {
        if ((feature === 'is_bedbound' && patientFeatures[feature] > 0.5) ||
          (feature === 'has_diabetes' && patientFeatures[feature] > 0.5) ||
          (feature === 'duration_min' && patientFeatures[feature] > 120)) {
          importance *= 1.3;
        }
      }

      // Important: Give extra boost to pressure features if they are high
      if (feature.includes('Pressure') && patientFeatures[feature] > this.MODERATE_PRESSURE_THRESHOLD) {
        if (patientFeatures[feature] >= this.VERY_HIGH_PRESSURE_THRESHOLD) {
          importance *= 2.0; // Very high importance for very high pressure
        } else if (patientFeatures[feature] >= this.HIGH_PRESSURE_THRESHOLD) {
          importance *= 1.8; // High importance for high pressure
        } else {
          importance *= 1.5; // Medium importance for moderate pressure
        }
      }

      // Add feature to importance list
      featureImportance.push({
        name: featureDisplayNames[feature] || feature,
        value: patientFeatures[feature],
        importance: importance,
        isRiskFactor: this.isClinicalRiskFactor(feature, patientFeatures[feature])
      });
    });

    // Sort by importance and return top 5
    return featureImportance
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
  }

  /**
   * Check if a feature value indicates clinical risk
   * @param {string} feature - Feature name 
   * @param {number} value - Feature value
   * @returns {boolean} - Is risk factor
   */
  isClinicalRiskFactor(feature, value) {
    switch (feature) {
      case 'is_bedbound':
      case 'is_chairbound':
      case 'has_diabetes':
      case 'has_incontinence':
        return value > 0.5;
      case 'duration_min':
        return value > 120; // Over 2 hours
      case 'backPressure_L':
      case 'backPressure_R':
      case 'legPressure_L':
      case 'legPressure_R':
      case 'shoulderPressure_L':
      case 'shoulderPressure_R':
        return value > this.MODERATE_PRESSURE_THRESHOLD; // Moderate pressure or higher
      case 'spo2':
        return value < 92; // Low oxygen
      case 'temperature':
        return value > 38 || value < 36; // Fever or hypothermia
      default:
        return false;
    }
  }

  /**
   * Generate recommendations based on risk level and patient features
   * @param {string} riskLevel - Predicted risk level
   * @param {Array} importantFeatures - Important features
   * @param {Object} patient - Patient data
   * @returns {Array} - Recommendations
   */
  generateRecommendations(riskLevel, importantFeatures, patient) {
    // allow patient to be null when predictions are based solely on current metrics
    patient = patient || {};
    const baseRecommendations = {
      'low': [
        "Continue regular skin inspections daily",
        "Stay well-hydrated and maintain good nutrition",
        "Change positions at least every 4 hours when sitting or lying"
      ],
      'moderate': [
        "Inspect skin twice daily, especially over bony areas",
        "Use pressure-redistributing cushions when sitting",
        "Change position at least every 2 hours",
        "Ensure adequate nutrition and hydration",
        "Keep skin clean and dry"
      ],
      'high': [
        "Implement strict repositioning schedule (every 1-2 hours)",
        "Use specialized pressure-relieving mattress",
        "Consider consultation with wound specialist",
        "Implement moisture management for incontinence",
        "Ensure optimal nutrition with protein supplements if needed",
        "Apply protective skin barriers to high-risk areas"
      ],
      'very-high': [
        "URGENT: Consult healthcare provider immediately",
        "Consider specialized air-fluidized or low air loss bed surface",
        "Implement strict repositioning schedule (every 1 hour)",
        "Apply protective dressings to high-risk areas preventively",
        "Request nutritional assessment and intervention",
        "Monitor skin condition every shift/several times daily",
        "Consider prophylactic dressings for high-risk areas"
      ]
    };

    let recommendations = [...baseRecommendations[riskLevel]];

    // Add feature-specific recommendations
    importantFeatures.forEach(feature => {
      // Add recommendations based on feature name and value
      if (feature.name === 'Sitting/Lying Duration' && feature.value > 120) {
        recommendations.push("Reduce continuous sitting/lying duration - implement a movement schedule");
      }

      if (feature.name.includes('Pressure') && feature.value >= this.VERY_HIGH_PRESSURE_THRESHOLD) {
        recommendations.push(`URGENT: Immediate relief needed for ${feature.name.toLowerCase()} - change position now and consult healthcare provider`);
      } else if (feature.name.includes('Pressure') && feature.value >= this.HIGH_PRESSURE_THRESHOLD) {
        recommendations.push(`Important: Reduce ${feature.name.toLowerCase()} - reposition and use support surfaces`);
      } else if (feature.name.includes('Pressure') && feature.value >= this.MODERATE_PRESSURE_THRESHOLD) {
        recommendations.push(`Monitor ${feature.name.toLowerCase()} - consider pressure redistribution aids`);
      }

      if (feature.name === 'Body Position Angle' &&
        (feature.value < 15 || feature.value > 45)) {
        recommendations.push("Adjust body position angle to between 15-45 degrees when in bed to reduce pressure");
      }

      if (feature.name === 'Bedbound Status' && feature.value > 0.5) {
        recommendations.push("Use pillows and foam wedges to offload pressure points when in bed");
        recommendations.push("Implement a strict turning schedule with documented position changes");
      }

      if (feature.name === 'Diabetes' && feature.value > 0.5) {
        recommendations.push("Monitor blood glucose levels closely as poor glycemic control impairs healing");
        recommendations.push("Pay special attention to feet and heels during skin inspections");
      }

      if (feature.name === 'Incontinence' && feature.value > 0.5) {
        recommendations.push("Use absorbent products designed for minimal skin contact with moisture");
        recommendations.push("Apply barrier creams to protect skin from moisture damage");
      }
    });

    // Add mobility-specific recommendations
    if (patient.mobilityStatus === 'bedbound') {
      recommendations.push("For bedbound patients, ensure heels are elevated off the bed surface");
    } else if (patient.mobilityStatus === 'chairbound') {
      recommendations.push("For chairbound patients, perform pressure relief maneuvers every 15-30 minutes");
    }

    // Make list unique and limit to reasonable number
    const uniqueRecommendations = [...new Set(recommendations)];
    return uniqueRecommendations.slice(0, riskLevel === 'low' ? 5 : 8);
  }

  /**
   * Fallback rule-based prediction method
   * @param {Object} patient - Patient data
   * @param {Object} metrics - Health metrics
   * @returns {Object} - Prediction results
   */
  predictRiskRuleBased(patient, metrics) {
    console.log("Using rule-based prediction as fallback");

    // allow patient to be null when using metrics-only predictions
    patient = patient || {};

    // First, check for pressure-based risk
    const pressureRisk = this.getPressureBasedRisk(metrics);

    if (pressureRisk.riskLevel) {
      console.log(`Pressure-based risk detected in rule-based model - level: ${pressureRisk.riskLevel}`);

      // Generate feature importance with pressure readings as top factors
      const importantFeatures = this.calculatePressureBasedFeatureImportance(metrics);

      // Generate recommendations based on detected risk level
      const recommendations = this.generateRecommendations(
        pressureRisk.riskLevel,
        importantFeatures,
        patient
      );

      return {
        riskLevel: pressureRisk.riskLevel,
        riskScore: pressureRisk.riskScore,
        confidence: pressureRisk.confidence,
        importantFeatures,
        recommendations,
        pressureRiskDetected: true,
        highestPressurePoint: pressureRisk.highestPressurePoint,
        isRuleBased: true
      };
    }

    // If no high pressure, continue with regular scoring
    let score = 0;

    // Add points for key risk factors
    if (patient.mobilityStatus === 'bedbound') score += 40;
    else if (patient.mobilityStatus === 'chairbound') score += 30;
    else if (patient.mobilityStatus === 'assistance') score += 20;

    if (patient.age > 70) score += 20;
    else if (patient.age > 60) score += 15;

    if (patient.hasDiabetes === 'yes') score += 15;

    if (patient.incontinence === 'both') score += 25;
    else if (patient.incontinence === 'fecal' || patient.incontinence === 'urinary') score += 15;

    // Calculate BMI if height and weight are available
    if (patient.height && patient.weight) {
      const heightInMeters = patient.height / 100;
      const bmi = patient.weight / (heightInMeters * heightInMeters);

      if (bmi < 18.5 || bmi >= 30) score += 15;
    }

    // Add points for sensor data if available
    if (metrics?.sittingDuration > 120) score += 20;

    // Add points for moderate pressure readings
    if (metrics) {
      if ((metrics.backPressure_L > this.LOW_PRESSURE_THRESHOLD) ||
        (metrics.backPressure_R > this.LOW_PRESSURE_THRESHOLD)) score += 10;
      if ((metrics.legPressure_L > this.LOW_PRESSURE_THRESHOLD) ||
        (metrics.legPressure_R > this.LOW_PRESSURE_THRESHOLD)) score += 10;
      if ((metrics.shoulderPressure_L > this.LOW_PRESSURE_THRESHOLD) ||
        (metrics.shoulderPressure_R > this.LOW_PRESSURE_THRESHOLD)) score += 10;
    }

    // Normalize score to 0-100
    const riskScore = Math.min(100, Math.max(0, score));

    // Determine risk level
    let riskLevel;
    if (riskScore < 20) riskLevel = 'low';
    else if (riskScore < 40) riskLevel = 'moderate';
    else if (riskScore < 60) riskLevel = 'high';
    else riskLevel = 'very-high';

    // Generate mock feature importance
    const importantFeatures = [
      {
        name: 'Mobility Status',
        value: patient.mobilityStatus === 'bedbound' ? 1 :
          patient.mobilityStatus === 'chairbound' ? 0.7 :
            patient.mobilityStatus === 'assistance' ? 0.5 : 0.1,
        importance: 10,
        isRiskFactor: patient.mobilityStatus === 'bedbound' || patient.mobilityStatus === 'chairbound'
      },
      {
        name: 'Age',
        value: patient.age || 50,
        importance: 8,
        isRiskFactor: (patient.age || 0) > 60
      },
      {
        name: 'Diabetes',
        value: patient.hasDiabetes === 'yes' ? 1 : 0,
        importance: 7,
        isRiskFactor: patient.hasDiabetes === 'yes'
      },
      {
        name: 'Incontinence',
        value: patient.incontinence === 'both' ? 1 :
          patient.incontinence === 'fecal' || patient.incontinence === 'urinary' ? 0.7 : 0,
        importance: 6,
        isRiskFactor: patient.incontinence && patient.incontinence !== 'no'
      },
      {
        name: 'Sitting Duration',
        value: metrics?.sittingDuration || 0,
        importance: 5,
        isRiskFactor: (metrics?.sittingDuration || 0) > 120
      }
    ];

    // Add pressure readings if available
    if (metrics) {
      // Find highest pressure reading
      const pressureReadings = [
        { name: 'Back Pressure (Left)', value: metrics.backPressure_L || 0 },
        { name: 'Back Pressure (Right)', value: metrics.backPressure_R || 0 },
        { name: 'Leg Pressure (Left)', value: metrics.legPressure_L || 0 },
        { name: 'Leg Pressure (Right)', value: metrics.legPressure_R || 0 },
        { name: 'Shoulder Pressure (Left)', value: metrics.shoulderPressure_L || 0 },
        { name: 'Shoulder Pressure (Right)', value: metrics.shoulderPressure_R || 0 }
      ];

      // Sort by highest value
      pressureReadings.sort((a, b) => b.value - a.value);

      // Replace lowest importance feature with highest pressure if significant
      if (pressureReadings[0].value > this.LOW_PRESSURE_THRESHOLD) {
        importantFeatures[4] = {
          name: pressureReadings[0].name,
          value: pressureReadings[0].value,
          importance: pressureReadings[0].value > this.HIGH_PRESSURE_THRESHOLD ? 8 :
            pressureReadings[0].value > this.MODERATE_PRESSURE_THRESHOLD ? 7 : 6,
          isRiskFactor: pressureReadings[0].value > this.MODERATE_PRESSURE_THRESHOLD
        };
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskLevel, importantFeatures, patient);

    return {
      riskLevel,
      riskScore,
      confidence: 70,
      importantFeatures,
      recommendations,
      isRuleBased: true
    };
  }
}

export default BedsoreMLModel;