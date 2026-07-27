import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, CATEGORIES } from '../utils';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function ExpensesList() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    async function load() {
      const [expRes, profileRes] = await Promise.all([
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('profiles').select('currency').eq('id', user.id).maybeSingle(),
      ]);
      setExpenses(expRes.data ?? []);
      if (profileRes.data?.currency) setCurrency(profileRes.data.currency);
      setLoading(false);
    }
    load();
  }, [user.id]);

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = expenses.filter((e) => {
    if (filterCat && e.category !== filterCat) return false;
    if (search && !(e.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="full-loader">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Expenses</h1>
          <p>All your recorded transactions.</p>
        </div>
        <Link to="/expenses/new" className="btn btn-primary">
          <Plus size={16} /> Add expense
        </Link>
      </div>

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search descriptions…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto', minWidth: 160 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
        </select>
      </div>

      <div className="card mt-4">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No expenses found</h3>
            <p>Try adjusting your filters or add a new expense.</p>
          </div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${e.category}`} style={{ textTransform: 'capitalize' }}>{e.category}</span></td>
                  <td>{e.description || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(e.amount, currency)}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/expenses/${e.id}/edit`} className="btn btn-ghost" style={{ padding: '6px' }}><Pencil size={16} /></Link>
                      <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--error)' }} onClick={() => handleDelete(e.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
