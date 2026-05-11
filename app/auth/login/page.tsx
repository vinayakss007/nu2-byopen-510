'use client';
export default function LoginPage() {
  async function login(formData: FormData) {
    const email = formData.get('email');
    const password = formData.get('password');
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      window.location.href = '/tenant/dashboard';
    } else {
      alert(data.error || 'Login failed');
    }
  }
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ width: 360, padding: 40, background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#1a1a2e', textAlign: 'center' }}>NuCRM</h1>
        <p style={{ margin: '0 0 32px', color: '#6b7280', textAlign: 'center' }}>Sign in to your workspace</p>
        
        <form action={login} method="POST">
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#374151' }}>Email</label>
            <input 
              name="email" 
              type="email" 
              required
              placeholder="you@company.com"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#374151' }}>Password</label>
            <input 
              name="password" 
              type="password" 
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            type="submit"
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}