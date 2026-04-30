import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { createGoal, generatePlan, updateGoal } from '../lib/api';
import Navbar from '../components/Navbar';

export default function NewGoal() {
  const [formData, setFormData] = useState({ title: '', category: 'weight_loss', description: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pb.authStore.isValid) navigate('/login');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...formData, user_id: pb.authStore.model.id };
      const res = await createGoal(data);
      
      if (res.id) {
        try {
          // Automatically trigger AI plan generation
          const aiRes = await generatePlan({
            user_id: pb.authStore.model.id,
            goal_id: res.id,
            goal_title: formData.title,
            category: formData.category,
            description: formData.description
          });
          
          if (aiRes.plan) {
            await updateGoal(res.id, { ai_plan: aiRes.plan });
          }
        } catch (aiErr) {
          console.error("Auto-plan generation failed:", aiErr);
        }
        
        navigate(`/goals/${res.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const pageContainerStyle = { background: '#f8f9fa', minHeight: '100vh' };
  const formStyle = { maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '15px' };
  const cardStyle = { background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
  const inputStyle = { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '14px', color: '#555', fontWeight: 'bold', marginBottom: '5px', display: 'block' };
  const btnStyle = { padding: '12px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' };

  return (
    <div style={pageContainerStyle}>
      <Navbar />
      <div style={formStyle}>
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Launch Your Mission</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', marginBottom: '15px' }}>🚀</div>
              <p style={{ fontWeight: 'bold' }}>Creating your goal and generating AI plan...</p>
              <p style={{ color: '#666', fontSize: '14px' }}>Please hold while our AI architects your roadmap.</p>
            </div>
          ) : (
            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onSubmit={handleSubmit}>
              <div>
                <label style={labelStyle}>Goal Name</label>
                <input style={inputStyle} type="text" placeholder="e.g. Summer Shred 2026" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select style={inputStyle} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="endurance">Endurance</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Description / Mission Statement</label>
                <textarea style={{...inputStyle, height: '100px', resize: 'vertical'}} placeholder="What's your primary motivation?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input style={inputStyle} type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Target Date</label>
                  <input style={inputStyle} type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>

              <button style={btnStyle} type="submit">Deploy Goal</button>
              <button style={{...btnStyle, background: 'transparent', color: '#666', border: '1px solid #ddd'}} type="button" onClick={() => navigate('/dashboard')}>Cancel</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
