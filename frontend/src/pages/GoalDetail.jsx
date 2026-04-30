import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { getGoal, updateGoal, generatePlan, getProgress, logProgress, sendMessage } from '../lib/api';

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [progressLogs, setProgressLogs] = useState([]);
  
  // Progress Form
  const [val, setVal] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  
  // Chat
  const [chatMsg, setChatMsg] = useState('');
  const [chatReply, setChatReply] = useState('');
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
      const g = await getGoal(id);
      setGoal(g);
      const p = await getProgress(id);
      setProgressLogs(p.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await generatePlan({
        user_id: pb.authStore.model.id,
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
    e.preventDefault();
    try {
      await logProgress({ goal_id: id, value: parseFloat(val), unit, note });
      setVal(''); setUnit(''); setNote('');
      const p = await getProgress(id);
      setProgressLogs(p.items || []);
    } catch (e) {
      console.error(e);
      alert('Error logging progress');
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatMsg) return;
    try {
      const res = await sendMessage({ user_id: pb.authStore.model.id, goal_id: id, message: chatMsg });
      setChatReply(res.reply);
      setChatMsg('');
    } catch (e) {
      console.error(e);
    }
  };

  if (!goal) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading...</div>;

  const containerStyle = { maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' };
  const cardStyle = { background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' };
  const btnStyle = { padding: '8px 12px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
  const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' };

  return (
    <div style={containerStyle}>
      <button style={{...btnStyle, background: '#6c757d', marginBottom: '20px'}} onClick={() => navigate('/dashboard')}>&larr; Back</button>
      
      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 10px 0' }}>{goal.title}</h1>
        <p><strong>Category:</strong> {goal.category} | <strong>Status:</strong> {goal.is_active ? 'Active' : 'Inactive'}</p>
        <p><strong>Timeline:</strong> {goal.start_date.split(' ')[0]} to {goal.end_date.split(' ')[0]}</p>
        <p><strong>Description:</strong> {goal.description}</p>
      </div>

      <div style={cardStyle}>
        <h2>AI Plan</h2>
        {goal.ai_plan ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{goal.ai_plan}</div>
        ) : (
          <div>
            <p>No plan generated yet.</p>
            <button style={{...btnStyle, background: '#17a2b8'}} onClick={handleGeneratePlan} disabled={loadingPlan}>
              {loadingPlan ? 'Generating...' : 'Generate AI Plan'}
            </button>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2>Progress Log</h2>
        <form onSubmit={handleLogProgress} style={{ marginBottom: '20px' }}>
          <input style={{...inputStyle, width: '80px'}} type="number" step="0.1" placeholder="Value" value={val} onChange={e => setVal(e.target.value)} required />
          <input style={{...inputStyle, width: '80px'}} type="text" placeholder="Unit" value={unit} onChange={e => setUnit(e.target.value)} required />
          <input style={{...inputStyle, width: '200px'}} type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button style={{...btnStyle, background: '#28a745'}} type="submit">Log It</button>
        </form>
        
        <ul style={{ paddingLeft: '20px' }}>
          {progressLogs.map(log => (
            <li key={log.id} style={{ marginBottom: '10px' }}>
              <strong>{log.value} {log.unit}</strong> on {log.created.split(' ')[0]} {log.note && ` - ${log.note}`}
            </li>
          ))}
          {progressLogs.length === 0 && <p>No progress logged yet.</p>}
        </ul>
      </div>

      <div style={cardStyle}>
        <h2>Coach Chat</h2>
        {chatReply && (
          <div style={{ background: '#e2f0d9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <strong>Coach:</strong> {chatReply}
          </div>
        )}
        <form onSubmit={handleChat} style={{ display: 'flex' }}>
          <input 
            style={{...inputStyle, flex: 1}} 
            type="text" 
            placeholder="Ask your AI coach a question..." 
            value={chatMsg} 
            onChange={e => setChatMsg(e.target.value)} 
          />
          <button style={btnStyle} type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
