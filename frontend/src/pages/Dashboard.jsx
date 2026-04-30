import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { getGoals } from '../lib/api';

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pb.authStore.isValid) {
      navigate('/login');
      return;
    }
    fetchGoals();
  }, [navigate]);

  const fetchGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const pageStyle = { fontFamily: 'sans-serif', maxWidth: '800px', margin: '40px auto', padding: '0 20px' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { padding: '15px', margin: '15px 0', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
  const btnStyle = { padding: '10px 15px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', border: 'none', cursor: 'pointer' };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h2>Fitness Goals Dashboard</h2>
        <div>
          <button style={{...btnStyle, marginRight: '10px'}} onClick={() => navigate('/goals/new')}>+ New Goal</button>
          <button style={{...btnStyle, background: '#dc3545'}} onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      <div>
        {goals.map(goal => (
          <div key={goal.id} style={cardStyle} onClick={() => navigate(`/goals/${goal.id}`)}>
            <div>
              <h3 style={{ margin: '0 0 5px 0' }}>{goal.title}</h3>
              <p style={{ margin: 0, color: '#555' }}>User: {goal.expand?.user_id?.email || goal.user_id}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', marginRight: '10px' }}>{goal.category}</span>
              <span style={{ color: goal.is_active ? 'green' : 'gray', fontWeight: 'bold' }}>{goal.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
        {goals.length === 0 && <p>No goals found. Create one!</p>}
      </div>
    </div>
  );
}
