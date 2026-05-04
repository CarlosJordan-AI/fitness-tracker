import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { API_URL, getGoal, updateGoal, generatePlan, getProgress, logProgress, sendMessage, getChatHistory, getProgressSummary } from '../lib/api';
import Navbar from '../components/Navbar';

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [progressLogs, setProgressLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isMine, setIsMine] = useState(false);
  const currentUser = pb.authStore.model;
  
  // Progress Form
  const [val, setVal] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  
  // Chat
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      navigate('/login');
      return;
    }
    fetchGoalData();
  }, [id, navigate]);

  const fetchGoalData = async () => {
    try {
      // Fetch goal with expanded user info
      const res = await fetch(`${API_URL}/goals/${id}`, {
        headers: { 'Authorization': pb.authStore.token }
      });
      const g = await res.json();
      setGoal(g);
      
      const mine = g.user_id === currentUser.id;
      setIsMine(mine);

      const p = await getProgress(id);
      setProgressLogs(p.items || []);
      
      const ch = await getChatHistory(id);
      if (ch.items) {
        setChatHistory(ch.items.map(item => ({
          role: item.role,
          text: item.message
        })));
      }
      
      try {
        const sum = await getProgressSummary(id);
        setSummary(sum);
      } catch(err) {
        console.error(err);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePlan = async () => {
    if (!isMine) return;
    setLoadingPlan(true);
    try {
      const res = await generatePlan({
        user_id: currentUser.id,
        goal_id: id,
        goal_title: goal.title,
        category: goal.category,
        description: goal.description
      });
      if (res.plan) {
        await updateGoal(id, { ai_plan: res.plan });
        setGoal({ ...goal, ai_plan: res.plan });
      }
    } catch (e) {
      console.error(e);
      alert('Error generating plan');
    }
    setLoadingPlan(false);
  };

  const handleLogProgress = async (e) => {
    if (!isMine) return;
    e.preventDefault();
    try {
      await logProgress({ user_id: currentUser.id, goal_id: id, value: parseFloat(val), unit, note });
      setVal(''); setUnit(''); setNote('');
      const p = await getProgress(id);
      setProgressLogs(p.items || []);
      const sum = await getProgressSummary(id);
      setSummary(sum);
    } catch (e) {
      console.error(e);
      alert('Error logging progress');
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatMsg || !isMine) return;
    
    const userMsg = chatMsg;
    setChatMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await sendMessage({ user_id: currentUser.id, goal_id: id, message: userMsg });
      setChatHistory(prev => [...prev, { role: 'assistant', text: res.reply }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error resolving your request.' }]);
    }
    setIsChatLoading(false);
  };

  const renderEncouragement = (pct) => {
    if (pct > 75) return "Almost there!";
    if (pct > 50) return "Halfway there, keep going!";
    if (pct < 25) return "Just getting started, stay consistent!";
    return "Keep up the good work!";
  };

  const calculateTrend = (history) => {
    if (history.length < 2) return null;
    const latest = history[history.length - 1].value;
    const prev = history[history.length - 2].value;
    const diff = latest - prev;
    const direction = diff > 0 ? 'up' : 'down';
    const isGood = goal.category === 'weight_loss' ? diff < 0 : diff > 0;
    return { diff, direction, isGood };
  };

  const calculateAvgChangePerWeek = (history) => {
    if (history.length < 2) return 0;
    const first = history[0];
    const last = history[history.length - 1];
    const diffVal = last.value - first.value;
    const diffTime = (new Date(last.created) - new Date(first.created)) / (1000 * 60 * 60 * 24 * 7);
    return diffTime > 0 ? (diffVal / diffTime) : 0;
  };

  if (!goal) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading goal...</div>;

  const containerStyle = { maxWidth: '800px', margin: '0 auto', padding: '0 20px', paddingBottom: '40px', fontFamily: 'sans-serif' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #eee' };
  const btnStyle = { padding: '10px 16px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
  const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' };

  const trend = summary?.history ? calculateTrend(summary.history) : null;
  const avgWeek = summary?.history ? calculateAvgChangePerWeek(summary.history) : 0;
  const ownerName = goal.expand?.user_id?.username || goal.expand?.user_id?.email || 'Friend';

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar />
      
      <div style={containerStyle}>
        {!isMine && (
          <div style={{ background: '#e3f2fd', color: '#0d47a1', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #bbdefb' }}>
            <span>ℹ️</span> This is <strong>{ownerName}'s</strong> goal. You are in <strong>view-only mode</strong>.
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#333' }}>{goal.title}</h1>
              <span style={{ background: '#007BFF', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                {goal.category?.replace('_', ' ')}
              </span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '14px', color: '#666' }}>
              <div>Managed by <strong>{isMine ? 'You' : ownerName}</strong></div>
              <div style={{ marginTop: '5px' }}>{goal.is_active ? '✅ Active' : '⏸️ Inactive'}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <strong>Timeline:</strong><br/>
              <span style={{color: '#555'}}>{new Date(goal.start_date).toLocaleDateString()} to {new Date(goal.end_date).toLocaleDateString()}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <strong>Mission:</strong><br/>
              <p style={{ margin: '5px 0', color: '#555', lineHeight: '1.5' }}>{goal.description}</p>
            </div>
          </div>
          
          {summary && (
            <div style={{ marginTop: '25px', padding: '20px', background: '#f1f3f5', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Progress Journey</span>
                <span style={{ fontWeight: 'bold', color: '#007BFF' }}>{Math.round(summary.progress_percent)}%</span>
              </div>
              <div style={{ background: '#dee2e6', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ 
                  width: `${Math.round(summary.progress_percent)}%`, 
                  height: '100%', 
                  background: summary.progress_percent >= 50 ? '#28a745' : (summary.progress_percent >= 25 ? '#ffc107' : '#dc3545'),
                  transition: 'width 0.8s ease'
                }}></div>
              </div>
              <p style={{ margin: '10px 0 0 0', fontStyle: 'italic', color: '#495057', fontSize: '14px' }}>
                 "{renderEncouragement(summary.progress_percent)}"
              </p>
            </div>
          )}
        </div>

        {summary && summary.primary_logs_count > 0 && (
          <div style={cardStyle}>
            <h2 style={{marginTop: 0, fontSize: '20px'}}>Metric Insights ({summary.primary_unit})</h2>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Current Trend</div>
                {trend ? (
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: trend.isGood ? '#28a745' : '#dc3545' }}>
                    {trend.direction === 'up' ? '↑' : '↓'} Trending {trend.direction}
                  </div>
                ) : (
                  <div style={{ color: '#888' }}>Starting out...</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: '150px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Weekly Rate</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                  {avgWeek > 0 ? '+' : ''}{avgWeek.toFixed(2)} {summary.primary_unit}/wk
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Reading</th>
                    <th style={{ padding: '12px' }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.history.slice().reverse().map((h, i, arr) => {
                    // Since we reversed, the 'next' index is actually the previous chronological entry
                    const chronoPrev = arr[i+1]; 
                    const change = chronoPrev ? (h.value - chronoPrev.value) : null;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                        <td style={{ padding: '12px', color: '#666' }}>{new Date(h.created).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{h.value} {h.unit}</td>
                        <td style={{ padding: '12px', color: change === null ? '#999' : (goal.category === 'weight_loss' ? (change <= 0 ? '#28a745' : '#dc3545') : (change >= 0 ? '#28a745' : '#dc3545')) }}>
                          {change === null ? '--' : `${change > 0 ? '+' : ''}${change.toFixed(1)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>AI Roadmap</h2>
            {!goal.ai_plan && isMine && (
              <button style={{...btnStyle, background: '#17a2b8'}} onClick={handleGeneratePlan} disabled={loadingPlan}>
                {loadingPlan ? 'Architecting...' : 'Generate AI Plan'}
              </button>
            )}
          </div>
          {goal.ai_plan ? (
            <div 
              style={{ lineHeight: '1.7', color: '#444', background: '#fff9db', padding: '15px', borderRadius: '8px', border: '1px solid #ffec99' }} 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(goal.ai_plan) }}
            />
          ) : (
            <div style={{ color: '#888', fontStyle: 'italic' }}>
              {isMine ? "You haven't generated an AI plan yet. Let's get started!" : "No AI plan has been generated for this goal yet."}
            </div>
          )}
        </div>

        {isMine && (
          <div style={cardStyle}>
            <h2 style={{marginTop: 0, fontSize: '20px'}}>Log Progress</h2>
            <form onSubmit={handleLogProgress} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input style={{...inputStyle, width: '100px'}} type="number" step="0.1" placeholder="Value" value={val} onChange={e => setVal(e.target.value)} required />
              <input style={{...inputStyle, width: '100px'}} type="text" placeholder="Unit" value={unit} onChange={e => setUnit(e.target.value)} required />
              <input style={{...inputStyle, flex: 1, minWidth: '200px'}} type="text" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
              <button style={{...btnStyle, background: '#28a745'}} type="submit">Post Log</button>
            </form>
          </div>
        )}

        <div style={cardStyle}>
          <h2 style={{marginTop: 0, fontSize: '20px'}}>Coach Dialogue</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto', padding: '10px', background: '#fcfcfc', borderRadius: '8px' }}>
            {chatHistory.length === 0 && <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No conversation history yet.</div>}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#007BFF' : '#f1f3f5',
                color: msg.role === 'user' ? 'white' : '#333',
                padding: '12px 18px',
                borderRadius: '18px',
                borderBottomRightRadius: msg.role === 'user' ? '2px' : '18px',
                borderBottomLeftRadius: msg.role === 'user' ? '18px' : '2px',
                maxWidth: '85%',
                fontSize: '15px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {msg.role === 'assistant' ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isChatLoading && (
               <div style={{ alignSelf: 'flex-start', background: '#f1f3f5', padding: '12px 18px', borderRadius: '18px', borderBottomLeftRadius: '2px' }}>
                 <em style={{ color: '#666' }}>Coach is contemplating...</em>
               </div>
            )}
          </div>

          {isMine ? (
            <form onSubmit={handleChat} style={{ display: 'flex', gap: '10px' }}>
              <input 
                style={{...inputStyle, flex: 1}} 
                type="text" 
                placeholder="Ask your coach anything..." 
                value={chatMsg} 
                onChange={e => setChatMsg(e.target.value)} 
              />
              <button style={btnStyle} type="submit" disabled={isChatLoading}>Send</button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '15px', background: '#fff9db', borderRadius: '8px', fontSize: '14px', border: '1px solid #ffec99' }}>
               Coach Chat is private to the goal owner.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
