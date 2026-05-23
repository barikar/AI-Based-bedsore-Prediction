// DoctorLogin.js
import React, { useState } from 'react';
import { ref, get, set, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../firebase';
import styles from '../styles';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const DoctorLogin = ({ onLogin }) => {
  const [doctorId, setDoctorId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isRegistering) {
        // Check if doctor ID or phone number already exists
        const usersRef = ref(database, 'users');
        const phoneQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));
        const phoneSnapshot = await get(phoneQuery);
        
        if (phoneSnapshot.exists()) {
          setError('Phone number already registered');
          return;
        }
        
        // Check if doctor ID already exists
        const doctorQuery = query(usersRef, orderByChild('doctorId'), equalTo(doctorId));
        const doctorSnapshot = await get(doctorQuery);
        
        if (doctorSnapshot.exists()) {
          setError('Doctor ID already registered');
          return;
        }
        
        // Generate a unique ID for the user
        const userId = uuidv4();
        
        // Store user data in Realtime Database
        await set(ref(database, `users/${userId}`), {
          doctorId: doctorId,
          phoneNumber: phoneNumber,
          email: email || null,
          password: password, // In a real app, you should hash this password
          userType: 'doctor',
          createdAt: new Date().toISOString()
        });
        
        alert('Registration successful! You can now login.');
        setIsRegistering(false);
      } else {
        // Query the database to find a user with this phone number
        const usersRef = ref(database, 'users');
        const phoneQuery = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));
        const snapshot = await get(phoneQuery);
        
        if (!snapshot.exists()) {
          setError('User not found');
          return;
        }
        
        // Check credentials
        let userId = null;
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (
            userData.password === password && 
            userData.userType === 'doctor' && 
            userData.doctorId === doctorId
          ) {
            userId = childSnapshot.key;
          }
        });
        
        if (userId) {
          // Call the onLogin function from props to navigate to dashboard
          onLogin(userId, 'doctor');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (error) {
      setError(error.message);
      console.error('Database error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Doctor ID</label>
        <input
          style={styles.input}
          type="text"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          placeholder="Enter your doctor ID"
          required
        />
      </div>
      {isRegistering && (
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email (optional)</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email (optional)"
          />
        </div>
      )}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Phone Number</label>
        <input
          style={styles.input}
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter your phone number"
          required
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.forgotPassword}>
        <a style={styles.link}>Forgot Password?</a>
      </div>
      <button style={styles.loginButton} type="submit">
        {isRegistering ? 'Register' : 'Login'}
      </button>
      <button 
        style={styles.registerButton} 
        type="button" 
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering ? 'Back to Login' : 'Register as Doctor'}
      </button>
    </form>
  );
};

export default DoctorLogin;