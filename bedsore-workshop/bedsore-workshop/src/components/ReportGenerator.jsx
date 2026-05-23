import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

class ReportGenerator {
  constructor() {
    this.reportTypes = {
      HEALTH_SUMMARY: 'health_summary',
      BEDSORE_RISK: 'bedsore_risk',
      VITALS_HISTORY: 'vitals_history',
      COMPREHENSIVE: 'comprehensive'
    };
    
    this.fileFormats = {
      PDF: 'pdf',
      EXCEL: 'excel'
    };
  }

  /**
   * Generate a health report based on patient data
   * @param {string} reportType - Type of report to generate
   * @param {Object} patientData - Patient personal information
   * @param {Array} healthRecords - Health record history
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   * @param {Object} currentMetrics - Current health metrics
   * @param {string} format - Output format (pdf or excel)
   * @returns {Blob} - Report file as blob
   */
  generateReport(reportType, patientData, healthRecords = [], bedsoreAssessments = [], currentMetrics = {}, format = 'pdf') {
    if (format === this.fileFormats.PDF) {
      return this.generatePDFReport(reportType, patientData, healthRecords, bedsoreAssessments, currentMetrics);
    } else if (format === this.fileFormats.EXCEL) {
      return this.generateExcelReport(reportType, patientData, healthRecords, bedsoreAssessments, currentMetrics);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate a PDF report
   * @param {string} reportType - Type of report to generate
   * @param {Object} patientData - Patient personal information
   * @param {Array} healthRecords - Health record history
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   * @param {Object} currentMetrics - Current health metrics
   * @returns {Blob} - PDF file as blob
   */
  generatePDFReport(reportType, patientData, healthRecords, bedsoreAssessments, currentMetrics) {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Add report header
    this.addReportHeader(doc, reportType, patientData);
    
    // Add content based on report type
    switch (reportType) {
      case this.reportTypes.HEALTH_SUMMARY:
        this.addHealthSummary(doc, patientData, healthRecords, currentMetrics);
        break;
      case this.reportTypes.BEDSORE_RISK:
        this.addBedsoreRiskReport(doc, patientData, bedsoreAssessments);
        break;
      case this.reportTypes.VITALS_HISTORY:
        this.addVitalsHistoryReport(doc, patientData, healthRecords);
        break;
      case this.reportTypes.COMPREHENSIVE:
      default:
        this.addComprehensiveReport(doc, patientData, healthRecords, bedsoreAssessments, currentMetrics);
        break;
    }
    
    // Add footer with date and page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} of ${totalPages} - Generated on ${new Date().toLocaleDateString()}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Return the PDF as a blob
    return doc.output('blob');
  }

  /**
   * Generate an Excel report
   * @param {string} reportType - Type of report to generate
   * @param {Object} patientData - Patient personal information
   * @param {Array} healthRecords - Health record history
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   * @param {Object} currentMetrics - Current health metrics
   * @returns {Blob} - Excel file as blob
   */
  generateExcelReport(reportType, patientData, healthRecords, bedsoreAssessments, currentMetrics) {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets based on report type
    switch (reportType) {
      case this.reportTypes.HEALTH_SUMMARY:
        this.addHealthSummarySheet(wb, patientData, healthRecords, currentMetrics);
        break;
      case this.reportTypes.BEDSORE_RISK:
        this.addBedsoreRiskSheet(wb, patientData, bedsoreAssessments);
        break;
      case this.reportTypes.VITALS_HISTORY:
        this.addVitalsHistorySheet(wb, patientData, healthRecords);
        break;
      case this.reportTypes.COMPREHENSIVE:
      default:
        this.addPatientInfoSheet(wb, patientData);
        this.addHealthRecordsSheet(wb, healthRecords);
        this.addBedsoreAssessmentsSheet(wb, bedsoreAssessments);
        this.addCurrentMetricsSheet(wb, currentMetrics);
        break;
    }
    
    // Convert the workbook to a blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  }

  /**
   * Add report header to PDF
   * @param {jsPDF} doc - PDF document
   * @param {string} reportType - Type of report
   * @param {Object} patientData - Patient information
   */
  addReportHeader(doc, reportType, patientData) {
    // Add title
    let title = 'Health Report';
    switch (reportType) {
      case this.reportTypes.HEALTH_SUMMARY:
        title = 'Health Summary Report';
        break;
      case this.reportTypes.BEDSORE_RISK:
        title = 'Bedsore Risk Assessment Report';
        break;
      case this.reportTypes.VITALS_HISTORY:
        title = 'Vitals History Report';
        break;
      case this.reportTypes.COMPREHENSIVE:
        title = 'Comprehensive Health Report';
        break;
    }
    
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text(title, 105, 20, { align: 'center' });
    
    // Add patient information
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Patient: ${patientData.fullName || patientData.name || 'Unknown'}`, 14, 30);
    
    if (patientData.age) {
      doc.text(`Age: ${patientData.age}`, 14, 36);
    }
    
    if (patientData.phoneNumber) {
      doc.text(`Phone: ${patientData.phoneNumber}`, 14, 42);
    }
    
    // Add date
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 48);
    
    // Add a divider line
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 196, 52);
    
    // Set starting y position for content
    return 60;
  }

  /**
   * Add health summary content to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} patientData - Patient information
   * @param {Array} healthRecords - Health record history
   * @param {Object} currentMetrics - Current health metrics
   */
  addHealthSummary(doc, patientData, healthRecords, currentMetrics) {
    let yPos = 60;
    
    // Recent Metrics
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Current Health Metrics', 14, yPos);
    yPos += 10;
    
    // Add current metrics in a nice table format
    const currentMetricsData = [];
    
    // Add BMI if height and weight are available
    if (patientData.height && patientData.weight) {
      const heightInMeters = patientData.height / 100;
      const bmi = patientData.weight / (heightInMeters * heightInMeters);
      
      currentMetricsData.push(['BMI', bmi.toFixed(1), this.getBMICategory(bmi)]);
    }
    
    // Add blood pressure
    if (patientData.bloodPressure) {
      currentMetricsData.push(['Blood Pressure', patientData.bloodPressure, this.getBPCategory(patientData.bloodPressure)]);
    }
    
    // Add weight
    if (patientData.weight) {
      currentMetricsData.push(['Weight', `${patientData.weight} kg`, '']);
    }
    
    // Add other metrics from currentMetrics
    if (currentMetrics) {
      if (currentMetrics.heartRate) {
        currentMetricsData.push(['Heart Rate', `${currentMetrics.heartRate} bpm`, this.getHeartRateCategory(currentMetrics.heartRate)]);
      }
      
      if (currentMetrics.spo2) {
        currentMetricsData.push(['Oxygen Saturation', `${currentMetrics.spo2}%`, this.getSpO2Category(currentMetrics.spo2)]);
      }
      
      if (currentMetrics.temperature) {
        currentMetricsData.push(['Temperature', `${currentMetrics.temperature}°C`, this.getTemperatureCategory(currentMetrics.temperature)]);
      }
    }
    
    // Add latest bedsore risk if available
    if (patientData.bedsoreRisk) {
      currentMetricsData.push(['Bedsore Risk', patientData.bedsoreRisk.riskLevel, `Score: ${patientData.bedsoreRisk.riskScore}/100`]);
    }
    
    // Draw current metrics table
    doc.autoTable({
      startY: yPos,
      head: [['Metric', 'Value', 'Status']],
      body: currentMetricsData,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 14, right: 14 }
    });
    
    yPos = doc.autoTable.previous.finalY + 15;
    
    // Risk Factors Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Risk Factors', 14, yPos);
    yPos += 10;
    
    const riskFactors = [];
    
    // Check for diabetes
    if (patientData.hasDiabetes === 'yes') {
      riskFactors.push(['Diabetes', patientData.diabetesType || 'Type not specified', 'High Risk Factor']);
    }
    
    // Check for mobility issues
    if (patientData.mobilityStatus) {
      let riskLevel = 'Low';
      if (patientData.mobilityStatus === 'bedbound') riskLevel = 'Very High';
      else if (patientData.mobilityStatus === 'chairbound') riskLevel = 'High';
      else if (patientData.mobilityStatus === 'assistance') riskLevel = 'Moderate';
      
      riskFactors.push(['Mobility', patientData.mobilityStatus, `${riskLevel} Risk Factor`]);
    }
    
    // Check for incontinence
    if (patientData.incontinence && patientData.incontinence !== 'no') {
      let riskLevel = 'Moderate';
      if (patientData.incontinence === 'both') riskLevel = 'High';
      
      riskFactors.push(['Incontinence', patientData.incontinence, `${riskLevel} Risk Factor`]);
    }
    
    // Check for BMI issues
    if (patientData.height && patientData.weight) {
      const heightInMeters = patientData.height / 100;
      const bmi = patientData.weight / (heightInMeters * heightInMeters);
      
      if (bmi < 18.5 || bmi >= 30) {
        const bmiStatus = bmi < 18.5 ? 'Underweight' : 'Obese';
        riskFactors.push(['BMI Status', bmiStatus, 'Moderate Risk Factor']);
      }
    }
    
    // Add other existing conditions
    if (patientData.existingConditions && patientData.existingConditions.length > 0) {
      for (const condition of patientData.existingConditions) {
        riskFactors.push(['Medical Condition', condition, 'Varies by condition']);
      }
    }
    
    // Draw risk factors table
    if (riskFactors.length > 0) {
      doc.autoTable({
        startY: yPos,
        head: [['Risk Factor', 'Details', 'Significance']],
        body: riskFactors,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No significant risk factors identified.', 14, yPos);
      yPos += 15;
    }
    
    // Recommendations Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Health Recommendations', 14, yPos);
    yPos += 10;
    
    // Generate recommendations based on patient data
    const recommendations = this.generateRecommendations(patientData, currentMetrics);
    
    // Add recommendations to document
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    for (const recommendation of recommendations) {
      if (yPos > 260) {
        // Add a new page if we're near the bottom
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(`• ${recommendation}`, 14, yPos);
      yPos += 8;
    }
  }

  /**
   * Add bedsore risk report content to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} patientData - Patient information
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   */
  addBedsoreRiskReport(doc, patientData, bedsoreAssessments) {
    let yPos = 60;
    
    // Current Risk Level
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Current Bedsore Risk Assessment', 14, yPos);
    yPos += 10;
    
    if (bedsoreAssessments && bedsoreAssessments.length > 0) {
      // Get most recent assessment
      const latestAssessment = bedsoreAssessments[0];
      
      // Format the risk level for display
      const riskLevel = latestAssessment.riskLevel.charAt(0).toUpperCase() + 
                       latestAssessment.riskLevel.slice(1).replace('-', ' ');
      
      // Color based on risk level
      let riskColor;
      switch (latestAssessment.riskLevel) {
        case 'low':
          riskColor = [76, 175, 80]; // Green
          break;
        case 'moderate':
          riskColor = [255, 152, 0]; // Orange
          break;
        case 'high':
          riskColor = [244, 67, 54]; // Red
          break;
        case 'very-high':
          riskColor = [156, 39, 176]; // Purple
          break;
        default:
          riskColor = [33, 150, 243]; // Blue
      }
      
      // Add risk level box
      doc.setFillColor(...riskColor);
      doc.setDrawColor(...riskColor);
      doc.roundedRect(14, yPos, 182, 25, 3, 3, 'FD');
      
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`Current Risk Level: ${riskLevel}`, 105, yPos + 10, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Risk Score: ${latestAssessment.riskScore}/100 (Confidence: ${latestAssessment.confidence}%)`, 105, yPos + 18, { align: 'center' });
      
      yPos += 35;
      
      // Add assessment date
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Last Assessment Date: ${new Date(latestAssessment.timestamp).toLocaleDateString()}`, 14, yPos);
      yPos += 15;
      
      // Risk Factors Section
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Contributing Risk Factors', 14, yPos);
      yPos += 10;
      
      // Create contributing factors table
      const riskFactors = [];
      
      // Check for mobility issues
      if (patientData.mobilityStatus) {
        let riskLevel = 'Low';
        if (patientData.mobilityStatus === 'bedbound') riskLevel = 'Very High';
        else if (patientData.mobilityStatus === 'chairbound') riskLevel = 'High';
        else if (patientData.mobilityStatus === 'assistance') riskLevel = 'Moderate';
        
        riskFactors.push(['Mobility Status', patientData.mobilityStatus, riskLevel]);
      }
      
      // Check for diabetes
      if (patientData.hasDiabetes === 'yes') {
        riskFactors.push(['Diabetes', patientData.diabetesType || 'Yes', 'High']);
      }
      
      // Check for incontinence
      if (patientData.incontinence && patientData.incontinence !== 'no') {
        let riskLevel = 'Moderate';
        if (patientData.incontinence === 'both') riskLevel = 'High';
        
        riskFactors.push(['Incontinence', patientData.incontinence, riskLevel]);
      }
      
      // Check for age
      if (patientData.age) {
        let riskLevel = 'Low';
        if (patientData.age > 70) riskLevel = 'High';
        else if (patientData.age > 60) riskLevel = 'Moderate';
        
        riskFactors.push(['Age', patientData.age, riskLevel]);
      }
      
      // Check for BMI issues
      if (patientData.height && patientData.weight) {
        const heightInMeters = patientData.height / 100;
        const bmi = patientData.weight / (heightInMeters * heightInMeters);
        
        if (bmi < 18.5 || bmi >= 30) {
          const bmiStatus = bmi < 18.5 ? 'Underweight' : 'Obese';
          let riskLevel = 'Moderate';
          
          riskFactors.push(['BMI Status', bmiStatus, riskLevel]);
        }
      }
      
      // Draw risk factors table
      if (riskFactors.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['Risk Factor', 'Status', 'Risk Level']],
          body: riskFactors,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.autoTable.previous.finalY + 15;
      } else {
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('No specific risk factors identified.', 14, yPos);
        yPos += 15;
      }
      
      // Risk History Section
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Bedsore Risk History', 14, yPos);
      yPos += 10;
      
      // Create risk history table
      const historyData = bedsoreAssessments.map(assessment => [
        new Date(assessment.timestamp).toLocaleDateString(),
        assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1).replace('-', ' '),
        assessment.riskScore,
        assessment.confidence ? `${assessment.confidence}%` : 'N/A'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Risk Level', 'Risk Score', 'Confidence']],
        body: historyData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
      
      // Prevention Recommendations
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Bedsore Prevention Recommendations', 14, yPos);
      yPos += 10;
      
      // Generate bedsore prevention recommendations
      const recommendations = this.generateBedsoreRecommendations(patientData, latestAssessment);
      
      // Add recommendations to document
      doc.setFontSize(11);
      doc.setTextColor(0);
      
      for (const recommendation of recommendations) {
        if (yPos > 260) {
          // Add a new page if we're near the bottom
          doc.addPage();
          yPos = 20;
        }
        
        doc.text(`• ${recommendation}`, 14, yPos);
        yPos += 8;
      }
    } else {
      // No bedsore assessments available
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No bedsore risk assessments available for this patient.', 14, yPos);
    }
  }

  /**
   * Add vitals history report content to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} patientData - Patient information
   * @param {Array} healthRecords - Health record history
   */
  addVitalsHistoryReport(doc, patientData, healthRecords) {
    let yPos = 60;
    
    // Current Vitals
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Current Vital Signs', 14, yPos);
    yPos += 10;
    
    if (healthRecords && healthRecords.length > 0) {
      // Get most recent health record
      const latestRecord = healthRecords[0];
      
      // Create vitals table data
      const vitalsData = [];
      
      // Add blood pressure
      if (latestRecord.bloodPressure) {
        vitalsData.push(['Blood Pressure', latestRecord.bloodPressure, this.getBPCategory(latestRecord.bloodPressure)]);
      }
      
      // Add heart rate
      if (latestRecord.heartRate) {
        vitalsData.push(['Heart Rate', `${latestRecord.heartRate} bpm`, this.getHeartRateCategory(latestRecord.heartRate)]);
      }
      
      // Add SpO2
      if (latestRecord.spo2) {
        vitalsData.push(['Oxygen Saturation', `${latestRecord.spo2}%`, this.getSpO2Category(latestRecord.spo2)]);
      }
      
      // Add temperature
      if (latestRecord.temperature || latestRecord.bodyTemperature) {
        const temp = latestRecord.temperature || latestRecord.bodyTemperature;
        vitalsData.push(['Body Temperature', `${temp}°C`, this.getTemperatureCategory(temp)]);
      }
      
      // Add respiratory rate
      if (latestRecord.respiratoryRate) {
        vitalsData.push(['Respiratory Rate', `${latestRecord.respiratoryRate} breaths/min`, this.getRespiratoryRateCategory(latestRecord.respiratoryRate)]);
      }
      
      // Draw vitals table
      if (vitalsData.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['Vital Sign', 'Value', 'Status']],
          body: vitalsData,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.autoTable.previous.finalY + 15;
      } else {
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('No vital signs recorded in the latest health record.', 14, yPos);
        yPos += 15;
      }
      
      // Vital Signs History
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Vital Signs History', 14, yPos);
      yPos += 10;
      
      // Blood Pressure History
      if (healthRecords.some(record => record.bloodPressure)) {
        doc.setFontSize(12);
        doc.setTextColor(0, 51, 102);
        doc.text('Blood Pressure History', 14, yPos);
        yPos += 8;
        
        const bpData = healthRecords
          .filter(record => record.bloodPressure)
          .map(record => [
            new Date(record.timestamp).toLocaleDateString(),
            record.bloodPressure,
            this.getBPCategory(record.bloodPressure)
          ]);
        
        if (bpData.length > 0) {
          doc.autoTable({
            startY: yPos,
            head: [['Date', 'Blood Pressure', 'Status']],
            body: bpData,
            theme: 'grid',
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            margin: { left: 14, right: 14 }
          });
          
          yPos = doc.autoTable.previous.finalY + 15;
        }
      }
      
      // Heart Rate History
      if (healthRecords.some(record => record.heartRate)) {
        // Add page if needed
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(0, 51, 102);
        doc.text('Heart Rate History', 14, yPos);
        yPos += 8;
        
        const hrData = healthRecords
          .filter(record => record.heartRate)
          .map(record => [
            new Date(record.timestamp).toLocaleDateString(),
            `${record.heartRate} bpm`,
            this.getHeartRateCategory(record.heartRate)
          ]);
        
        if (hrData.length > 0) {
          doc.autoTable({
            startY: yPos,
            head: [['Date', 'Heart Rate', 'Status']],
            body: hrData,
            theme: 'grid',
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            margin: { left: 14, right: 14 }
          });
          
          yPos = doc.autoTable.previous.finalY + 15;
        }
      }
      
      // Include other vital signs histories similarly (SpO2, temperature, etc.)
      // [Additional sections for other vital signs would go here]
      
      // Summary and Trends
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Vital Signs Trends and Analysis', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      
      // Add trend analysis
      const trends = this.analyzeVitalsTrends(healthRecords);
      
      for (const trend of trends) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.text(`• ${trend}`, 14, yPos);
        yPos += 8;
      }
    } else {
      // No health records available
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No health records available for this patient.', 14, yPos);
    }
  }

  /**
   * Add comprehensive report content to PDF
   * @param {jsPDF} doc - PDF document
   * @param {Object} patientData - Patient information
   * @param {Array} healthRecords - Health record history
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   * @param {Object} currentMetrics - Current health metrics
   */
  addComprehensiveReport(doc, patientData, healthRecords, bedsoreAssessments, currentMetrics) {
    // Patient Overview Section
    let yPos = 60;
    
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Patient Overview', 14, yPos);
    yPos += 10;
    
    // Patient Info Table
    const patientInfo = [
      ['Full Name', patientData.fullName || patientData.name || 'Unknown'],
      ['Age', patientData.age ? `${patientData.age} years` : 'Not recorded'],
      ['Phone Number', patientData.phoneNumber || 'Not recorded'],
    ];
    
    if (patientData.height) {
      patientInfo.push(['Height', `${patientData.height} cm`]);
    }
    
    if (patientData.weight) {
      patientInfo.push(['Weight', `${patientData.weight} kg`]);
    }
    
    if (patientData.height && patientData.weight) {
      const heightInMeters = patientData.height / 100;
      const bmi = patientData.weight / (heightInMeters * heightInMeters);
      patientInfo.push(['BMI', `${bmi.toFixed(1)} (${this.getBMICategory(bmi)})`]);
    }
    
    if (patientData.bloodType) {
      patientInfo.push(['Blood Type', patientData.bloodType]);
    }
    
    doc.autoTable({
      startY: yPos,
      body: patientInfo,
      theme: 'plain',
      styles: { cellPadding: 2 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 50 }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPos = doc.autoTable.previous.finalY + 15;
    
    // Medical History Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Medical History', 14, yPos);
    yPos += 10;
    
    const medicalHistory = [];
    
    if (patientData.hasDiabetes) {
      medicalHistory.push(['Diabetes', patientData.hasDiabetes === 'yes' ? 
        (patientData.diabetesType ? `Yes (${patientData.diabetesType})` : 'Yes') : 
        patientData.hasDiabetes]);
    }
    
    if (patientData.surgeryHistory) {
      medicalHistory.push(['Surgery History', patientData.surgeryHistory === 'yes' ? 
        (patientData.surgeryDetails ? `Yes - ${patientData.surgeryDetails}` : 'Yes') : 
        'No']);
    }
    
    if (patientData.existingConditions && patientData.existingConditions.length > 0) {
      medicalHistory.push(['Existing Conditions', patientData.existingConditions.join(', ')]);
    }
    
    if (patientData.additionalIssues) {
      medicalHistory.push(['Additional Issues', patientData.additionalIssues]);
    }
    
    if (patientData.mobilityStatus) {
      medicalHistory.push(['Mobility Status', patientData.mobilityStatus]);
    }
    
    if (patientData.incontinence) {
      medicalHistory.push(['Incontinence', patientData.incontinence]);
    }
    
    if (medicalHistory.length > 0) {
      doc.autoTable({
        startY: yPos,
        body: medicalHistory,
        theme: 'plain',
        styles: { cellPadding: 2 },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No medical history recorded.', 14, yPos);
      yPos += 15;
    }
    
    // Add a page for current metrics
    doc.addPage();
    yPos = 20;
    
    // Current Health Metrics Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Current Health Metrics', 14, yPos);
    yPos += 10;
    
    // Ensure we have some metrics to display
    if (currentMetrics && Object.keys(currentMetrics).length > 0) {
      // Create a table for the metrics
      const metricsData = [];
      
      // Add heart rate
      if (currentMetrics.heartRate) {
        metricsData.push(['Heart Rate', `${currentMetrics.heartRate} bpm`, this.getHeartRateCategory(currentMetrics.heartRate)]);
      }
      
      // Add blood pressure
      if (currentMetrics.bp && currentMetrics.bp.systolic && currentMetrics.bp.diastolic) {
        const bp = `${currentMetrics.bp.systolic}/${currentMetrics.bp.diastolic} mmHg`;
        metricsData.push(['Blood Pressure', bp, this.getBPCategory(bp)]);
      }
      
      // Add oxygen saturation
      if (currentMetrics.spo2) {
        metricsData.push(['Oxygen Saturation', `${currentMetrics.spo2}%`, this.getSpO2Category(currentMetrics.spo2)]);
      }
      
      // Add temperature
      if (currentMetrics.temperature) {
        metricsData.push(['Body Temperature', `${currentMetrics.temperature}°C`, this.getTemperatureCategory(currentMetrics.temperature)]);
      }
      
      // Add sitting duration
      if (currentMetrics.sittingDuration) {
        metricsData.push(['Sitting Duration', `${currentMetrics.sittingDuration} minutes`, 
          currentMetrics.sittingDuration > 120 ? 'Warning: Extended Sitting' : 'Normal']);
      }
      
      // Draw metrics table
      if (metricsData.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['Metric', 'Value', 'Status']],
          body: metricsData,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.autoTable.previous.finalY + 15;
      } else {
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('No current health metrics available.', 14, yPos);
        yPos += 15;
      }
    } else {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No current health metrics available.', 14, yPos);
      yPos += 15;
    }
    
    // Pressure Points Section (if available)
    if (currentMetrics && (
      currentMetrics.backPressure_L || currentMetrics.backPressure_R ||
      currentMetrics.shoulderPressure_L || currentMetrics.shoulderPressure_R ||
      currentMetrics.legPressure_L || currentMetrics.legPressure_R
    )) {
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Pressure Point Readings', 14, yPos);
      yPos += 10;
      
      // Create a table for pressure readings
      const pressureData = [];
      
      if (currentMetrics.backPressure_L) {
        pressureData.push(['Back Pressure (Left)', `${currentMetrics.backPressure_L} mmHg`, 
          this.getPressureCategory(currentMetrics.backPressure_L)]);
      }
      
      if (currentMetrics.backPressure_R) {
        pressureData.push(['Back Pressure (Right)', `${currentMetrics.backPressure_R} mmHg`, 
          this.getPressureCategory(currentMetrics.backPressure_R)]);
      }
      
      if (currentMetrics.shoulderPressure_L) {
        pressureData.push(['Shoulder Pressure (Left)', `${currentMetrics.shoulderPressure_L} mmHg`, 
          this.getPressureCategory(currentMetrics.shoulderPressure_L)]);
      }
      
      if (currentMetrics.shoulderPressure_R) {
        pressureData.push(['Shoulder Pressure (Right)', `${currentMetrics.shoulderPressure_R} mmHg`, 
          this.getPressureCategory(currentMetrics.shoulderPressure_R)]);
      }
      
      if (currentMetrics.legPressure_L) {
        pressureData.push(['Leg Pressure (Left)', `${currentMetrics.legPressure_L} mmHg`, 
          this.getPressureCategory(currentMetrics.legPressure_L)]);
      }
      
      if (currentMetrics.legPressure_R) {
        pressureData.push(['Leg Pressure (Right)', `${currentMetrics.legPressure_R} mmHg`, 
          this.getPressureCategory(currentMetrics.legPressure_R)]);
      }
      
      // Draw pressure table
      doc.autoTable({
        startY: yPos,
        head: [['Location', 'Value', 'Status']],
        body: pressureData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
    }
    
    // Add Bedsore Risk section on a new page
    doc.addPage();
    yPos = 20;
    
    // Bedsore Risk Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Bedsore Risk Assessment', 14, yPos);
    yPos += 10;
    
    if (bedsoreAssessments && bedsoreAssessments.length > 0) {
      // Get most recent assessment
      const latestAssessment = bedsoreAssessments[0];
      
      // Format the risk level for display
      const riskLevel = latestAssessment.riskLevel.charAt(0).toUpperCase() + 
                       latestAssessment.riskLevel.slice(1).replace('-', ' ');
      
      // Color based on risk level
      let riskColor;
      switch (latestAssessment.riskLevel) {
        case 'low':
          riskColor = [76, 175, 80]; // Green
          break;
        case 'moderate':
          riskColor = [255, 152, 0]; // Orange
          break;
        case 'high':
          riskColor = [244, 67, 54]; // Red
          break;
        case 'very-high':
          riskColor = [156, 39, 176]; // Purple
          break;
        default:
          riskColor = [33, 150, 243]; // Blue
      }
      
      // Add risk level box
      doc.setFillColor(...riskColor);
      doc.setDrawColor(...riskColor);
      doc.roundedRect(14, yPos, 182, 25, 3, 3, 'FD');
      
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`Current Risk Level: ${riskLevel}`, 105, yPos + 10, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Risk Score: ${latestAssessment.riskScore}/100 (Confidence: ${latestAssessment.confidence}%)`, 105, yPos + 18, { align: 'center' });
      
      yPos += 35;
      
      // Add assessment date
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Last Assessment Date: ${new Date(latestAssessment.timestamp).toLocaleDateString()}`, 14, yPos);
      yPos += 15;
      
      // Add bedsore risk history
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text('Bedsore Risk History', 14, yPos);
      yPos += 8;
      
      // Create risk history table
      const historyData = bedsoreAssessments.map(assessment => [
        new Date(assessment.timestamp).toLocaleDateString(),
        assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1).replace('-', ' '),
        assessment.riskScore,
        assessment.confidence ? `${assessment.confidence}%` : 'N/A'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Risk Level', 'Risk Score', 'Confidence']],
        body: historyData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No bedsore risk assessments available.', 14, yPos);
      yPos += 15;
    }
    
    // Add Health Record History on a new page
    doc.addPage();
    yPos = 20;
    
    // Health Records History Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Health Record History', 14, yPos);
    yPos += 10;
    
    if (healthRecords && healthRecords.length > 0) {
      // Create a summary table of health records
      const recordsData = healthRecords.map(record => {
        // Get BMI if height and weight are available
        let bmi = '';
        if (record.height && record.weight) {
          const heightInMeters = record.height / 100;
          const bmiValue = record.weight / (heightInMeters * heightInMeters);
          bmi = bmiValue.toFixed(1);
        }
        
        return [
          new Date(record.timestamp).toLocaleDateString(),
          record.weight ? `${record.weight} kg` : '-',
          bmi || '-',
          record.bloodPressure || '-',
          record.hasDiabetes === 'yes' ? 'Yes' : 'No'
        ];
      });
      
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Weight', 'BMI', 'Blood Pressure', 'Diabetes']],
        body: recordsData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.autoTable.previous.finalY + 15;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('No health records available.', 14, yPos);
      yPos += 15;
    }
    
    // Add Recommendations on the final page
    doc.addPage();
    yPos = 20;
    
    // Recommendations Section
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Recommendations', 14, yPos);
    yPos += 10;
    
    // Generate general health recommendations
    const generalRecs = this.generateRecommendations(patientData, currentMetrics);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('General Health Recommendations', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    for (const rec of generalRecs) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(`• ${rec}`, 14, yPos);
      yPos += 8;
    }
    
    // Add bedsore prevention recommendations if at risk
    if (bedsoreAssessments && bedsoreAssessments.length > 0 && 
        (bedsoreAssessments[0].riskLevel === 'high' || 
         bedsoreAssessments[0].riskLevel === 'very-high' ||
         bedsoreAssessments[0].riskLevel === 'moderate')) {
      
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text('Bedsore Prevention Recommendations', 14, yPos);
      yPos += 8;
      
      // Generate bedsore prevention recommendations
      const bedsoreRecs = this.generateBedsoreRecommendations(patientData, bedsoreAssessments[0]);
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      
      for (const rec of bedsoreRecs) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.text(`• ${rec}`, 14, yPos);
        yPos += 8;
      }
    }
  }

  /**
   * Add patient info sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Object} patientData - Patient information
   */
  addPatientInfoSheet(wb, patientData) {
    // Create data for the sheet
    const data = [
      ['Patient Information'],
      ['Full Name', patientData.fullName || patientData.name || 'Unknown'],
      ['Age', patientData.age || 'Not recorded'],
      ['Phone Number', patientData.phoneNumber || 'Not recorded']
    ];
    
    if (patientData.height) {
      data.push(['Height', `${patientData.height} cm`]);
    }
    
    if (patientData.weight) {
      data.push(['Weight', `${patientData.weight} kg`]);
    }
    
    if (patientData.height && patientData.weight) {
      const heightInMeters = patientData.height / 100;
      const bmi = patientData.weight / (heightInMeters * heightInMeters);
      data.push(['BMI', bmi.toFixed(1)]);
      data.push(['BMI Category', this.getBMICategory(bmi)]);
    }
    
    if (patientData.bloodType) {
      data.push(['Blood Type', patientData.bloodType]);
    }
    
    data.push(['']);
    data.push(['Medical History']);
    
    if (patientData.hasDiabetes) {
      data.push(['Diabetes', patientData.hasDiabetes]);
      if (patientData.hasDiabetes === 'yes' && patientData.diabetesType) {
        data.push(['Diabetes Type', patientData.diabetesType]);
      }
    }
    
    if (patientData.surgeryHistory) {
      data.push(['Surgery History', patientData.surgeryHistory]);
      if (patientData.surgeryHistory === 'yes' && patientData.surgeryDetails) {
        data.push(['Surgery Details', patientData.surgeryDetails]);
      }
    }
    
    if (patientData.existingConditions && patientData.existingConditions.length > 0) {
      data.push(['Existing Conditions', patientData.existingConditions.join(', ')]);
    }
    
    if (patientData.additionalIssues) {
      data.push(['Additional Issues', patientData.additionalIssues]);
    }
    
    if (patientData.mobilityStatus) {
      data.push(['Mobility Status', patientData.mobilityStatus]);
    }
    
    if (patientData.incontinence) {
      data.push(['Incontinence', patientData.incontinence]);
    }
    
    data.push(['']);
    data.push(['Report Information']);
    data.push(['Generated On', new Date().toLocaleDateString()]);
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const colWidths = [{ wch: 25 }, { wch: 30 }];
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Patient Info');
  }

  /**
   * Add health records sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Array} healthRecords - Health record history
   */
  addHealthRecordsSheet(wb, healthRecords) {
    if (!healthRecords || healthRecords.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['No health records available']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Health Records');
      return;
    }
    
    // Create header row
    const header = ['Date', 'Weight (kg)', 'Height (cm)', 'BMI', 'Blood Pressure', 
      'Heart Rate', 'Oxygen Saturation', 'Temperature', 'Diabetes', 'Mobility Status'];
    
    // Create data rows
    const data = healthRecords.map(record => {
      // Calculate BMI if height and weight are available
      let bmi = '';
      if (record.height && record.weight) {
        const heightInMeters = record.height / 100;
        bmi = (record.weight / (heightInMeters * heightInMeters)).toFixed(1);
      }
      
      return [
        new Date(record.timestamp).toLocaleDateString(),
        record.weight || '',
        record.height || '',
        bmi,
        record.bloodPressure || '',
        record.heartRate || '',
        record.spo2 || '',
        record.temperature || record.bodyTemperature || '',
        record.hasDiabetes || '',
        record.mobilityStatus || ''
      ];
    });
    
    // Combine header and data
    const sheetData = [header, ...data];
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Date
      { wch: 12 }, // Weight
      { wch: 12 }, // Height
      { wch: 10 }, // BMI
      { wch: 15 }, // Blood Pressure
      { wch: 12 }, // Heart Rate
      { wch: 12 }, // SpO2
      { wch: 12 }, // Temperature
      { wch: 12 }, // Diabetes
      { wch: 15 }  // Mobility
    ];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Health Records');
  }

  /**
   * Add bedsore assessments sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   */
  addBedsoreAssessmentsSheet(wb, bedsoreAssessments) {
    if (!bedsoreAssessments || bedsoreAssessments.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['No bedsore risk assessments available']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Bedsore Risk');
      return;
    }
    
    // Create header row
    const header = ['Date', 'Risk Level', 'Risk Score', 'Confidence', 'Generated By'];
    
    // Create data rows
    const data = bedsoreAssessments.map(assessment => {
      return [
        new Date(assessment.timestamp).toLocaleDateString(),
        assessment.riskLevel,
        assessment.riskScore || '',
        assessment.confidence ? `${assessment.confidence}%` : '',
        assessment.generatedByDoctor ? 'Doctor' : (assessment.generatedAutomatically ? 'Automatic' : 'System')
      ];
    });
    
    // Combine header and data
    const sheetData = [header, ...data];
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Date
      { wch: 15 }, // Risk Level
      { wch: 12 }, // Risk Score
      { wch: 12 }, // Confidence
      { wch: 15 }  // Generated By
    ];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bedsore Risk');
  }

  /**
   * Add current metrics sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Object} currentMetrics - Current health metrics
   */
  addCurrentMetricsSheet(wb, currentMetrics) {
    if (!currentMetrics || Object.keys(currentMetrics).length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['No current health metrics available']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Current Metrics');
      return;
    }
    
    // Create data for the sheet
    const data = [['Metric', 'Value', 'Status']];
    
    // Add heart rate
    if (currentMetrics.heartRate) {
      data.push(['Heart Rate', `${currentMetrics.heartRate} bpm`, this.getHeartRateCategory(currentMetrics.heartRate)]);
    }
    
    // Add blood pressure
    if (currentMetrics.bp && currentMetrics.bp.systolic && currentMetrics.bp.diastolic) {
      const bp = `${currentMetrics.bp.systolic}/${currentMetrics.bp.diastolic} mmHg`;
      data.push(['Blood Pressure', bp, this.getBPCategory(bp)]);
    }
    
    // Add oxygen saturation
    if (currentMetrics.spo2) {
      data.push(['Oxygen Saturation', `${currentMetrics.spo2}%`, this.getSpO2Category(currentMetrics.spo2)]);
    }
    
    // Add temperature
    if (currentMetrics.temperature) {
      data.push(['Body Temperature', `${currentMetrics.temperature}°C`, this.getTemperatureCategory(currentMetrics.temperature)]);
    }
    
    // Add sitting duration
    if (currentMetrics.sittingDuration) {
      data.push(['Sitting Duration', `${currentMetrics.sittingDuration} minutes`, 
        currentMetrics.sittingDuration > 120 ? 'Warning: Extended Sitting' : 'Normal']);
    }
    
    // Add pressure readings
    if (currentMetrics.backPressure_L) {
      data.push(['Back Pressure (Left)', `${currentMetrics.backPressure_L} mmHg`, 
        this.getPressureCategory(currentMetrics.backPressure_L)]);
    }
    
    if (currentMetrics.backPressure_R) {
      data.push(['Back Pressure (Right)', `${currentMetrics.backPressure_R} mmHg`, 
        this.getPressureCategory(currentMetrics.backPressure_R)]);
    }
    
    if (currentMetrics.shoulderPressure_L) {
      data.push(['Shoulder Pressure (Left)', `${currentMetrics.shoulderPressure_L} mmHg`, 
        this.getPressureCategory(currentMetrics.shoulderPressure_L)]);
    }
    
    if (currentMetrics.shoulderPressure_R) {
      data.push(['Shoulder Pressure (Right)', `${currentMetrics.shoulderPressure_R} mmHg`, 
        this.getPressureCategory(currentMetrics.shoulderPressure_R)]);
    }
    
    if (currentMetrics.legPressure_L) {
      data.push(['Leg Pressure (Left)', `${currentMetrics.legPressure_L} mmHg`, 
        this.getPressureCategory(currentMetrics.legPressure_L)]);
    }
    
    if (currentMetrics.legPressure_R) {
      data.push(['Leg Pressure (Right)', `${currentMetrics.legPressure_R} mmHg`, 
        this.getPressureCategory(currentMetrics.legPressure_R)]);
    }
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Metric
      { wch: 20 }, // Value
      { wch: 25 }  // Status
    ];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Current Metrics');
  }

  /**
   * Add health summary sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Object} patientData - Patient information
   * @param {Array} healthRecords - Health record history
   * @param {Object} currentMetrics - Current health metrics
   */
  addHealthSummarySheet(wb, patientData, healthRecords, currentMetrics) {
    // Create data for the sheet
    const data = [
      ['Health Summary Report'],
      ['Generated On', new Date().toLocaleDateString()],
      [''],
      ['Patient Information'],
      ['Full Name', patientData.fullName || patientData.name || 'Unknown'],
      ['Age', patientData.age || 'Not recorded'],
      ['Phone Number', patientData.phoneNumber || 'Not recorded']
    ];
    
    if (patientData.height && patientData.weight) {
      const heightInMeters = patientData.height / 100;
      const bmi = patientData.weight / (heightInMeters * heightInMeters);
      
      data.push(['Height', `${patientData.height} cm`]);
      data.push(['Weight', `${patientData.weight} kg`]);
      data.push(['BMI', `${bmi.toFixed(1)} (${this.getBMICategory(bmi)})`]);
    }
    
    data.push(['']);
    data.push(['Current Health Metrics']);
    
    // Add current metrics
    if (currentMetrics && Object.keys(currentMetrics).length > 0) {
      // Add heart rate
      if (currentMetrics.heartRate) {
        data.push(['Heart Rate', `${currentMetrics.heartRate} bpm`, this.getHeartRateCategory(currentMetrics.heartRate)]);
      }
      
      // Add blood pressure
      if (currentMetrics.bp && currentMetrics.bp.systolic && currentMetrics.bp.diastolic) {
        const bp = `${currentMetrics.bp.systolic}/${currentMetrics.bp.diastolic} mmHg`;
        data.push(['Blood Pressure', bp, this.getBPCategory(bp)]);
      }
      
      // Add oxygen saturation
      if (currentMetrics.spo2) {
        data.push(['Oxygen Saturation', `${currentMetrics.spo2}%`, this.getSpO2Category(currentMetrics.spo2)]);
      }
      
      // Add temperature
      if (currentMetrics.temperature) {
        data.push(['Body Temperature', `${currentMetrics.temperature}°C`, this.getTemperatureCategory(currentMetrics.temperature)]);
      }
    } else if (patientData.bloodPressure) {
      data.push(['Blood Pressure', patientData.bloodPressure, this.getBPCategory(patientData.bloodPressure)]);
    } else {
      data.push(['No current health metrics available']);
    }
    
    data.push(['']);
    data.push(['Risk Factors']);
    
    // Add risk factors
    let hasRiskFactors = false;
    
    if (patientData.hasDiabetes === 'yes') {
      data.push(['Diabetes', patientData.diabetesType || 'Yes', 'High Risk Factor']);
      hasRiskFactors = true;
    }
    
    if (patientData.mobilityStatus) {
      let riskLevel = 'Low';
      if (patientData.mobilityStatus === 'bedbound') riskLevel = 'Very High';
      else if (patientData.mobilityStatus === 'chairbound') riskLevel = 'High';
      else if (patientData.mobilityStatus === 'assistance') riskLevel = 'Moderate';
      
      data.push(['Mobility', patientData.mobilityStatus, `${riskLevel} Risk Factor`]);
      hasRiskFactors = true;
    }
    
    if (patientData.incontinence && patientData.incontinence !== 'no') {
      let riskLevel = 'Moderate';
      if (patientData.incontinence === 'both') riskLevel = 'High';
      
      data.push(['Incontinence', patientData.incontinence, `${riskLevel} Risk Factor`]);
      hasRiskFactors = true;
    }
    
    if (!hasRiskFactors) {
      data.push(['No significant risk factors identified']);
    }
    
    data.push(['']);
    data.push(['Recommendations']);
    
    // Generate and add recommendations
    const recommendations = this.generateRecommendations(patientData, currentMetrics);
    
    if (recommendations.length > 0) {
      recommendations.forEach((rec, index) => {
        data.push([`${index + 1}. ${rec}`]);
      });
    } else {
      data.push(['No specific recommendations available']);
    }
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // First column
      { wch: 30 }, // Second column
      { wch: 25 }  // Third column
    ];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Health Summary');
  }

  /**
   * Add bedsore risk sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Object} patientData - Patient information
   * @param {Array} bedsoreAssessments - Bedsore risk assessments
   */
  addBedsoreRiskSheet(wb, patientData, bedsoreAssessments) {
    if (!bedsoreAssessments || bedsoreAssessments.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Bedsore Risk Assessment Report'],
        ['Generated On', new Date().toLocaleDateString()],
        [''],
        ['No bedsore risk assessments available for this patient']
      ]);
      
      XLSX.utils.book_append_sheet(wb, ws, 'Bedsore Risk');
      return;
    }
    
    // Get the most recent assessment
    const latestAssessment = bedsoreAssessments[0];
    
    // Create data for the sheet
    const data = [
      ['Bedsore Risk Assessment Report'],
      ['Generated On', new Date().toLocaleDateString()],
      [''],
      ['Patient Information'],
      ['Full Name', patientData.fullName || patientData.name || 'Unknown'],
      ['Age', patientData.age || 'Not recorded'],
      [''],
      ['Current Risk Assessment'],
      ['Risk Level', latestAssessment.riskLevel.charAt(0).toUpperCase() + latestAssessment.riskLevel.slice(1).replace('-', ' ')],
      ['Risk Score', `${latestAssessment.riskScore}/100`],
      ['Confidence', latestAssessment.confidence ? `${latestAssessment.confidence}%` : 'N/A'],
      ['Assessment Date', new Date(latestAssessment.timestamp).toLocaleDateString()],
      ['']
    ];
    
    data.push(['Contributing Risk Factors']);
    
    // Add risk factors
    let hasRiskFactors = false;
    
    if (patientData.mobilityStatus) {
      let riskLevel = 'Low';
      if (patientData.mobilityStatus === 'bedbound') riskLevel = 'Very High';
      else if (patientData.mobilityStatus === 'chairbound') riskLevel = 'High';
      else if (patientData.mobilityStatus === 'assistance') riskLevel = 'Moderate';
      
      data.push(['Mobility Status', patientData.mobilityStatus, riskLevel]);
      hasRiskFactors = true;
    }
    
    if (patientData.hasDiabetes === 'yes') {
      data.push(['Diabetes', patientData.diabetesType || 'Yes', 'High']);
      hasRiskFactors = true;
    }
    
    if (patientData.incontinence && patientData.incontinence !== 'no') {
      let riskLevel = 'Moderate';
      if (patientData.incontinence === 'both') riskLevel = 'High';
      
      data.push(['Incontinence', patientData.incontinence, riskLevel]);
      hasRiskFactors = true;
    }
    
    if (patientData.age) {
      let riskLevel = 'Low';
      if (patientData.age > 70) riskLevel = 'High';
      else if (patientData.age > 60) riskLevel = 'Moderate';
      
      data.push(['Age', patientData.age, riskLevel]);
      hasRiskFactors = true;
    }
    
    if (patientData.height && patientData.weight) {
      const heightInMeters = patientData.height / 100;
      const bmi = patientData.weight / (heightInMeters * heightInMeters);
      
      if (bmi < 18.5 || bmi >= 30) {
        const bmiStatus = bmi < 18.5 ? 'Underweight' : 'Obese';
        data.push(['BMI Status', bmiStatus, 'Moderate']);
        hasRiskFactors = true;
      }
    }
    
    if (!hasRiskFactors) {
      data.push(['No specific risk factors identified']);
    }
    
    data.push(['']);
    data.push(['Risk Assessment History']);
    data.push(['Date', 'Risk Level', 'Risk Score', 'Confidence']);
    
    bedsoreAssessments.forEach(assessment => {
      data.push([
        new Date(assessment.timestamp).toLocaleDateString(),
        assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1).replace('-', ' '),
        assessment.riskScore,
        assessment.confidence ? `${assessment.confidence}%` : 'N/A'
      ]);
    });
    
    data.push(['']);
    data.push(['Prevention Recommendations']);
    
    // Generate bedsore prevention recommendations
    const recommendations = this.generateBedsoreRecommendations(patientData, latestAssessment);
    
    if (recommendations.length > 0) {
      recommendations.forEach((rec, index) => {
        data.push([`${index + 1}. ${rec}`]);
      });
    } else {
      data.push(['No specific recommendations available']);
    }
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // First column
      { wch: 30 }, // Second column
      { wch: 25 }  // Third column
    ];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bedsore Risk');
  }

  /**
   * Add vitals history sheet to Excel workbook
   * @param {Workbook} wb - Excel workbook
   * @param {Object} patientData - Patient information
   * @param {Array} healthRecords - Health record history
   */
  addVitalsHistorySheet(wb, patientData, healthRecords) {
    if (!healthRecords || healthRecords.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Vitals History Report'],
        ['Generated On', new Date().toLocaleDateString()],
        [''],
        ['No health records available for this patient']
      ]);
      
      XLSX.utils.book_append_sheet(wb, ws, 'Vitals History');
      return;
    }
    
    // Create data for the sheet
    const data = [
      ['Vitals History Report'],
      ['Generated On', new Date().toLocaleDateString()],
      [''],
      ['Patient Information'],
      ['Full Name', patientData.fullName || patientData.name || 'Unknown'],
      ['Age', patientData.age || 'Not recorded'],
      [''],
      ['Vital Signs History'],
      ['Date', 'Blood Pressure', 'Heart Rate', 'Oxygen Saturation', 'Temperature', 'Respiratory Rate']
    ];
    
    // Add vitals history
    healthRecords.forEach(record => {
      data.push([
        new Date(record.timestamp).toLocaleDateString(),
        record.bloodPressure || '-',
        record.heartRate ? `${record.heartRate} bpm` : '-',
        record.spo2 ? `${record.spo2}%` : '-',
        record.temperature || record.bodyTemperature ? 
          `${record.temperature || record.bodyTemperature}°C` : '-',
        record.respiratoryRate ? `${record.respiratoryRate} breaths/min` : '-'
      ]);
    });
    
    // Create the worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Date
      { wch: 15 }, // Blood Pressure
      { wch: 15 }, // Heart Rate
      { wch: 15 }, // SpO2
      { wch: 15 }, // Temperature
      { wch: 20 }  // Respiratory Rate
    ];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Vitals History');
  }

  // Utility functions for categorization and recommendations

  /**
   * Get BMI category
   * @param {number} bmi - BMI value
   * @returns {string} - BMI category
   */
  getBMICategory(bmi) {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }

  /**
   * Get blood pressure category
   * @param {string} bp - Blood pressure (e.g., "120/80")
   * @returns {string} - Blood pressure category
   */
  getBPCategory(bp) {
    if (!bp) return "Unknown";
    
    const match = bp.match(/(\d+)\/(\d+)/);
    if (!match || match.length < 3) return "Unknown format";
    
    const systolic = parseInt(match[1], 10);
    const diastolic = parseInt(match[2], 10);
    
    if (systolic < 90 || diastolic < 60) return "Low (Hypotension)";
    if (systolic < 120 && diastolic < 80) return "Normal";
    if (systolic < 130 && diastolic < 80) return "Elevated";
    if (systolic < 140 || diastolic < 90) return "Stage 1 Hypertension";
    return "Stage 2 Hypertension";
  }

  /**
   * Get heart rate category
   * @param {number} rate - Heart rate in bpm
   * @returns {string} - Heart rate category
   */
  getHeartRateCategory(rate) {
    if (!rate) return "Unknown";
    
    if (rate < 60) return "Low (Bradycardia)";
    if (rate <= 100) return "Normal";
    return "Elevated (Tachycardia)";
  }

  /**
   * Get SpO2 category
   * @param {number} spo2 - Oxygen saturation percentage
   * @returns {string} - SpO2 category
   */
  getSpO2Category(spo2) {
    if (!spo2) return "Unknown";
    
    if (spo2 < 90) return "Severe Hypoxemia";
    if (spo2 < 95) return "Mild Hypoxemia";
    return "Normal";
  }

  /**
   * Get temperature category
   * @param {number} temp - Temperature in Celsius
   * @returns {string} - Temperature category
   */
  getTemperatureCategory(temp) {
    if (!temp) return "Unknown";
    
    if (temp < 36) return "Hypothermia";
    if (temp <= 37.5) return "Normal";
    if (temp <= 38.3) return "Mild Fever";
    if (temp <= 39.4) return "Moderate Fever";
    return "High Fever";
  }

  /**
   * Get respiratory rate category
   * @param {number} rate - Respiratory rate in breaths/min
   * @returns {string} - Respiratory rate category
   */
  getRespiratoryRateCategory(rate) {
    if (!rate) return "Unknown";
    
    if (rate < 12) return "Low";
    if (rate <= 20) return "Normal";
    return "Elevated";
  }

  /**
   * Get pressure reading category
   * @param {number} pressure - Pressure reading in mmHg
   * @returns {string} - Pressure category
   */
  getPressureCategory(pressure) {
    if (!pressure) return "Unknown";
    
    if (pressure < 20) return "Low";
    if (pressure <= 40) return "Normal";
    if (pressure <= 60) return "Elevated";
    if (pressure <= 80) return "High";
    return "Very High";
  }

  /**
   * Generate health recommendations based on patient data
   * @param {Object} patient - Patient data
   * @param {Object} metrics - Current health metrics
   * @returns {Array} - List of recommendations
   */
  generateRecommendations(patient, metrics) {
    const recommendations = [];
    
    // Basic recommendations for everyone
    recommendations.push("Maintain a balanced diet rich in fruits, vegetables, and whole grains.");
    recommendations.push("Stay hydrated by drinking plenty of water throughout the day.");
    recommendations.push("Aim for at least 150 minutes of moderate-intensity physical activity per week.");
    
    // Add weight-specific recommendations
    if (patient.height && patient.weight) {
      const heightInMeters = patient.height / 100;
      const bmi = patient.weight / (heightInMeters * heightInMeters);
      
      if (bmi < 18.5) {
        recommendations.push("Work with a healthcare provider to develop a healthy weight gain plan.");
        recommendations.push("Focus on nutrient-dense foods and consider increasing caloric intake.");
      } else if (bmi >= 30) {
        recommendations.push("Consider working with a healthcare provider to develop a weight management plan.");
        recommendations.push("Focus on portion control and regular physical activity appropriate for your mobility level.");
      }
    }
    
    // Add diabetes-specific recommendations
    if (patient.hasDiabetes === 'yes') {
      recommendations.push("Monitor blood glucose levels regularly as recommended by your healthcare provider.");
      recommendations.push("Follow your prescribed medication regimen consistently.");
      recommendations.push("Pay special attention to foot care and check your feet daily for any wounds or sores.");
      recommendations.push("Schedule regular eye examinations to monitor for diabetic retinopathy.");
    }
    
    // Add mobility-specific recommendations
    if (patient.mobilityStatus) {
      if (patient.mobilityStatus === 'bedbound') {
        recommendations.push("Change position at least every 2 hours to prevent pressure ulcers.");
        recommendations.push("Perform range-of-motion exercises as recommended by your healthcare provider.");
        recommendations.push("Use pressure-redistributing mattresses and cushions.");
      } else if (patient.mobilityStatus === 'chairbound') {
        recommendations.push("Shift your weight at least every 15-30 minutes when sitting.");
        recommendations.push("Use a pressure-relieving cushion when sitting for extended periods.");
        recommendations.push("Perform upper body exercises regularly to maintain strength.");
      } else if (patient.mobilityStatus === 'assistance') {
        recommendations.push("Use mobility aids consistently and correctly to prevent falls.");
        recommendations.push("Consider working with a physical therapist to improve mobility and strength.");
      }
    }
    
    // Add recommendations based on blood pressure
    if (patient.bloodPressure) {
      const bpCategory = this.getBPCategory(patient.bloodPressure);
      
      if (bpCategory.includes("Hypertension")) {
        recommendations.push("Limit sodium intake to help manage blood pressure.");
        recommendations.push("Consider the DASH (Dietary Approaches to Stop Hypertension) eating plan.");
        recommendations.push("Take blood pressure medications as prescribed by your healthcare provider.");
        recommendations.push("Monitor your blood pressure regularly and maintain a blood pressure log.");
      } else if (bpCategory.includes("Low")) {
        recommendations.push("Stay hydrated and consider increasing salt intake slightly (if approved by your doctor).");
        recommendations.push("Change positions slowly to avoid dizziness.");
      }
    }
    
    // Add incontinence-specific recommendations
    if (patient.incontinence && patient.incontinence !== 'no') {
      recommendations.push("Maintain a regular toileting schedule to manage incontinence.");
      recommendations.push("Keep skin clean and dry to prevent skin breakdown.");
      recommendations.push("Use appropriate incontinence products that wick moisture away from skin.");
      recommendations.push("Consider pelvic floor exercises if recommended by your healthcare provider.");
    }
    
    // Add sitting duration recommendations
    if (metrics && metrics.sittingDuration && metrics.sittingDuration > 120) {
      recommendations.push("Break up long periods of sitting with short movement breaks every 30-60 minutes.");
      recommendations.push("Consider using a timer to remind yourself to change positions regularly.");
    }
    
    // Limit to a reasonable number
    return recommendations.slice(0, 10);
  }

  /**
   * Generate bedsore prevention recommendations
   * @param {Object} patient - Patient data
   * @param {Object} assessment - Bedsore risk assessment
   * @returns {Array} - List of recommendations
   */
  generateBedsoreRecommendations(patient, assessment) {
    const recommendations = [];
    const riskLevel = assessment ? assessment.riskLevel : 'low';
    
    // Common recommendations for all risk levels
    recommendations.push("Inspect skin daily for any redness, warmth, or breakdown, especially over bony prominences.");
    recommendations.push("Keep skin clean and dry, using mild cleansers that don't irritate or dry the skin.");
    recommendations.push("Use moisturizers to keep skin hydrated and prevent cracking.");
    recommendations.push("Ensure adequate nutrition and hydration, as these are essential for healthy skin.");
    
    // Add mobility-specific recommendations
    if (patient.mobilityStatus) {
      if (patient.mobilityStatus === 'bedbound') {
        recommendations.push("Change position at least every 2 hours, following a regular turning schedule.");
        recommendations.push("Use pillows or foam wedges to keep bony prominences from direct contact with each other.");
        recommendations.push("Elevate heels completely off the bed surface using pillows or specialized devices.");
        recommendations.push("Consider using a pressure-redistributing mattress or overlay.");
        recommendations.push("When repositioning, lift rather than drag to reduce friction and shear forces.");
      } else if (patient.mobilityStatus === 'chairbound') {
        recommendations.push("Shift weight every 15-30 minutes when sitting, or ask for assistance with repositioning.");
        recommendations.push("Use a pressure-redistributing cushion on all seating surfaces.");
        recommendations.push("Limit time spent in a chair without pressure relief; aim for no more than 1 hour.");
        recommendations.push("Ensure feet are properly supported, either on the floor or on footrests.");
      }
    }
    
    // Add incontinence-specific recommendations
    if (patient.incontinence && patient.incontinence !== 'no') {
      recommendations.push("Clean skin promptly after each incontinence episode.");
      recommendations.push("Apply moisture barrier products to protect skin from urine and feces.");
      recommendations.push("Consider using incontinence products that wick moisture away from the skin.");
      recommendations.push("Establish a regular toileting schedule to manage incontinence.");
    }
    
    // Add risk level-specific recommendations
    if (riskLevel === 'high' || riskLevel === 'very-high') {
      recommendations.push("Request a specialized support surface or pressure-relieving mattress.");
      recommendations.push("Consider consultation with a wound care specialist for a personalized prevention plan.");
      recommendations.push("Increase frequency of position changes to every 1-2 hours.");
      recommendations.push("Consider using foam dressings preventively on high-risk areas.");
      recommendations.push("Monitor for signs of skin breakdown at each position change.");
    } else if (riskLevel === 'moderate') {
      recommendations.push("Use gentle friction during bathing to avoid skin irritation and damage.");
      recommendations.push("Avoid positioning directly on the trochanter (hip bone) when lying on side.");
      recommendations.push("Perform regular range-of-motion exercises if permitted by healthcare provider.");
    }
    
    return recommendations;
  }

  /**
   * Analyze trends in vitals over time
   * @param {Array} healthRecords - Health record history
   * @returns {Array} - List of trend observations
   */
  analyzeVitalsTrends(healthRecords) {
    if (!healthRecords || healthRecords.length < 2) {
      return ["Insufficient data to analyze trends. At least two health records are needed for trend analysis."];
    }
    
    // Sort records by date (oldest first)
    const sortedRecords = [...healthRecords].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const trends = [];
    
    // Analyze blood pressure trends
    if (sortedRecords.some(record => record.bloodPressure)) {
      const bpRecords = sortedRecords.filter(record => record.bloodPressure);
      
      if (bpRecords.length >= 2) {
        const firstBP = bpRecords[0].bloodPressure;
        const lastBP = bpRecords[bpRecords.length - 1].bloodPressure;
        
        // Extract systolic and diastolic values
        const firstMatch = firstBP.match(/(\d+)\/(\d+)/);
        const lastMatch = lastBP.match(/(\d+)\/(\d+)/);
        
        if (firstMatch && lastMatch) {
          const firstSystolic = parseInt(firstMatch[1], 10);
          const firstDiastolic = parseInt(firstMatch[2], 10);
          const lastSystolic = parseInt(lastMatch[1], 10);
          const lastDiastolic = parseInt(lastMatch[2], 10);
          
          const systolicDiff = lastSystolic - firstSystolic;
          const diastolicDiff = lastDiastolic - firstDiastolic;
          
          if (Math.abs(systolicDiff) > 10 || Math.abs(diastolicDiff) > 5) {
            if (systolicDiff > 0 && diastolicDiff > 0) {
              trends.push(`Blood pressure has increased from ${firstBP} to ${lastBP} over the recorded period. Consider discussing this trend with your healthcare provider.`);
            } else if (systolicDiff < 0 && diastolicDiff < 0) {
              trends.push(`Blood pressure has decreased from ${firstBP} to ${lastBP} over the recorded period.`);
            } else {
              trends.push(`Blood pressure has changed from ${firstBP} to ${lastBP} over the recorded period. The pattern is mixed and should be discussed with your healthcare provider.`);
            }
          } else {
            trends.push(`Blood pressure has remained relatively stable over the recorded period (${firstBP} to ${lastBP}).`);
          }
        }
      }
    }
    
    // Analyze weight trends
    if (sortedRecords.some(record => record.weight)) {
      const weightRecords = sortedRecords.filter(record => record.weight);
      
      if (weightRecords.length >= 2) {
        const firstWeight = weightRecords[0].weight;
        const lastWeight = weightRecords[weightRecords.length - 1].weight;
        const weightDiff = lastWeight - firstWeight;
        
        if (Math.abs(weightDiff) >= 2) {
          if (weightDiff > 0) {
            trends.push(`Weight has increased by ${weightDiff.toFixed(1)} kg over the recorded period, from ${firstWeight} kg to ${lastWeight} kg.`);
          } else {
            trends.push(`Weight has decreased by ${Math.abs(weightDiff).toFixed(1)} kg over the recorded period, from ${firstWeight} kg to ${lastWeight} kg.`);
          }
        } else {
          trends.push(`Weight has remained relatively stable over the recorded period (${firstWeight} kg to ${lastWeight} kg).`);
        }
      }
    }
    
    // If no specific trends identified, add a general statement
    if (trends.length === 0) {
      trends.push("No significant trends identified in the vital signs data. Continue monitoring regularly.");
    }
    
    return trends;
  }
}

export default new ReportGenerator();