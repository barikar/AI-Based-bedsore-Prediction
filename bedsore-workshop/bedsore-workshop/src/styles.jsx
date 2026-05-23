// styles.js
const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f4f8',
      fontFamily: 'Arial, sans-serif'
    },
    loginCard: {
      width: '400px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      overflow: 'hidden'
    },
    header: {
      backgroundColor: '#4a90e2',
      color: 'white',
      padding: '20px',
      textAlign: 'center'
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #e0e0e0'
    },
    tab: {
      flex: 1,
      padding: '15px',
      textAlign: 'center',
      cursor: 'pointer',
      backgroundColor: '#f5f5f5',
      transition: 'background-color 0.3s'
    },
    activeTab: {
      backgroundColor: 'white',
      borderBottom: '3px solid #4a90e2',
      fontWeight: 'bold'
    },
    formContainer: {
      padding: '20px'
    },
    inputGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    loginButton: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#4a90e2',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
      marginBottom: '10px'
    },
    registerButton: {
      width: '100%',
      padding: '12px',
      backgroundColor: 'transparent',
      color: '#4a90e2',
      border: '1px solid #4a90e2',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    forgotPassword: {
      textAlign: 'center',
      margin: '15px 0',
      fontSize: '14px'
    },
    link: {
      color: '#4a90e2',
      textDecoration: 'none',
      cursor: 'pointer'
    },
    error: {
      color: 'red',
      marginBottom: '10px',
      fontSize: '14px'
    }
  };
  
  export default styles;