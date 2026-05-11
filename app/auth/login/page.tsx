'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    console.log('Clicked, calling API...');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    console.log('Response:', response.status, data);
    
    if (data.ok) {
      console.log('Success! Going to dashboard');
      window.location.href = '/tenant/dashboard';
    } else {
      console.log('Error:', data.error);
      alert(data.error || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 300 }}>
        <h1 style={{ marginBottom: 20 }}>NuCRM Login</h1>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        
        <button
          onClick={handleClick}
          disabled={loading}
          style={{ width: '100%', padding: 10, backgroundColor: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}