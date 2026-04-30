import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { createGoal } from '../lib/api';
export default function NewGoal() {
  const [formData, setFormData] = useState({ title: '', category: 'weight_loss', description: '', start_date: '', end_date: '' });
  const navigate = useNavigate();
  useEffect(() => {
    if (!pb.authStore.isValid) navigate('/login');
  }, [navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, user_id: pb.authStore.model.id };
      const res = await createGoal(data);
      if (res.id) {
        navigate(`/goals/${res.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create goal');
    }
  };
  const formStyle = { maxWidth: '500px', margin: '40px auto', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '15px' };
  const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' };
  const btnStyle = { padding: '10px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' };
  return (
    <div style={formStyle}>
      <h2>Create New Goal</h2>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onSubmit={handleSubmit}>
        <input style={inputStyle} type="text" placeholder="Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        <select style={inputStyle} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
          <option value="weight_loss">Weight Loss</option>
          <option value="muscle_gain">Muscle Gain</option>
          <option value="endurance">Endurance</option>
          <option value="flexibility">Flexibility</option>
          <option value="other">Other</option>
        </select>
        <textarea style={{...inputStyle, height: '80px'}} placeholder="Description (Optional)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
        <label style={{ fontSize: '14px', color: '#555' }}>Start Date:</label>
        <input style={inputStyle} type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
        <label style={{ fontSize: '14px', color: '#555' }}>End Date:</label>
        <input style={inputStyle} type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
        <button style={btnStyle} type="submit">Create</button>
        <button style={{...btnStyle, background: '#6c757d'}} type="button" onClick={() => navigate('/dashboard')}>Cancel</button>
      </form>
    </div>
  );
}
