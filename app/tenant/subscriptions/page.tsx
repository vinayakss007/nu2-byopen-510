'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, CreditCard, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  name: string;
  planName: string | null;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  amount: string;
  billingFrequency: string;
  autoRenew: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  past_due: 'bg-orange-100 text-orange-700',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    planName: '',
    startDate: new Date().toISOString().split('T')[0],
    currentPeriodEnd: '',
    amount: '',
    billingFrequency: 'monthly',
    autoRenew: true,
    paymentMethod: '',
    last4: '',
  });

  useEffect(() => { fetchSubscriptions(); }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/tenant/subscriptions');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenant/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create subscription');
      toast.success('Subscription created successfully');
      setShowModal(false);
      setForm({ name: '', planName: '', startDate: new Date().toISOString().split('T')[0], currentPeriodEnd: '', amount: '', billingFrequency: 'monthly', autoRenew: true, paymentMethod: '', last4: '' });
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to create subscription');
    }
  };

  const filtered = subscriptions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const mrr = subscriptions.filter(s => s.status === 'active' && s.billingFrequency === 'monthly').reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const arr = subscriptions.filter(s => s.status === 'active' && s.billingFrequency === 'yearly').reduce((sum, s) => sum + parseFloat(s.amount), 0) * 12 + mrr * 12;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage recurring subscriptions</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" /> New Subscription
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Total Subscriptions</div>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Active</div>
            <div className="text-2xl font-bold text-green-600">{subscriptions.filter(s => s.status === 'active').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Monthly Recurring</div>
            <div className="text-2xl font-bold text-violet-600">${mrr.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Annual Recurring</div>
            <div className="text-2xl font-bold text-indigo-600">${arr.toFixed(2)}</div>
          </div>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search subscriptions..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No subscriptions found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((sub) => (
              <div key={sub.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{sub.name}</h3>
                    <span className="text-xs text-slate-500">{sub.planName || sub.billingFrequency}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[sub.status]}`}>{sub.status}</span>
                </div>
                <div className="text-2xl font-bold text-violet-600 mb-3">${parseFloat(sub.amount).toFixed(2)}<span className="text-sm text-slate-500">/{sub.billingFrequency}</span></div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(sub.startDate).toLocaleDateString()}</span>
                  {sub.autoRenew && <span className="flex items-center gap-1 text-green-600"><RefreshCw className="w-3 h-3" /> Auto-renew</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">New Subscription</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Name</label>
                  <input type="text" value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Billing Period End</label>
                  <input type="date" value={form.currentPeriodEnd} onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency *</label>
                  <select value={form.billingFrequency} onChange={(e) => setForm({ ...form, billingFrequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })}
                  className="w-4 h-4" />
                <label className="text-sm">Auto-renew enabled</label>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}