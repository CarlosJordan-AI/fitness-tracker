import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { getGoal, updateGoal, generatePlan, getProgress, logProgress, sendMessage } from '../lib/api';

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

    const userMsg = chatMsg;
    setChatMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await sendMessage({ user_id: pb.authStore.model.id, goal_id: id, message: userMsg });
      setChatHistory(prev => [...prev, { role: 'coach', text: res.reply }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'coach', text: 'Sorry, I encountered an error resolving your request.' }]);
    }
    setIsChatLoading(false);
  };

  if (!goal) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading...</div>;

  const containerStyle = { maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' };
  const cardStyle = { background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' };
  const btnStyle = { padding: '8px 12px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
  const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' };

  return (
    <div style={containerStyle}>
      <button style={{ ...btnStyle, background: '#6c757d', marginBottom: '20px' }} onClick={() => navigate('/dashboard')}>&larr; Back</button>

      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 10px 0' }}>{goal.title}</h1>
        <p><strong>Category:</strong> {goal.category} | <strong>Status:</strong> {goal.is_active ? 'Active' : 'Inactive'}</p>
        <p><strong>Timeline:</strong> {goal.start_date.split(' ')[0]} to {goal.end_date.split(' ')[0]}</p>
        <p><strong>Description:</strong> {goal.description}</p>
      </div>

      <div style={cardStyle}>
        <h2>AI Plan</h2>
        {goal.ai_plan ? (
          <div
            style={{ lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(goal.ai_plan) }}
          />
        ) : (
          <div>
            <p>No plan generated yet.</p>
            <button style={{ ...btnStyle, background: '#17a2b8' }} onClick={handleGeneratePlan} disabled={loadingPlan}>
              {loadingPlan ? 'Generating...' : 'Generate AI Plan'}
            </button>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2>Progress Log</h2>
        <form onSubmit={handleLogProgress} style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, width: '100px' }} type="number" step="0.1" placeholder="Value" value={val} onChange={e => setVal(e.target.value)} required />
          <input style={{ ...inputStyle, width: '100px' }} type="text" placeholder="Unit" value={unit} onChange={e => setUnit(e.target.value)} required />
          <input style={{ ...inputStyle, flex: 1, minWidth: '200px' }} type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button style={{ ...btnStyle, background: '#28a745' }} type="submit">Log It</button>
        </form>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {progressLogs.map(log => {
            const dateObj = new Date(log.created);
            const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <li key={log.id} style={{ marginBottom: '15px', padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{log.value} {log.unit}</span>
                  <span style={{ fontSize: '0.9em', color: '#666' }}>{formattedDate}</span>
                </div>
                {log.note && <div style={{ marginTop: '8px', fontSize: '0.95em', color: '#555' }}>{log.note}</div>}
              </li>
            );
          })}
          {progressLogs.length === 0 && <p>No progress logged yet.</p>}
        </ul>
      </div>

      <div style={cardStyle}>
        <h2>Coach Chat</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '300px', overflowY: 'auto' }}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#007BFF' : '#e9ecef',
              color: msg.role === 'user' ? 'white' : 'black',
              padding: '10px 15px',
              borderRadius: '15px',
              maxWidth: '80%'
            }}>
              {msg.role === 'coach' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
              ) : (
                msg.text
              )}
            </div>
          ))}
          {isChatLoading && (
            <div style={{ alignSelf: 'flex-start', background: '#e9ecef', padding: '10px 15px', borderRadius: '15px' }}>
              <em style={{ color: '#555' }}>Coach is thinking...</em>
            </div>
          )}
        </div>

        <form onSubmit={handleChat} style={{ display: 'flex' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="text"
            placeholder="Ask your AI coach a question..."
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
          />
          <button style={btnStyle} type="submit" disabled={isChatLoading}>Send</button>
        </form>
      </div>
    </div>
  );
}
