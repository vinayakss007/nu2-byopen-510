'use client';
import { useState } from 'react';
import { useEffect } from 'react';

export default function LoginPage() {
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [btnDisabled, setBtnDisabled] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: 320, padding: 30, background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: 20, textAlign: 'center', color: '#333' }}>NuCRM Login</h2>
        
        {msg && (
          <div style={{ padding: 10, marginBottom: 15, background: msg.includes('Success') ? '#d4edda' : '#f8d7da', color: msg.includes('Success') ? '#155724' : '#721c24', borderRadius: 4, fontSize: 14 }}>
            {msg}
          </div>
        )}
        
        <form 
          action="/api/auth/login" 
          method="POST"
          encType="application/json"
          onSubmit={(e) => {
            e.preventDefault();
            setBtnDisabled(true);
            setMsg('Signing in...');
            
            fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password: pwd })
            })
            .then(r => r.json())
            .then(d => {
              if (d.ok) {
                setMsg('Success! Redirecting...');
                window.location.href = '/tenant/dashboard';
              } else {
                setMsg(d.error || 'Login failed');
                setBtnDisabled(false);
              }
            })
            .catch(err => {
              setMsg('Error: ' + err.message);
              setBtnDisabled(false);
            });
          }}
        >
          <input 
            name="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}
          />
          
          <input 
            name="password"
            type="password"
            placeholder="Password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', marginBottom: 20, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}
          />
          
          <button 
            type="submit"
            disabled={btnDisabled}
            style={{ width: '100%', padding: '12px', background: btnDisabled ? '#ccc' : '#7c3aed', color: 'white', border: 'none', borderRadius: 4, fontSize: 14, cursor: btnDisabled ? 'not-allowed' : 'pointer' }}
          >
            {btnDisabled ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}