// LoginPage.js
import React, { useState } from 'react';
import PatientLogin from '../components/PatientLogin';
import DoctorLogin from '../components/DoctorLogin';
import styles from '../styles';

const LoginPage = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('patient');

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <h1>Healthcare Portal</h1>
        </div>
        <div style={styles.tabs}>
          <div
            style={{
              ...styles.tab,
              ...(activeTab === 'patient' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('patient')}
          >
            Patient Login
          </div>
          <div
            style={{
              ...styles.tab,
              ...(activeTab === 'doctor' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('doctor')}
          >
            Doctor Login
          </div>
        </div>
        <div style={styles.formContainer}>
          {activeTab === 'patient' ? 
            <PatientLogin onLogin={onLogin} /> : 
            <DoctorLogin onLogin={onLogin} />
          }
        </div>
      </div>
    </div>
  );
};

export default LoginPage;