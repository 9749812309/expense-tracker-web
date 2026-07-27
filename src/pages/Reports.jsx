import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, CATEGORIES } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#64748b'];

export default function Reports() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      since.setDate(1);
      const sinceStr = since.toISOString().slice(0, 10);
      const [eRes, pRes] = await Promise.all([
        supabase.from('expenses').select('amount,category,expense_date').gte('expense_date', sinceStr).order('expense_date'),
        supabase.from('profiles').select('currency').eq('id', user.id).maybeSingle(),
      ]);
      setExpenses(eRes.data ?? []);
      if (pRes.data?.currency) setCurrency(pRes.data.currency);
      setLoading(false);
    }
    load();
  }, [user.id]);

  if (loading) return <div className="full-loader">Loading…</div>;

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(undefined, { month: 'short' }) };
  });

  const monthlyByCategory = months.map((m) => {
    const row = { month: m.label };
    for (const c of CATEGORIES) row[c] = 0;
    for (const e of expenses) {
      const key = e.expense_date.slice(0, 7);
      if (key === m.key) row[e.category] += Number(e.amount);
    }
    return row;
  });

  const monthlyTotal = monthlyByCategory.map((m) => ({
    month: m.month,
    total: CATEGORIES.reduce((s, c) => s + m[c], 0),
  }));

  const categoryTotals = CATEGORIES.map((c, i) => ({
    category: c,
    total: expenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount), 0),
    color: COLORS[i],
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const grandTotal = categoryTotals.reduce((s, c) => s + c.total, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Reports</h1>
          <p>Insights over the last 6 months.</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="stat">
          <div className="stat-label">6-month total</div>
          <div className="stat-value">{formatCurrency(grandTotal, currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Monthly average</div>
          <div className="stat-value">{formatCurrency(grandTotal / 6, currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Top category</div>
          <div className="stat-value" style={{ fontSize: 20, textTransform: 'capitalize' }}>
            {categoryTotals[0]?.category ?? '—'}
          </div>
          <div className="stat-sub">{categoryTotals[0] ? formatCurrency(categoryTotals[0].total, currency) : 'No data'}</div>
        </div>
      </div>

      <div className="card mt-8">
        <h3 style={{ marginBottom: 16 }}>Monthly trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyTotal}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => formatCurrency(v, currency)} />
            <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card mt-4">
        <h3 style={{ marginBottom: 16 }}>Spending by category (6 months)</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={monthlyByCategory}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => formatCurrency(v, currency)} />
            <Legend wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
            {CATEGORIES.map((c, i) => (
              <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i]} radius={i === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card mt-4">
        <h3 style={{ marginBottom: 16 }}>Category breakdown</h3>
        {categoryTotals.length === 0 ? (
          <div className="empty-state"><h3>No data yet</h3><p>Add expenses to see your breakdown.</p></div>
        ) : (
          <table className="table">
            <thead><tr><th>Category</th><th>Total spent</th><th>Share</th></tr></thead>
            <tbody>
              {categoryTotals.map((c) => (
                <tr key={c.category}>
                  <td style={{ textTransform: 'capitalize' }}>{c.category}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(c.total, currency)}</td>
                  <td>{grandTotal > 0 ? ((c.total / grandTotal) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
