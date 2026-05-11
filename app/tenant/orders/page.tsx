'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Package, Truck, CheckCircle, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  title: string | null;
  status: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  totalAmount: string;
  contactId: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    contactId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    items: [{ description: '', quantity: '1', unitPrice: '0' }],
  });

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/tenant/orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = form.items.filter(i => i.description);
      const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 1) * (parseFloat(i.unitPrice) || 0), 0);
      
      const res = await fetch('/api/tenant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subtotal: subtotal.toFixed(2), items }),
      });
      if (!res.ok) throw new Error('Failed to create order');
      toast.success('Order created successfully');
      setShowModal(false);
      setForm({ title: '', contactId: '', orderDate: new Date().toISOString().split('T')[0], expectedDeliveryDate: '', notes: '', items: [{ description: '', quantity: '1', unitPrice: '0' }] });
      fetchOrders();
    } catch (error) {
      toast.error('Failed to create order');
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: '1', unitPrice: '0' }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const filtered = orders.filter(o => o.orderNumber.toLowerCase().includes(search.toLowerCase()) && (!statusFilter || o.status === statusFilter));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
            <p className="text-slate-500 dark:text-slate-400">Track and manage orders</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Create Order
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Total Orders</div>
            <div className="text-2xl font-bold">{orders.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Processing</div>
            <div className="text-2xl font-bold text-indigo-600">{orders.filter(o => o.status === 'processing').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Shipped</div>
            <div className="text-2xl font-bold text-violet-600">{orders.filter(o => o.status === 'shipped').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Delivered</div>
            <div className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Total Revenue</div>
            <div className="text-2xl font-bold">${orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(2)}</div>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No orders found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Delivery</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-mono text-sm">{order.orderNumber}</td>
                    <td className="px-4 py-3">{order.title || '-'}</td>
                    <td className="px-4 py-3 text-sm">{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 font-medium">${parseFloat(order.totalAmount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[order.status] || 'bg-slate-100'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Create Order</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Order Date *</label>
                  <input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Order Items</label>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Item description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                    <input type="number" placeholder="$" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm text-violet-600 hover:underline">+ Add Item</button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}