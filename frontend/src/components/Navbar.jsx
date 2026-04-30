import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pocketbase';

export default function Navbar() {
  const navigate = useNavigate();
  const user = pb.authStore.model;

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    background: '#007BFF',
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    marginRight: '20px',
    fontWeight: 'bold'
  };

  const logoutBtnStyle = {
    padding: '6px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  };

  return (
    <nav style={navStyle}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 style={{ margin: '0 30px 0 0' }}>FitTrack</h2>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      </div>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '20px', fontSize: '14px', opacity: 0.9 }}>
            {user.username || user.email}
          </span>
          <button style={logoutBtnStyle} onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
