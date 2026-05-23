import React, { useState, useEffect } from 'react';

const SimplifiedHealthForm = ({ onSubmit, userId }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    fullName: '',
    phoneNumber: '',
    age: '',
    
    // Health Information
    height: '',
    weight: '',
    weightStatus: '', // Will be calculated based on BMI
    bloodPressure: '',
    
    // Medical History
    hasDiabetes: 'no',
    diabetesType: '',
    surgeryHistory: 'no',
    surgeryDetails: '',
    existingConditions: [],
    additionalIssues: '',
    
    // Document Upload
    documents: []
  });
  
  const [existingConditionsOptions] = useState([
    'Diabetes', 'Hypertension', 'Heart Disease', 
    'Kidney Disease', 'Malnutrition', 'Neurological Disorder',
    'Circulatory Problems', 'Peripheral Vascular Disease'
  ]);

  // Calculate BMI and weight status whenever height or weight changes
  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightInMeters = formData.height / 100;
      const bmi = formData.weight / (heightInMeters * heightInMeters);
      
      let weightStatus = '';
      if (bmi < 18.5) {
        weightStatus = 'Below Normal Weight';
      } else if (bmi >= 18.5 && bmi < 25) {
        weightStatus = 'Normal Weight';
      } else if (bmi >= 25 && bmi < 30) {
        weightStatus = 'Above Normal Weight (Overweight)';
      } else {
        weightStatus = 'Obese';
      }
      
      setFormData(prev => ({ ...prev, weightStatus }));
    }
  }, [formData.height, formData.weight]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return { ...prev, [name]: [...prev[name], value] };
      } else {
        return { ...prev, [name]: prev[name].filter(item => item !== value) };
      }
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="health-form">
      <div className="form-section">
        <h3>Personal Information</h3>
        
        <div className="input-group">
          <label>Full Name</label>
          <input 
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="input-group">
          <label>Phone Number</label>
          <input 
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="input-group">
          <label>Age</label>
          <input 
            type="number"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      
      <div className="form-section">
        <h3>Health Information</h3>
        
        <div className="input-group">
          <label>Height (cm)</label>
          <input 
            type="number"
            name="height"
            value={formData.height}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="input-group">
          <label>Weight (kg)</label>
          <input 
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            required
          />
        </div>
        
        {/* {formData.weightStatus && (
          <div className="status-display">
            <label>Weight Status</label>
            <div className={`status-value ${formData.weightStatus.includes('Normal') ? 'normal' : 'attention'}`}>
              {formData.weightStatus}
            </div>
          </div>
        )} */}
        
        <div className="input-group">
          <label>Blood Pressure (mmHg, e.g., 120/80)</label>
          <input 
            type="text"
            name="bloodPressure"
            value={formData.bloodPressure}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      
      <div className="form-section">
        <h3>Medical History</h3>
        
        <div className="input-group">
          <label>Do you have diabetes?</label>
          <select 
            name="hasDiabetes"
            value={formData.hasDiabetes}
            onChange={handleInputChange}
            required
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
            <option value="unknown">Unknown/Not tested</option>
          </select>
        </div>
        
        {formData.hasDiabetes === 'yes' && (
          <div className="input-group">
            <label>Type of Diabetes</label>
            <select 
              name="diabetesType"
              value={formData.diabetesType}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Type</option>
              <option value="type1">Type 1</option>
              <option value="type2">Type 2</option>
              <option value="gestational">Gestational</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        
        <div className="input-group">
          <label>Have you had any surgeries?</label>
          <select 
            name="surgeryHistory"
            value={formData.surgeryHistory}
            onChange={handleInputChange}
            required
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        
        {formData.surgeryHistory === 'yes' && (
          <div className="input-group">
            <label>Surgery Details</label>
            <textarea 
              name="surgeryDetails"
              value={formData.surgeryDetails}
              onChange={handleInputChange}
              placeholder="Please list recent surgeries with dates"
              required
            />
          </div>
        )}
        
        <div className="checkbox-group">
          <label>Existing Medical Conditions (select all that apply)</label>
          {existingConditionsOptions.map(condition => (
            <label key={condition} className="checkbox-label">
              <input
                type="checkbox"
                name="existingConditions"
                value={condition}
                checked={formData.existingConditions.includes(condition)}
                onChange={handleCheckboxChange}
              />
              {condition}
            </label>
          ))}
        </div>
        
        <div className="input-group">
          <label>Additional Health Issues</label>
          <select 
            name="additionalIssues"
            value={formData.additionalIssues}
            onChange={handleInputChange}
          >
            <option value="">Select if applicable</option>
            <option value="breathing">Breathing Problems</option>
            <option value="digestion">Digestive Issues</option>
            <option value="chronic_pain">Chronic Pain</option>
            <option value="mobility">Mobility Issues</option>
            <option value="vision">Vision Problems</option>
            <option value="hearing">Hearing Problems</option>
            <option value="sleep">Sleep Disorders</option>
            <option value="allergies">Severe Allergies</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Document Upload</h3>
        <div className="file-upload">
          <label>Upload Medical Documents</label>
          <input 
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </div>
        
        {formData.documents.length > 0 && (
          <div className="uploaded-files">
            <h4>Uploaded Documents</h4>
            <ul>
              {formData.documents.map((file, index) => (
                <li key={index}>
                  {file.name}
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="remove-file-btn"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <button type="submit" className="submit-btn">Submit Health Information</button>
      
      {/* Basic CSS for form layout */}
      <style jsx>{`
        .health-form {
          max-width: 800px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
        }
        
        .form-section {
          margin-bottom: 30px;
          padding: 20px;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        
        .form-section h3 {
          margin-top: 0;
          color: #2c3e50;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        input[type="text"],
        input[type="tel"],
        input[type="number"],
        select,
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .checkbox-group {
          margin-bottom: 15px;
        }
        
        .checkbox-label {
          display: block;
          margin-bottom: 5px;
        }
        
        .checkbox-label input {
          margin-right: 8px;
        }
        
        .status-display {
          margin-bottom: 15px;
        }
        
        .status-value {
          padding: 8px;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .normal {
          background-color: #d4edda;
          color: #155724;
        }
        
        .attention {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .file-upload {
          margin-bottom: 15px;
        }
        
        .uploaded-files ul {
          list-style-type: none;
          padding: 0;
        }
        
        .uploaded-files li {
          padding: 8px;
          background: #eee;
          margin-bottom: 5px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .remove-file-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .submit-btn {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 12px 20px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
          margin-top: 20px;
        }
        
        .submit-btn:hover {
          background-color: #45a049;
        }
      `}</style>
    </form>
  );
};

export default SimplifiedHealthForm;