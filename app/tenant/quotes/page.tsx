'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, FileText, X, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface QuoteItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface Quote {
  id: string;
  quoteNumber: string | null;
  title: string;
  status: string;
  subtotal: string | null;
  totalAmount: string;
  contactId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface QuoteForm {
  title: string;
  contactId: string;
  dealId: string;
  expiresAt: string;
  notes: string;
  terms: string;
  items: QuoteItem[];
  discount: string;
  tax: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <QuotesPageInner />
    </Suspense>
  );
}

function QuotesPageInner() {
  const searchParams = useSearchParams();
  const initialContactId = searchParams.get('contactId') || '';
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<QuoteForm>(emptyForm);

  const [contactFilter, setContactFilter] = useState(initialContactId);

  const emptyForm: QuoteForm = {
    title: '',
    contactId: initialContactId,
    dealId: '',
    expiresAt: '',
    notes: '',
    terms: '',
    items: [{ description: '', quantity: '1', unitPrice: '0' }],
    discount: '0',
    tax: '0',
  };

  useEffect(() => { fetchQuotes(); fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/tenant/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (error) { console.error('Failed to fetch contacts', error); }
  };

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/tenant/quotes');
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (error) {
      console.error('Failed to fetch quotes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenant/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create quote');
      toast.success('Quote created successfully');
      setShowModal(false);
      setForm(emptyForm);
      fetchQuotes();
    } catch (error) {
      toast.error('Failed to create quote');
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: '1', unitPrice: '0' }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, value: string) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const getContactName = (contactId: string | null) => {
    if (!contactId) return '-';
    const c = contacts.find(c => c.id === contactId);
    return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email : '-';
  };

  const filtered = quotes.filter(q =>
    (q.title.toLowerCase().includes(search.toLowerCase()) || getContactName(q.contactId).toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || q.status === statusFilter) &&
    (!contactFilter || q.contactId === contactFilter)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quotes</h1>
            <p className="text-slate-500 dark:text-slate-400">Create and manage sales quotes</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Create Quote
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Total Quotes</div>
            <div className="text-2xl font-bold">{quotes.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Accepted</div>
            <div className="text-2xl font-bold text-green-600">{quotes.filter(q => q.status === 'accepted').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Pending</div>
            <div className="text-2xl font-bold text-blue-600">{quotes.filter(q => ['draft','sent','viewed'].includes(q.status)).length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">Expired/Declined</div>
            <div className="text-2xl font-bold text-red-600">{quotes.filter(q => ['expired','declined'].includes(q.status)).length}</div>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
          <select value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <option value="">All Contacts</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No quotes found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Quote #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Expires</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-mono text-sm">{quote.quoteNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm">{getContactName(quote.contactId)}</td>
                    <td className="px-4 py-3">{quote.title}</td>
                    <td className="px-4 py-3 font-medium">${parseFloat(quote.totalAmount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[quote.status] || 'bg-slate-100'}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="View"><FileText className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Send"><Send className="w-4 h-4" /></button>
                      </div>
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
              <h2 className="text-lg font-semibold">Create Quote</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contact</label>
                <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <option value="">Select contact...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expires At</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Line Items</label>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                    <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm text-violet-600 hover:underline">+ Add Item</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount ($)</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax ($)</label>
                  <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Terms</label>
                <textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg" />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Create Quote</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
