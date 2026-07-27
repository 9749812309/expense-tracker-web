import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, CATEGORIES } from '../utils';
import { Plus, Trash2, PiggyBank } from 'lucide-react';

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('food');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const [bRes, eRes, pRes] = await Promise.all([
        supabase.from('budgets').select('*'),
        supabase.from('expenses').select('category,amount').gte('expense_date', startOfMonth),
        supabase.from('profiles').select('currency').eq('id', user.id).maybeSingle(),
      ]);
      setBudgets(bRes.data ?? []);
      setExpenses(eRes.data ?? []);
      if (pRes.data?.currency) setCurrency(pRes.data.currency);
      setLoading(false);
    }
    load();
  }, [user.id]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const numericLimit = parseFloat(limit);
    if (!numericLimit || numericLimit <= 0) { setError('Enter a valid limit.'); return; }
    const { data, error } = await supabase
      .from('budgets')
      .upsert({ category, monthly_limit: numericLimit }, { onConflict: 'user_id,category' })
      .select();
    if (error) { setError(error.message); return; }
    setBudgets((prev) => {
      const without = prev.filter((b) => b.category !== category);
      return [...without, data[0]];
    });
    setShowForm(false);
    setLimit('');
  }

  async function handleDelete(budgetId) {
    if (!confirm('Remove this budget?')) return;
    const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
    if (error) { alert(error.message); return; }
    setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
  }

  const spentByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  if (loading) return <div className="full-loader">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Budgets</h1>
          <p>Set monthly spending limits per category.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add budget'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 520, marginBottom: 16 }}>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
              <label htmlFor="bcat">Category</label>
              <select id="bcat" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
              <label htmlFor="blim">Monthly limit</label>
              <input id="blim" className="input" type="number" step="0.01" min="0.01" required value={limit}
                onChange={(e) => setLimit(e.target.value)} placeholder="0.00" />
            </div>
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="card empty-state">
          <PiggyBank size={28} />
          <h3>No budgets yet</h3>
          <p>Set a monthly limit for a category to start tracking against it.</p>
        </div>
      ) : (
        <div className="grid-2">
          {budgets.map((b) => {
            const spent = spentByCategory[b.category] ?? 0;
            const pct = b.monthly_limit > 0 ? Math.min(100, (spent / Number(b.monthly_limit)) * 100) : 0;
            const over = spent > Number(b.monthly_limit);
            return (
              <div key={b.id} className="card">
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <div>
                    <span className={`badge badge-${b.category}`} style={{ textTransform: 'capitalize' }}>{b.category}</span>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '4px', color: 'var(--error)' }} onClick={() => handleDelete(b.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {formatCurrency(spent, currency)}
                  <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}> / {formatCurrency(b.monthly_limit, currency)}</span>
                </div>
                <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: over ? 'var(--error)' : pct > 80 ? 'var(--warning)' : 'var(--success)',
                    borderRadius: 999,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div className="stat-sub" style={{ marginTop: 6 }}>
                  {over
                    ? `Over budget by ${formatCurrency(spent - Number(b.monthly_limit), currency)}`
                    : `${formatCurrency(Number(b.monthly_limit) - spent, currency)} remaining`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
