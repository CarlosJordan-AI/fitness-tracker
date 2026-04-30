import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { getGoals, getProgressSummary } from '../lib/api';

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [summaries, setSummaries] = useState({});
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
      const items = data.items || [];
      setGoals(items);
      
      const sums = {};
      await Promise.all(items.map(async goal => {
        try {
          sums[goal.id] = await getProgressSummary(goal.id);
        } catch (err) {
          console.error(err);
        }
      }));
      setSummaries(sums);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const getMetricHints = (cat) => {
    if (cat === 'weight_loss') return 'kg/lb';
    if (cat === 'muscle_gain') return 'kg/lb';
    if (cat === 'endurance') return 'km/miles';
    if (cat === 'flexibility') return 'cm/inches';
    return 'measurements';
  };

  const pageStyle = { fontFamily: 'sans-serif', maxWidth: '800px', margin: '40px auto', padding: '0 20px' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { padding: '15px', margin: '15px 0', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', cursor: 'pointer' };
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
        {goals.map(goal => {
          const sum = summaries[goal.id];
          const pct = sum ? Math.round(sum.progress_percent) : 0;
          let barColor = '#dc3545'; // red
          if (pct >= 50) barColor = '#28a745'; // green
          else if (pct >= 25) barColor = '#ffc107'; // yellow

          return (
            <div key={goal.id} style={cardStyle} onClick={() => navigate(`/goals/${goal.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{goal.title}</h3>
                  <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>User: {goal.expand?.user_id?.email || goal.user_id}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', marginRight: '10px' }}>{goal.category}</span>
                  <span style={{ color: goal.is_active ? 'green' : 'gray', fontWeight: 'bold' }}>{goal.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              
              {sum ? (
                <div style={{ marginTop: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9em', marginBottom: '5px' }}>
                    {sum.primary_logs_count > 0 ? (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{sum.first_value} {sum.primary_unit} &rarr; {sum.latest_value} {sum.primary_unit}</span>
                        <span style={{ 
                          color: (goal.category === 'weight_loss' ? (sum.total_change <= 0 ? '#28a745' : '#dc3545') : (sum.total_change >= 0 ? '#28a745' : '#dc3545')),
                          fontWeight: 'bold',
                          background: (goal.category === 'weight_loss' ? (sum.total_change <= 0 ? '#e8f5e9' : '#ffebee') : (sum.total_change >= 0 ? '#e8f5e9' : '#ffebee')),
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {sum.total_change > 0 ? '+' : ''}{sum.total_change.toFixed(1)} {sum.primary_unit}
                        </span>
                      </div>
                    ) : (
                      <em style={{color: '#888'}}>Log your [{getMetricHints(goal.category)}] to track progress</em>
                    )}
                    <span style={{ fontWeight: 'bold' }}>{pct}%</span>
                  </div>
                  <div style={{ background: '#e9ecef', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '5px' }}>
                     {sum.primary_logs_count} primary / {sum.all_logs_count} total measurements logged
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.9em', color: '#888' }}>Loading progress...</div>
              )}
            </div>
          );
        })}
        {goals.length === 0 && <p>No goals found. Create one!</p>}
      </div>
    </div>
  );
}
