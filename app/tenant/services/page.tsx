'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, DollarSign, Clock, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricingType: string;
  unitPrice: string | null;
  hourlyRate: string | null;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    pricingType: 'fixed',
    unitPrice: '',
    hourlyRate: '',
    monthlyPrice: '',
    yearlyPrice: '',
    taxRate: '0',
    durationMinutes: '',
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/tenant/services');
      const data = await res.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to fetch services', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenant/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create service');
      toast.success('Service created successfully');
      setShowModal(false);
      setForm({ name: '', description: '', category: '', pricingType: 'fixed', unitPrice: '', hourlyRate: '', monthlyPrice: '', yearlyPrice: '', taxRate: '0', durationMinutes: '' });
      fetchServices();
    } catch (error) {
      toast.error('Failed to create service');
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      await fetch(`/api/tenant/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Services</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage your service offerings</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No services found. Create your first service!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <div key={service.id} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 ${!service.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{service.name}</h3>
                    <span className="text-xs text-slate-500">{service.category || 'Uncategorized'}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${service.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">{service.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {service.pricingType}</span>
                  {service.durationMinutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.durationMinutes}min</span>}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <button onClick={() => { setEditingService(service); setShowModal(true); }} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                    Edit
                  </button>
                  <button onClick={() => toggleActive(service)} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                    {service.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
              <button onClick={() => { setShowModal(false); setEditingService(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pricing Type</label>
                  <select value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {form.pricingType === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Price</label>
                    <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                  </div>
                )}
                {form.pricingType === 'hourly' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                    <input type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                  </div>
                )}
                {form.pricingType === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Price</label>
                    <input type="number" step="0.01" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                  </div>
                )}
                {form.pricingType === 'yearly' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Yearly Price</label>
                    <input type="number" step="0.01" value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                  <input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingService(null); }} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                  {editingService ? 'Update' : 'Create'} Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}