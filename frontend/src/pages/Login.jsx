import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isRegister) {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        
        await pb.collection('users').create({
          email,
          username,
          password,
          passwordConfirm: password,
        });
        
        // Auto-login after registration
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('users').authWithPassword(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      // Clean up error message for display
      let msg = err.message;
      if (err.data?.data?.email?.code === 'validation_invalid_email') msg = 'Invalid email address';
      if (err.data?.data?.email?.code === 'validation_not_unique') msg = 'Email already exists';
      if (err.data?.data?.username?.code === 'validation_not_unique') msg = 'Username taken';
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = { 
    maxWidth: '400px', 
    margin: '60px auto', 
    padding: '30px', 
    fontFamily: 'sans-serif', 
    border: '1px solid #ddd', 
    borderRadius: '12px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    background: 'white'
  };
  const inputStyle = { 
    width: '100%', 
    padding: '12px', 
    margin: '10px 0', 
    borderRadius: '6px', 
    border: '1px solid #ccc', 
    boxSizing: 'border-box',
    fontSize: '16px'
  };
  const buttonStyle = { 
    width: '100%', 
    padding: '12px', 
    background: '#007BFF', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: loading ? 'not-allowed' : 'pointer', 
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px',
    opacity: loading ? 0.7 : 1
  };
  const toggleStyle = { 
    marginTop: '20px', 
    color: '#007BFF', 
    cursor: 'pointer', 
    textAlign: 'center', 
    display: 'block',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{isRegister ? 'Join FitTrack' : 'Welcome Back'}</h2>
      
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <input 
          style={inputStyle} 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
        />
        
        {isRegister && (
          <input 
            style={inputStyle} 
            type="text" 
            placeholder="Username (optional)" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
          />
        )}
        
        <input 
          style={inputStyle} 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        
        {isRegister && (
          <p style={{ fontSize: '12px', color: '#666', marginTop: '-5px', marginLeft: '2px' }}>
            Password must be at least 8 characters
          </p>
        )}
        
        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
        </button>
      </form>
      
      <span style={toggleStyle} onClick={() => { setIsRegister(!isRegister); setError(null); }}>
        {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
      </span>
    </div>
  );
}
