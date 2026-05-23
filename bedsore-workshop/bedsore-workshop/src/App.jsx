// Update App.jsx to use the new monitoring service
import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import messageService from './utils/MessageService';
import monitoringService from './utils/MonitoringService'; // Import the monitoring service
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    smsEnabled: true,
    emergencyOnly: false,
    alertHours: 'allday'
  });
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    // Check for saved login
    const savedUser = localStorage.getItem('currentUser');
    const savedType = localStorage.getItem('userType');
    
    if (savedUser && savedType) {
      setCurrentUser(savedUser);
      setUserType(savedType);
    }
    
    setIsLoading(false);

    // Initialize message service
    initializeNotifications();
    
    // Start the automatic monitoring service
    startAutomaticMonitoring();
    
    // Clean up when component unmounts
    return () => {
      if (monitoringActive) {
        monitoringService.stop();
      }
    };
  }, []);

  const startAutomaticMonitoring = () => {
    console.log('Starting automatic risk monitoring and SMS notifications...');
    
    // Initialize the monitoring service
    monitoringService.initialize();
    setMonitoringActive(true);
    
    // Log confirmation
    console.log('Automatic monitoring system active - SMS notifications will be sent automatically when patients have high risk');
  };

  const initializeNotifications = () => {
    const smsEnabled = true;
    const isDevelopment = false; // Force disable development mode
    messageService.updateConfig({
      isSmsEnabled: smsEnabled,
      isDevelopment: isDevelopment
    });
  };

  const handleLogin = (userId, type) => {
    setCurrentUser(userId);
    setUserType(type);
    localStorage.setItem('currentUser', userId);
    localStorage.setItem('userType', type);
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    setUserType(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userType');
  };
  
  const updateNotificationSettings = (settings) => {
    setNotificationSettings(prev => ({ ...prev, ...settings }));
    console.log('Updated notification settings:', settings);
  };

  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      {userType === 'doctor' ? (
        <DoctorDashboard 
          userId={currentUser} 
          onLogout={handleLogout}
          notificationSettings={notificationSettings}
          onUpdateSettings={updateNotificationSettings} 
        />
      ) : userType === 'patient' ? (
        <PatientDashboard 
          userId={currentUser} 
          onLogout={handleLogout} 
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
      
      {/* Add monitoring status indicator (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: '10px', 
          left: '10px', 
          background: monitoringActive ? '#4CAF50' : '#f44336',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          {monitoringActive ? 'Automatic Monitoring Active' : 'Monitoring Inactive'}
        </div>
      )}
    </div>
  );
}

export default App;