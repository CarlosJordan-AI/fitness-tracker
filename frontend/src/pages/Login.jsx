import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
        });
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('users').authWithPassword(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const containerStyle = { maxWidth: '400px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
  const inputStyle = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
  const buttonStyle = { width: '100%', padding: '10px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' };
  const toggleStyle = { marginTop: '10px', color: '#007BFF', cursor: 'pointer', textAlign: 'center', display: 'block' };

  return (
    <div style={containerStyle}>
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" style={buttonStyle}>{isRegister ? 'Sign Up' : 'Sign In'}</button>
      </form>
      <span style={toggleStyle} onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
      </span>
    </div>
  );
}
