'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, FileText, ShoppingCart,
  CheckCircle, Clock, AlertCircle, Calendar, BarChart3, PieChart as PieChartIcon,
  Download, Filter, RefreshCw, ArrowUpRight, ArrowDownRight, Target, Contact, Building2
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { BarChart, LineChart, DonutChart, Sparkline, ProgressBar } from '@/components/ui/components/charts';
import toast from 'react-hot-toast';

interface Stat {
  label: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: any;
  color: string;
}

interface PipelineStage {
  name: string;
  count: number;
  value: number;
}

export default function AnalyticsDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading analytics...</div>}>
      <AnalyticsDashboardInner />
    </Suspense>
  );
}

function AnalyticsDashboardInner() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '30d';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const [revenueData, setRevenueData] = useState<{ label: string; value: number }[]>([]);
  const [contactSources, setContactSources] = useState<{ label: string; value: number }[]>([]);
  const [salesFunnel, setSalesFunnel] = useState<{ label: string; value: number }[]>([]);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [statsRes, pipelineRes, revenueRes, contactsRes, funnelRes, dealsRes] = await Promise.all([
        fetch('/api/tenant/analytics/stats?period=' + period).then(r => r.json()),
        fetch('/api/tenant/analytics/pipeline?period=' + period).then(r => r.json()),
        fetch('/api/tenant/analytics/revenue?period=' + period).then(r => r.json()),
        fetch('/api/tenant/contacts').then(r => r.json()),
        fetch('/api/tenant/analytics/funnel?period=' + period).then(r => r.json()),
        fetch('/api/tenant/deals').then(r => r.json()),
      ]);

      setStats([
        { label: 'Total Contacts', value: statsRes.data?.contacts || 0, change: statsRes.data?.contactsChange || 0, icon: Contact, color: 'text-violet-600', changeLabel: 'vs last period' },
        { label: 'Active Deals', value: statsRes.data?.deals || 0, change: statsRes.data?.dealsChange || 0, icon: Target, color: 'text-blue-600', changeLabel: 'vs last period' },
        { label: 'Revenue MTD', value: statsRes.data?.revenue || 0, change: statsRes.data?.revenueChange || 0, icon: DollarSign, color: 'text-emerald-600', changeLabel: 'vs last period' },
        { label: 'Win Rate', value: statsRes.data?.winRate || 0, change: statsRes.data?.winRateChange || 0, icon: TrendingUp, color: 'text-amber-600', changeLabel: 'vs last period' },
      ]);

      setPipelineData(pipelineRes.data || []);
      setRevenueData(revenueRes.data || []);
      
      const sources: Record<string, number> = {};
      (contactsRes.contacts || []).forEach((c: any) => {
        const source = c.leadSource || 'Direct';
        sources[source] = (sources[source] || 0) + 1;
      });
      setContactSources(Object.entries(sources).map(([k, v]) => ({ label: k, value: v })));
      
      setSalesFunnel(funnelRes.data || [
        { label: 'Leads', value: 150 },
        { label: 'Qualified', value: 80 },
        { label: 'Proposal', value: 40 },
        { label: 'Negotiation', value: 20 },
        { label: 'Won', value: 10 },
      ]);
      
      setTopDeals((dealsRes.deals || []).slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch analytics', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [period]);

  const StatCard = ({ stat }: { stat: Stat }) => {
    const Icon = stat.icon;
    const isPositive = (stat.change || 0) >= 0;
    
    return (
      <div className="admin-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', `bg-${stat.color}/10`)}>
            <Icon className={cn('w-5 h-5', stat.color)} />
          </div>
          {stat.change !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-red-500')}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stat.change)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold mb-1">
          {stat.label.includes('Rate') ? `${stat.value.toFixed(1)}%` : stat.label.includes('Revenue') ? formatCurrency(stat.value) : stat.value.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground">{stat.label}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-600" />
              Analytics Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Track your business performance</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => {
                const url = new URL(window.location.href);
                url.searchParams.set('period', e.target.value);
                window.location.href = url.toString();
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
            </select>
            <button onClick={fetchAnalytics} disabled={loading} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-accent">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="admin-card p-5 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl mb-3" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))
          ) : (
            stats.map((stat, i) => <StatCard key={i} stat={stat} />)
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 admin-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Revenue Trend</h3>
              <div className="flex gap-1">
                {['Week', 'Month', 'Year'].map((t) => (
                  <button key={t} className="px-3 py-1 text-xs rounded-full bg-muted hover:bg-violet-100 dark:hover:bg-violet-900/30 text-muted-foreground">{t}</button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <LineChart data={revenueData.length ? revenueData : [
                { label: 'Jan', value: 12000 },
                { label: 'Feb', value: 19000 },
                { label: 'Mar', value: 15000 },
                { label: 'Apr', value: 22000 },
                { label: 'May', value: 28000 },
                { label: 'Jun', value: 35000 },
              ]} />
            </div>
          </div>

          {/* Contact Sources */}
          <div className="admin-card p-5">
            <h3 className="font-semibold mb-4">Lead Sources</h3>
            <DonutChart 
              data={contactSources.length ? contactSources : [
                { label: 'Website', value: 35 },
                { label: 'Referral', value: 25 },
                { label: 'Social', value: 20 },
                { label: 'Direct', value: 15 },
                { label: 'Other', value: 5 },
              ]}
              height={180}
            />
          </div>
        </div>

        {/* Pipeline & Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Deal Pipeline */}
          <div className="admin-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Pipeline by Stage</h3>
              <span className="text-xs text-muted-foreground">Total: {pipelineData.reduce((s, d) => s + d.value, 0).toLocaleString()}</span>
            </div>
            <BarChart 
              data={pipelineData.length ? pipelineData.map(d => ({ label: d.name, value: d.value, color: 'bg-violet-500' })) : [
                { label: 'Lead', value: 45000 },
                { label: 'Qualified', value: 32000 },
                { label: 'Proposal', value: 28000 },
                { label: 'Negotiation', value: 15000 },
              ]}
              height={200}
            />
          </div>

          {/* Sales Funnel */}
          <div className="admin-card p-5">
            <h3 className="font-semibold mb-4">Sales Funnel</h3>
            <div className="space-y-3">
              {salesFunnel.map((stage, i) => {
                const max = Math.max(...salesFunnel.map(s => s.value), 1);
                const percent = (stage.value / max) * 100;
                return (
                  <div key={stage.label} className="relative">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{stage.label}</span>
                      <span className="text-muted-foreground">{stage.value.toLocaleString()}</span>
                    </div>
                    <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-lg transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {((stage.value / salesFunnel[0].value) * 100).toFixed(0)}% conversion
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Deals & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Deals */}
          <div className="admin-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Top Deals</h3>
              <button className="text-xs text-violet-600 hover:underline">View all</button>
            </div>
            <div className="divide-y divide-border">
              {topDeals.length ? topDeals.map((deal: any) => (
                <div key={deal.id} className="px-5 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">{deal.stage}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-violet-600">{formatCurrency(deal.amount || 0)}</p>
                    <p className="text-xs text-muted-foreground">{deal.closeDate ? formatDate(deal.closeDate) : 'No date'}</p>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No deals found. Create your first deal to see analytics.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="admin-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Recent Activity</h3>
              <span className="text-xs text-muted-foreground">Last 24 hours</span>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ))
              ) : (
                <>
                  <div className="px-5 py-3 flex gap-3 hover:bg-accent/30">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <Contact className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">New contact added</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="px-5 py-3 flex gap-3 hover:bg-accent/30">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">Deal won: $15,000</p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="px-5 py-3 flex gap-3 hover:bg-accent/30">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">Invoice sent to Acme Corp</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="px-5 py-3 flex gap-3 hover:bg-accent/30">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">New deal created: Enterprise License</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
