import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCY_SYMBOLS } from '../utils';
import { User as UserIcon } from 'lucide-react';

const CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) { setLoading(false); return; }
      if (data) {
        setDisplayName(data.display_name ?? '');
        setCurrency(data.currency ?? 'USD');
      }
      setLoading(false);
    })();
  }, [user.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      currency,
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage('Profile saved.');
  }

  if (loading) return <div className="full-loader">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Profile</h1>
          <p>Manage your account preferences.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
            <UserIcon size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{user.email}</div>
            <div className="muted" style={{ fontSize: 13 }}>Signed in</div>
          </div>
        </div>

        {message && <div className="auth-error" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Display name</label>
            <input id="name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label htmlFor="cur">Currency</label>
            <select id="cur" className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>)}
            </select>
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>
    </div>
  );
}
