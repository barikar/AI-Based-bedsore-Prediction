import React, { useState, useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // Correct import
import '../styles/HealthProgressTracker.css';

const HealthProgressTracker = ({ userId }) => {
  const [healthRecords, setHealthRecords] = useState([]);
  const [bedsoreAssessments, setBedsoreAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [chartData, setChartData] = useState([]);
  const [activeMetrics, setActiveMetrics] = useState({
    weight: true,
    bloodPressure: true,
    heartRate: false,
    bedsoreRisk: true,
    pressure: true,
    temperature: true,
    humidity: true,
  });
  const [historicalPeriod, setHistoricalPeriod] = useState('week');

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const fetchHealthData = async () => {
      setLoading(true);
      try {
        const healthRef = ref(database, `healthRecords/${userId}`);
        const healthSnapshot = await get(healthRef);

        if (healthSnapshot.exists()) {
          const records = [];
          healthSnapshot.forEach((childSnapshot) => {
            records.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
              timestamp: new Date(childSnapshot.val().timestamp),
            });
          });
          records.sort((a, b) => b.timestamp - a.timestamp);
          setHealthRecords(records);
        }

        const bedsoreRef = ref(database, `bedsoreAssessments/${userId}`);
        const bedsoreSnapshot = await get(bedsoreRef);

        if (bedsoreSnapshot.exists()) {
          const assessments = [];
          bedsoreSnapshot.forEach((childSnapshot) => {
            assessments.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
              timestamp: new Date(childSnapshot.val().timestamp),
            });
          });
          assessments.sort((a, b) => b.timestamp - a.timestamp);
          setBedsoreAssessments(assessments);
        }
      } catch (error) {
        console.error("Error fetching health data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchHealthData();
    }
  }, [userId]);

  useEffect(() => {
    if (healthRecords.length > 0 || bedsoreAssessments.length > 0) {
      const data = prepareChartData();
      setChartData(data);
    }
  }, [healthRecords, bedsoreAssessments, timeRange]);

  useEffect(() => {
    if (chartData.length > 0 && chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const dates = chartData.map(item => item.displayDate);

      const datasets = [];

      if (activeMetrics.weight) {
        datasets.push({
          label: 'Weight (kg)',
          data: chartData.map(item => item.weight),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        });
      }

      if (activeMetrics.bloodPressure) {
        datasets.push(
          {
            label: 'Systolic BP',
            data: chartData.map(item => item.systolic),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
          },
          {
            label: 'Diastolic BP',
            data: chartData.map(item => item.diastolic),
            borderColor: '#9b59b6',
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderDash: [5, 5],
            fill: false,
          }
        );
      }

      if (activeMetrics.bedsoreRisk) {
        datasets.push({
          label: 'Bedsore Risk',
          data: chartData.map(item => item.bedsoreRisk),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y1',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        });
      }

      if (activeMetrics.heartRate) {
        datasets.push({
          label: 'Heart Rate (bpm)',
          data: chartData.map(item => item.heartRate),
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        });
      }

      if (activeMetrics.pressure) {
        datasets.push({
          label: 'Pressure (hPa)',
          data: chartData.map(item => item.pressure),
          borderColor: '#1abc9c',
          backgroundColor: 'rgba(26, 188, 156, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        });
      }

      if (activeMetrics.temperature) {
        datasets.push({
          label: 'Temperature (°C)',
          data: chartData.map(item => item.temperature),
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230, 126, 34, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        });
      }

      if (activeMetrics.humidity) {
        datasets.push({
          label: 'Humidity (%)',
          data: chartData.map(item => item.humidity),
          borderColor: '#34495e',
          backgroundColor: 'rgba(52, 73, 94, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        });
      }

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: datasets,
        },
        options: {
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              titleColor: '#333',
              bodyColor: '#666',
              borderColor: '#ddd',
              borderWidth: 1,
              padding: 10,
              boxPadding: 3,
              usePointStyle: true,
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += context.parsed.y;
                    if (label.includes('Weight')) label += ' kg';
                    if (label.includes('BP')) label += ' mmHg';
                    if (label.includes('Heart Rate')) label += ' bpm';
                    if (label.includes('Bedsore')) label += '/100';
                    if (label.includes('Pressure')) label += ' hPa';
                    if (label.includes('Temperature')) label += ' °C';
                    if (label.includes('Humidity')) label += ' %';
                  }
                  return label;
                },
              },
            },
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                boxWidth: 10,
                padding: 20,
              },
            },
            zoom: {
              pan: { enabled: true, mode: 'x' },
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x',
              },
            },
          },
          scales: {
            x: {
              ticks: { autoSkip: true, maxRotation: 45, minRotation: 45 },
              grid: { display: false },
              title: { display: true, text: 'Date', font: { size: 14 } },
            },
            y: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Value', font: { size: 14 } },
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Risk Score (0-100)', font: { size: 14 } },
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false },
            },
          },
          animations: {
            tension: { duration: 1000, easing: 'linear' },
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, activeMetrics]);

  const getFilteredRecords = () => {
    const now = new Date();
    let cutoffDate;

    switch (timeRange) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    return {
      healthRecords: healthRecords.filter(record => record.timestamp >= cutoffDate),
      bedsoreAssessments: bedsoreAssessments.filter(record => record.timestamp >= cutoffDate),
    };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);

    if (timeRange === 'week') {
      return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    }

    if (timeRange === 'month') {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString(undefined, { month: 'short' });
  };

  const prepareChartData = () => {
    const { healthRecords, bedsoreAssessments } = getFilteredRecords();

    const sortedHealthRecords = [...healthRecords].sort((a, b) => a.timestamp - b.timestamp);
    const sortedBedsoreRecords = [...bedsoreAssessments].sort((a, b) => a.timestamp - b.timestamp);

    const combinedData = {};

    sortedHealthRecords.forEach(record => {
      const dateStr = record.timestamp.toISOString().split('T')[0];

      if (!combinedData[dateStr]) {
        combinedData[dateStr] = {
          date: dateStr,
          displayDate: formatDate(record.timestamp),
          timestamp: record.timestamp,
        };
      }

      if (record.weight) combinedData[dateStr].weight = parseFloat(record.weight);
      if (record.bloodPressure) {
        const [systolic, diastolic] = record.bloodPressure.split('/').map(val => parseFloat(val.trim()));
        if (!isNaN(systolic)) combinedData[dateStr].systolic = systolic;
        if (!isNaN(diastolic)) combinedData[dateStr].diastolic = diastolic;
      }
      if (record.heartRate) combinedData[dateStr].heartRate = parseFloat(record.heartRate);
      if (record.pressure) combinedData[dateStr].pressure = parseFloat(record.pressure);
      if (record.temperature) combinedData[dateStr].temperature = parseFloat(record.temperature);
      if (record.humidity) combinedData[dateStr].humidity = parseFloat(record.humidity);
    });

    sortedBedsoreRecords.forEach(record => {
      const dateStr = record.timestamp.toISOString().split('T')[0];

      if (!combinedData[dateStr]) {
        combinedData[dateStr] = {
          date: dateStr,
          displayDate: formatDate(record.timestamp),
          timestamp: record.timestamp,
        };
      }

      combinedData[dateStr].bedsoreRisk = record.riskScore;
    });

    const result = Object.values(combinedData).sort((a, b) => a.timestamp - b.timestamp);
    return result;
  };

  const calculateHistoricalComparison = () => {
    if (chartData.length === 0) return null;

    const latestData = chartData[chartData.length - 1];

    const now = new Date();
    let startDate;

    switch (historicalPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const historicalData = chartData
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate < new Date(latestData.date);
      });

    if (historicalData.length === 0) return null;

    const historicalAverages = {
      weight: calculateAverage(historicalData, 'weight'),
      systolic: calculateAverage(historicalData, 'systolic'),
      diastolic: calculateAverage(historicalData, 'diastolic'),
      heartRate: calculateAverage(historicalData, 'heartRate'),
      bedsoreRisk: calculateAverage(historicalData, 'bedsoreRisk'),
      pressure: calculateAverage(historicalData, 'pressure'),
      temperature: calculateAverage(historicalData, 'temperature'),
      humidity: calculateAverage(historicalData, 'humidity'),
    };

    const changes = {
      weight: latestData.weight ? (latestData.weight - historicalAverages.weight) : null,
      systolic: latestData.systolic ? (latestData.systolic - historicalAverages.systolic) : null,
      diastolic: latestData.diastolic ? (latestData.diastolic - historicalAverages.diastolic) : null,
      heartRate: latestData.heartRate ? (latestData.heartRate - historicalAverages.heartRate) : null,
      bedsoreRisk: latestData.bedsoreRisk ? (latestData.bedsoreRisk - historicalAverages.bedsoreRisk) : null,
      pressure: latestData.pressure ? (latestData.pressure - historicalAverages.pressure) : null,
      temperature: latestData.temperature ? (latestData.temperature - historicalAverages.temperature) : null,
      humidity: latestData.humidity ? (latestData.humidity - historicalAverages.humidity) : null,
    };

    return {
      current: latestData,
      historical: historicalAverages,
      changes,
      periodLabel: historicalPeriod === 'week' ? 'Last Week' : 'Last Month',
    };
  };

  const calculateAverage = (data, metric) => {
    const validValues = data
      .filter(item => item[metric] !== undefined && item[metric] !== null)
      .map(item => item[metric]);

    if (validValues.length === 0) return null;

    const sum = validValues.reduce((total, val) => total + val, 0);
    return sum / validValues.length;
  };

  const formatChange = (value, isGoodWhenLower = true) => {
    if (value === null || value === undefined) return '--';

    const rounded = Math.round(value * 10) / 10;
    const isPositive = rounded > 0;

    const isGood = isGoodWhenLower ? !isPositive : isPositive;

    return (
      <span className={`change-value ${isGood ? 'positive-change' : 'negative-change'}`}>
        {isPositive ? '+' : ''}{rounded}
        <span className="change-arrow">{isPositive ? '▲' : '▼'}</span>
      </span>
    );
  };

  const toggleMetric = (metric) => {
    setActiveMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  // Updated PDF Generator and Clinical Assessment Functions
  const generatePdfReport = async () => {
    try {
      // Check if we have any patient data
      if (healthRecords.length === 0) {
        alert("No patient data available to generate report.");
        return;
      }
  
      const doc = new jsPDF();
      
      // Get the latest patient record (already sorted by timestamp)
      const patientInfo = healthRecords[0];
      
      // Get bedsore assessments data
      const hasBedsoreData = bedsoreAssessments.length > 0;
      const latestBedsoreAssessment = hasBedsoreData ? bedsoreAssessments[0] : null;
      
      // Set up document
      doc.setFontSize(24);
      doc.setTextColor(44, 62, 80);
      doc.text("Bedsore Prevention Report", 105, 20, { align: "center" });
  
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Generated on: " + new Date().toLocaleDateString(), 105, 28, { align: "center" });
  
      doc.setDrawColor(46, 204, 113);
      doc.setLineWidth(0.5);
      doc.line(20, 32, 190, 32);
  
      // ====== PATIENT INFORMATION SECTION ======
      let yPos = 42;
      
      // Section Header
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Patient Information", 20, yPos);
      yPos += 10;
  
      // Build patient information with direct text placement
      doc.setFontSize(11);
      doc.setDrawColor(200, 200, 200);
  
      const drawField = (label, value, y) => {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text(label + ":", 25, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(value || "Not recorded", 80, y);
      };
  
      // Use actual patient data, falling back to placeholders only when needed
      drawField("Name", patientInfo.fullName || patientInfo.name || "Not recorded", yPos); yPos += 8;
      drawField("Age", patientInfo.age ? `${patientInfo.age} years` : "Not recorded", yPos); yPos += 8;
      drawField("Weight", patientInfo.weight ? `${patientInfo.weight} kg` : "Not recorded", yPos); yPos += 8;
      drawField("Mobility Status", patientInfo.mobilityStatus || "Not specified", yPos); yPos += 8;
      
      // Draw a line to separate sections
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
  
      // ====== BEDSORE RISK ASSESSMENT SECTION ======
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Bedsore Risk Assessment", 20, yPos);
      yPos += 10;
      
      // Bedsore risk information
      doc.setFontSize(11);
      
      if (hasBedsoreData) {
        // Show the risk score prominently
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("Current Risk Score:", 25, yPos);
        
        // Color code the risk score
        const riskScore = latestBedsoreAssessment.riskScore;
        if (riskScore >= 60) {
          doc.setTextColor(231, 76, 60); // Red for high risk
        } else if (riskScore >= 30) {
          doc.setTextColor(243, 156, 18); // Orange for moderate risk
        } else {
          doc.setTextColor(46, 204, 113); // Green for low risk
        }
        
        doc.text(`${riskScore}/100 - ${assessBedsoreRisk(riskScore)}`, 110, yPos);
        yPos += 15;
        
        // Assessment details 
        doc.setFontSize(11);
        doc.setTextColor(44, 62, 80);
        doc.setFont(undefined, 'bold');
        doc.text("Assessment Date:", 25, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(latestBedsoreAssessment.timestamp.toLocaleDateString(), 110, yPos);
        yPos += 8;
        
        // Show assessment factors if available
        if (latestBedsoreAssessment.factors) {
          doc.setFont(undefined, 'bold');
          doc.text("Risk Factors:", 25, yPos);
          yPos += 7;
          
          doc.setFont(undefined, 'normal');
          const factors = latestBedsoreAssessment.factors;
          Object.keys(factors).forEach(factor => {
            doc.text(`• ${factor}: ${factors[factor]}`, 30, yPos);
            yPos += 6;
          });
        }
      } else {
        // No bedsore assessment data
        doc.setFont(undefined, 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text("No bedsore risk assessment data available.", 25, yPos);
        yPos += 8;
      }
      
      // Draw a line to separate sections
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
  
      // ====== BEDSORE PREVENTION PLAN SECTION ======
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Bedsore Prevention Plan", 20, yPos);
      yPos += 10;
  
      // Prevention recommendations using direct text
      doc.setFontSize(11);
      
      const drawRecommendation = (category, details, y) => {
        // Draw the category
        doc.setFont(undefined, 'bold');
        doc.setTextColor(46, 204, 113);
        doc.text(category + ":", 25, y);
        y += 5;
        
        // Draw the details with bullet points
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        
        const maxWidth = 160;
        const splitDetails = doc.splitTextToSize(details, maxWidth);
        
        doc.text(splitDetails, 30, y);
        return y + (splitDetails.length * 5) + 3;
      };
  
      // Determine risk level for recommendations
      let riskLevel = "low";
      if (hasBedsoreData) {
        const riskScore = latestBedsoreAssessment.riskScore;
        if (riskScore >= 60) {
          riskLevel = "high";
        } else if (riskScore >= 30) {
          riskLevel = "moderate";
        }
      }
  
      // Repositioning recommendations based on risk level
      let repositionRec = "";
      if (riskLevel === "high") {
        repositionRec = "• Change position every 2 hours while in bed • Use 30-degree tilt position • Document position changes • Use pillows to float heels • Limit head of bed elevation to 30 degrees or less";
      } else if (riskLevel === "moderate") {
        repositionRec = "• Change position every 4 hours • Use proper positioning techniques • Document each reposition • Use pressure-reducing devices • Adjust position if redness appears";
      } else {
        repositionRec = "• Encourage position changes every 6 hours • Teach independent position changes • Monitor for pressure points • Regular activity as tolerated";
      }
      yPos = drawRecommendation("Repositioning Schedule", repositionRec, yPos);
      
      // Skin care recommendations
      let skinRec = "";
      if (riskLevel === "high") {
        skinRec = "• Inspect skin at each position change • Clean immediately after soiling • Use pH-balanced cleanser • Apply moisturizer to dry skin • Protect skin from excess moisture with barrier cream";
      } else {
        skinRec = "• Daily skin inspection • Clean and dry skin promptly when soiled • Use mild cleansers • Apply moisturizers to dry skin • Avoid massage over bony prominences";
      }
      yPos = drawRecommendation("Skin Care Protocol", skinRec, yPos);
      
      // Support surface recommendations
      let surfaceRec = "";
      if (riskLevel === "high") {
        surfaceRec = "• Use pressure-redistributing mattress or overlay • Consider air-fluidized bed for existing ulcers • Use pressure-reducing cushion when seated • Avoid donut-type devices • Limit time in seated position";
      } else if (riskLevel === "moderate") {
        surfaceRec = "• Use pressure-reducing mattress or overlay • Foam wedges for 30-degree positioning • Pressure-reducing seat cushion • Elevate heels off bed surface • Avoid direct contact with hard surfaces";
      } else {
        surfaceRec = "• Standard hospital mattress with regular repositioning • Consider foam overlay if mobility decreases • Use proper seat cushion when in chair • Avoid prolonged sitting";
      }
      yPos = drawRecommendation("Support Surfaces", surfaceRec, yPos);
      
      // Nutrition recommendations
      yPos = drawRecommendation("Nutrition & Hydration", 
        "• Ensure adequate protein intake (1.2-1.5g/kg/day) • Maintain hydration (30-35mL/kg/day) • Consider supplements if intake inadequate • Monitor weight weekly • Consult dietitian for comprehensive plan", yPos);
  
      // ====== PROGRESS NOTES ON NEW PAGE ======
      // Always start progress notes on a new page
      doc.addPage();
      yPos = 20;
  
      // Progress Notes section
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Progress Notes", 20, yPos);
      yPos += 10;
  
      // Add note-taking section
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Date: ___________________", 25, yPos);
      doc.text("Provider: ___________________", 110, yPos);
      yPos += 10;
  
      // Draw lines for notes - make more room for notes
      doc.setDrawColor(200, 200, 200);
      for (let i = 0; i < 25; i++) {
        doc.line(25, yPos + (i * 8), 185, yPos + (i * 8));
      }
      yPos += 210;
  
      // ====== HEALTHCARE PROVIDER SECTION ======
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("Healthcare Provider Information", 20, yPos);
      yPos += 8;
  
      doc.setFontSize(10);
      doc.text("Provider Name: ___________________", 25, yPos);
      doc.text("Signature: ___________________", 120, yPos);
      yPos += 8;
  
      doc.text("Next Assessment Due: ___________________", 25, yPos);
      doc.text("Date: ___________________", 120, yPos);
      yPos += 12;
  
      // Footer for all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        
        // Patient identifier
        const patientName = patientInfo.fullName || patientInfo.name || "Patient";
        doc.text(
          `Patient: ${patientName}    ID: ${patientInfo.id || "N/A"}`,
          105,
          280,
          { align: "center" }
        );
        
        // Disclaimer
        doc.text(
          "This report is for informational purposes and does not replace professional medical advice.",
          105,
          285,
          { align: "center" }
        );
        
        // Page numbers
        doc.text(`Page ${i} of ${pageCount}`, 105, 292, { align: "center" });
      }
  
      // Save PDF
      doc.save(`bedsore_prevention_report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Log success message
      console.log("Bedsore prevention report generated successfully!");
      alert("Bedsore prevention report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Error: " + error.message);
    }
  };
  
  // Helper function to assess nutrition status for bedsore risk
  const assessNutritionForBedsoreRisk = (nutritionStatus) => {
    if (!nutritionStatus) return "Unable to assess";
    
    const status = nutritionStatus.toLowerCase();
    if (status.includes("poor") || status.includes("inadequate") || status.includes("malnutrition")) {
      return "High risk factor - requires nutritional intervention";
    } else if (status.includes("fair") || status.includes("moderate")) {
      return "Moderate risk factor - monitor intake";
    }
    return "Low risk factor - maintain current nutrition";
  };
  
  // Helper function to assess incontinence for bedsore risk
  const assessIncontinenceForBedsoreRisk = (incontinenceStatus) => {
    if (!incontinenceStatus) return "Unable to assess";
    
    const status = incontinenceStatus.toLowerCase();
    if (status.includes("double") || status.includes("both") || status.includes("fecal")) {
      return "High risk factor - requires intensive skin protection";
    } else if (status.includes("urinary") || status.includes("occasional")) {
      return "Moderate risk factor - needs prompt care after episodes";
    }
    return "Low risk factor - continue monitoring";
  };

  // Clinical assessment helper functions
  const getBmiCategory = (bmi) => {
    bmi = parseFloat(bmi);
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    if (bmi < 35) return "Class I Obesity";
    if (bmi < 40) return "Class II Obesity";
    return "Class III Obesity";
  };

  const getWeightStatus = (weight, height) => {
    if (!weight || !height) return "Unable to assess";
    
    const bmi = parseFloat(weight) / Math.pow(parseFloat(height)/100, 2);
    return getBmiCategory(bmi);
  };

  const assessBloodPressure = (bpString) => {
    if (!bpString) return "Not available";
    
    const [systolic, diastolic] = bpString.split('/').map(Number);
    
    if (systolic >= 180 || diastolic >= 120) return "Hypertensive Crisis (Immediate medical attention)";
    if (systolic >= 140 || diastolic >= 90) return "Stage 2 Hypertension";
    if (systolic >= 130 || diastolic >= 80) return "Stage 1 Hypertension";
    if (systolic >= 120 || diastolic >= 80) return "Elevated";
    if (systolic < 90 || diastolic < 60) return "Hypotension";
    return "Normal";
  };

  const assessHeartRate = (rate) => {
    rate = parseFloat(rate);
    if (isNaN(rate)) return "Not available";
    
    if (rate < 50) return "Bradycardia (below normal)";
    if (rate > 100) return "Tachycardia (above normal)";
    return "Normal sinus rhythm";
  };

  const assessRespiratoryRate = (rate) => {
    rate = parseFloat(rate);
    if (isNaN(rate)) return "Not available";
    
    if (rate < 12) return "Bradypnea (below normal)";
    if (rate > 20) return "Tachypnea (above normal)";
    return "Normal respiratory rate";
  };

  const assessBodyTemperature = (temp) => {
    temp = parseFloat(temp);
    if (isNaN(temp)) return "Not available";
    
    if (temp < 36.0) return "Hypothermia";
    if (temp > 37.8) return "Fever";
    return "Normal temperature";
  };

  const assessOxygenSaturation = (o2sat) => {
    o2sat = parseFloat(o2sat);
    if (isNaN(o2sat)) return "Not available";
    
    if (o2sat < 90) return "Severe hypoxemia (requires immediate attention)";
    if (o2sat < 94) return "Moderate hypoxemia";
    return "Normal oxygen saturation";
  };

  const assessGlucose = (glucose) => {
    glucose = parseFloat(glucose);
    if (isNaN(glucose)) return "Not available";
    
    if (glucose < 3.9) return "Hypoglycemia";
    if (glucose > 7.8) return "Hyperglycemia";
    return "Normal blood glucose";
  };

  const assessPain = (pain) => {
    if (!pain) return "Not assessed";
    
    const level = parseInt(pain.split('/')[0]);
    if (isNaN(level)) return "Not assessed";
    
    if (level >= 7) return "Severe pain - requires intervention";
    if (level >= 4) return "Moderate pain - consider treatment";
    return "Mild pain - monitor";
  };

  const assessBedsoreRisk = (score) => {
    score = parseFloat(score);
    if (isNaN(score)) return "Not available";
    
    if (score >= 60) return "High risk - intensive prevention protocol required";
    if (score >= 30) return "Moderate risk - standard prevention measures";
    return "Low risk - routine prevention";
  };

  if (loading) {
    return <div className="loading">Loading health data...</div>;
  }

  return (
    <div className="health-progress-tracker">
      <div className="progress-header">
        <div className="controls">
          <div className="time-range-selector">
            <label>Time Period: </label>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-select"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          <button 
            className="download-btn"
            onClick={generatePdfReport}
          >
            📄 Download Medical Report (PDF)
          </button>
        </div>
      </div>
      
      {chartData.length > 0 && (
        <div className="chart-legend">
          <h3>Health Metrics Visualization</h3>
          <p className="legend-description">View all your health metrics in one comprehensive graph</p>
        </div>
      )}
      
      <div className="chart-container">
        {chartData.length > 0 ? (
          <div>
            <div className="chart-info">
              <span className="chart-info-icon">ℹ️</span>
              <span className="chart-info-text">Hover for details • Scroll to zoom • Drag to pan</span>
            </div>
            <div className="chart-canvas-container">
              <canvas ref={chartRef} height="300" width="1370"></canvas>
            </div>
          </div>
        ) : (
          <div className="no-data">
            <p>No health data available for the selected time period</p>
            <p>Complete health assessments to track your progress</p>
          </div>
        )}
      </div>
      
      {chartData.length > 0 && (
        <div className="historical-analysis">
          <h3>Historical Data Analysis</h3>
          
          <div className="historical-controls">
            <p>Compare today's health metrics with: </p>
            <select 
              value={historicalPeriod} 
              onChange={(e) => setHistoricalPeriod(e.target.value)}
              className="history-select"
            >
              <option value="week">Past Week Average</option>
              <option value="month">Past Month Average</option>
            </select>
          </div>
          
          {calculateHistoricalComparison() ? (
            <div className="historical-comparison">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Current</th>
                    <th>{calculateHistoricalComparison().periodLabel} Avg</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateHistoricalComparison().current.weight && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">⚖️</span>
                        Weight
                      </td>
                      <td>{calculateHistoricalComparison().current.weight} kg</td>
                      <td>{calculateHistoricalComparison().historical.weight?.toFixed(1) || '--'} kg</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.weight)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.systolic && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">❤️</span>
                        Systolic BP
                      </td>
                      <td>{calculateHistoricalComparison().current.systolic} mmHg</td>
                      <td>{calculateHistoricalComparison().historical.systolic?.toFixed(1) || '--'} mmHg</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.systolic)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.diastolic && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">❤️</span>
                        Diastolic BP
                      </td>
                      <td>{calculateHistoricalComparison().current.diastolic} mmHg</td>
                      <td>{calculateHistoricalComparison().historical.diastolic?.toFixed(1) || '--'} mmHg</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.diastolic)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.bedsoreRisk && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">🛡️</span>
                        Bedsore Risk
                      </td>
                      <td>{calculateHistoricalComparison().current.bedsoreRisk}/100</td>
                      <td>{calculateHistoricalComparison().historical.bedsoreRisk?.toFixed(1) || '--'}/100</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.bedsoreRisk)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.heartRate && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">💓</span>
                        Heart Rate
                      </td>
                      <td>{calculateHistoricalComparison().current.heartRate} bpm</td>
                      <td>{calculateHistoricalComparison().historical.heartRate?.toFixed(1) || '--'} bpm</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.heartRate)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.pressure && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">🌡️</span>
                        Pressure
                      </td>
                      <td>{calculateHistoricalComparison().current.pressure} hPa</td>
                      <td>{calculateHistoricalComparison().historical.pressure?.toFixed(1) || '--'} hPa</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.pressure)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.temperature && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">🌡️</span>
                        Temperature
                      </td>
                      <td>{calculateHistoricalComparison().current.temperature} °C</td>
                      <td>{calculateHistoricalComparison().historical.temperature?.toFixed(1) || '--'} °C</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.temperature)}</td>
                    </tr>
                  )}
                  
                  {calculateHistoricalComparison().current.humidity && (
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">💧</span>
                        Humidity
                      </td>
                      <td>{calculateHistoricalComparison().current.humidity} %</td>
                      <td>{calculateHistoricalComparison().historical.humidity?.toFixed(1) || '--'} %</td>
                      <td>{formatChange(calculateHistoricalComparison().changes.humidity)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              <div className="comparison-note">
                <p><strong>Note:</strong> <span className="positive-change">Green</span> indicates positive health trends, <span className="negative-change">red</span> indicates metrics that may need attention.</p>
              </div>
            </div>
          ) : (
            <div className="no-historical-data">
              <p>Not enough historical data to make comparisons.</p>
              <p>More data points will be needed to show trends over time.</p>
            </div>
          )}
        </div>
      )}
      
      {chartData.length > 0 && (
        <div className="metric-toggles">
          <h3>Customize Chart</h3>
          <div className="toggle-container">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={activeMetrics.heartRate} 
                onChange={() => toggleMetric('heartRate')} 
              />
              Show Heart Rate
            </label>
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={activeMetrics.pressure} 
                onChange={() => toggleMetric('pressure')} 
              />
              Show Pressure
            </label>
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={activeMetrics.temperature} 
                onChange={() => toggleMetric('temperature')} 
              />
              Show Temperature
            </label>
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={activeMetrics.humidity} 
                onChange={() => toggleMetric('humidity')} 
              />
              Show Humidity
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthProgressTracker;