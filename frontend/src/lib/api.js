import pb from './pocketbase';

export const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

function getHeaders() {
  const token = pb.authStore.token;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': token })
  };
}

export async function getGoals() {
  const res = await fetch(`${API_URL}/goals/`, { headers: getHeaders() });
  return res.json();
}

export async function getGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}`, { headers: getHeaders() });
  return res.json();
}

export async function createGoal(data) {
  const res = await fetch(`${API_URL}/goals/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("Server error:", txt);
    throw new Error(txt);
  }
  return res.json();
}

export async function updateGoal(id, data) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function getProgress(goalId) {
  const res = await fetch(`${API_URL}/progress/${goalId}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProgressSummary(goalId) {
  const res = await fetch(`${API_URL}/progress/${goalId}/summary`, { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function logProgress(data) {
  const res = await fetch(`${API_URL}/progress/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generatePlan(data) {
  const res = await fetch(`${API_URL}/chat/generate-plan`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function sendMessage(data) {
  const res = await fetch(`${API_URL}/chat/message`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function getChatHistory(goalId) {
  const res = await fetch(`${API_URL}/chat/history/${goalId}`, { headers: getHeaders() });
  return res.json();
}
