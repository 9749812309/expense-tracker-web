import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, CATEGORIES } from '../utils';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, Wallet, Calendar, Plus } from 'lucide-react';

const COLORS = ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#64748b'];

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    async function load() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

      const [expRes, budgetRes, profileRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .gte('expense_date', startOfMonth)
          .order('expense_date', { ascending: false }),
        supabase.from('budgets').select('*'),
        supabase.from('profiles').select('currency').eq('id', user.id).maybeSingle(),
      ]);

      setExpenses(expRes.data ?? []);
      setBudgets(budgetRes.data ?? []);
      if (profileRes.data?.currency) setCurrency(profileRes.data.currency);
      setLoading(false);
    }
    load();
  }, [user.id]);

  const totalThisMonth = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.monthly_limit), 0);
  const txCount = expenses.length;
  const avgPerTx = txCount ? totalThisMonth / txCount : 0;

  const byCategory = CATEGORIES.map((cat, i) => ({
    name: cat,
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
    color: COLORS[i],
  })).filter((c) => c.value > 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const total = expenses
      .filter((e) => e.expense_date === key)
      .reduce((s, e) => s + Number(e.amount), 0);
    return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), amount: total };
  });

  if (loading) return <div className="full-loader">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>Welcome back — here&apos;s your spending this month.</p>
        </div>
        <Link to="/expenses/new" className="btn btn-primary">
          <Plus size={16} /> Add expense
        </Link>
      </div>

      <div className="grid-3">
        <div className="stat">
          <div className="stat-label">Spent this month</div>
          <div className="stat-value error">{formatCurrency(totalThisMonth, currency)}</div>
          <div className="stat-sub">
            {totalBudget > 0
              ? `of ${formatCurrency(totalBudget, currency)} budgeted`
              : 'No budgets set yet'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{txCount}</div>
          <div className="stat-sub">this month</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg per transaction</div>
          <div className="stat-value">{formatCurrency(avgPerTx, currency)}</div>
          <div className="stat-sub">across {txCount} {txCount === 1 ? 'entry' : 'entries'}</div>
        </div>
      </div>

      <div className="grid-2 mt-8">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Spending by category</h3>
          {byCategory.length === 0 ? (
            <div className="empty-state"><Wallet size={28} /><h3>No expenses yet</h3><p>Add your first expense to see the breakdown.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {byCategory.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {byCategory.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              {byCategory.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                  <span style={{ textTransform: 'capitalize' }}>{c.name}</span>
                  <span className="muted">{formatCurrency(c.value, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Last 7 days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCurrency(v, currency)} />
              <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-8">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3>Recent expenses</h3>
          <Link to="/expenses" className="btn btn-ghost">View all</Link>
        </div>
        {expenses.length === 0 ? (
          <div className="empty-state"><Calendar size={28} /><h3>Nothing here yet</h3><p>Your recent transactions will appear here.</p></div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              {expenses.slice(0, 5).map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${e.category}`} style={{ textTransform: 'capitalize' }}>{e.category}</span></td>
                  <td>{e.description || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(e.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
