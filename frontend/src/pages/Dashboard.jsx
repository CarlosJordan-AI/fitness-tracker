import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { API_URL, getProgressSummary } from '../lib/api';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [filter, setFilter] = useState('all'); // 'all' or 'my'
  const navigate = useNavigate();
  const currentUser = pb.authStore.model;

  useEffect(() => {
    if (!pb.authStore.isValid) {
      navigate('/login');
      return;
    }
    fetchGoals();
  }, [navigate]);

  useEffect(() => {
    if (filter === 'my') {
      setFilteredGoals(goals.filter(g => g.user_id === currentUser.id));
    } else {
      setFilteredGoals(goals);
    }
  }, [filter, goals, currentUser.id]);

  const fetchGoals = async () => {
    try {
      // Get goals with expanded user data
      const res = await fetch(`${API_URL}/goals/?expand=user_id`, {
        headers: {
          'Authorization': pb.authStore.token
        }
      });
      const data = await res.json();
      const items = data.items || [];
      setGoals(items);
      setFilteredGoals(items);
      
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

  const getMetricHints = (cat) => {
    if (cat === 'weight_loss') return 'kg/lb';
    if (cat === 'muscle_gain') return 'kg/lb';
    if (cat === 'endurance') return 'km/miles';
    if (cat === 'flexibility') return 'cm/inches';
    return 'measurements';
  };

  const pageStyle = { fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', padding: '0 20px' };
  const filterBarStyle = { marginBottom: '20px', display: 'flex', gap: '10px' };
  const filterBtnStyle = (active) => ({
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #007BFF',
    background: active ? '#007BFF' : 'white',
    color: active ? 'white' : '#007BFF',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  });
  
  const cardStyle = (isMine) => ({
    padding: '15px',
    margin: '15px 0',
    border: isMine ? '2px solid #007BFF' : '1px solid #ccc',
    borderRadius: '12px',
    boxShadow: isMine ? '0 4px 8px rgba(0,123,255,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    background: 'white',
    transition: 'transform 0.2s',
    ':hover': { transform: 'translateY(-2px)' }
  });

  const btnStyle = { padding: '10px 15px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ background: '#f4f7f6', minHeight: '100vh', paddingBottom: '40px' }}>
      <Navbar />
      
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Community Goals</h2>
          <button style={btnStyle} onClick={() => navigate('/goals/new')}>+ Create Goal</button>
        </div>

        <div style={filterBarStyle}>
          <button style={filterBtnStyle(filter === 'all')} onClick={() => setFilter('all')}>All Goals</button>
          <button style={filterBtnStyle(filter === 'my')} onClick={() => setFilter('my')}>My Goals</button>
        </div>
        
        <div>
          {filteredGoals.map(goal => {
            const isMine = goal.user_id === currentUser.id;
            const sum = summaries[goal.id];
            const pct = sum ? Math.round(sum.progress_percent) : 0;
            let barColor = '#dc3545'; // red
            if (pct >= 50) barColor = '#28a745'; // green
            else if (pct >= 25) barColor = '#ffc107'; // yellow

            // Get owner name
            const owner = goal.expand?.user_id?.username || goal.expand?.user_id?.email || 'Anonymous';

            return (
              <div key={goal.id} style={cardStyle(isMine)} onClick={() => navigate(`/goals/${goal.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>{goal.title}</h3>
                    <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 'bold', color: isMine ? '#007BFF' : '#555' }}>
                        {isMine ? 'You' : owner}
                      </span>
                      {goal.category && (
                        <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                          {goal.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: goal.is_active ? '#28a745' : '#777', fontWeight: 'bold', fontSize: '12px' }}>
                      {goal.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </div>
                </div>
                
                {sum ? (
                  <div style={{ marginTop: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9em', marginBottom: '8px' }}>
                      {sum.primary_logs_count > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '500' }}>{sum.first_value}{sum.primary_unit} &rarr; {sum.latest_value}{sum.primary_unit}</span>
                          <span style={{ 
                            color: (goal.category === 'weight_loss' ? (sum.total_change <= 0 ? '#28a745' : '#dc3545') : (sum.total_change >= 0 ? '#28a745' : '#dc3545')),
                            fontWeight: 'bold',
                            fontSize: '13px'
                          }}>
                            ({sum.total_change > 0 ? '+' : ''}{sum.total_change.toFixed(1)}{sum.primary_unit})
                          </span>
                        </div>
                      ) : (
                        <em style={{color: '#999', fontSize: '13px'}}>Needs [{getMetricHints(goal.category)}] logs</em>
                      )}
                      <span style={{ fontWeight: 'bold', color: '#333' }}>{pct}%</span>
                    </div>
                    <div style={{ background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.6s ease' }}></div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                       {sum.primary_logs_count} log entries
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85em', color: '#999', marginTop: '10px' }}>Analyzing progress...</div>
                )}
              </div>
            );
          })}
          {filteredGoals.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#777' }}>
              {filter === 'my' ? "You haven't created any goals yet." : "No goals found in the community."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
