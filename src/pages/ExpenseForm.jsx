import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CATEGORIES } from '../utils';
import { ArrowLeft } from 'lucide-react';

export default function ExpenseForm() {
  const { id } = useParams();
  const location = useLocation();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const existing = location.state?.expense;

  const [amount, setAmount] = useState(existing?.amount ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'food');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [expenseDate, setExpenseDate] = useState(existing?.expense_date ?? new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit && !existing);

  useEffect(() => {
    if (!isEdit || existing) return;
    (async () => {
      const { data, error } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();
      if (error || !data) { setError('Expense not found.'); setLoading(false); return; }
      setAmount(data.amount);
      setCategory(data.category);
      setDescription(data.description ?? '');
      setExpenseDate(data.expense_date);
      setLoading(false);
    })();
  }, [id, isEdit, existing]);

  if (loading) return <div className="full-loader">Loading…</div>;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }
    setSaving(true);
    const payload = {
      amount: numericAmount,
      category,
      description: description || null,
      expense_date: expenseDate,
    };

    let result;
    if (isEdit) {
      result = await supabase.from('expenses').update(payload).eq('id', id);
    } else {
      result = await supabase.from('expenses').insert(payload);
    }
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigate('/expenses');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 8, padding: '4px 8px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1>{isEdit ? 'Edit expense' : 'Add expense'}</h1>
          <p>{isEdit ? 'Update the details below.' : 'Record a new transaction.'}</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input id="amount" className="input" type="number" step="0.01" min="0.01" required
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input id="date" className="input" type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="desc">Description (optional)</label>
            <textarea id="desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add expense')}</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
