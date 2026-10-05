import { useState } from 'react';
import { Croissant } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { errorMessage } from '../api/client';
import Field, { inputClass, buttonClass } from '../components/common/Field';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Is the server running?'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Croissant className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Sugarloop Finance</h1>
            <p className="text-xs text-slate-500">Sign in to continue</p>
          </div>
        </div>
        <Field label="Email">
          <input type="email" required autoFocus autoComplete="username" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input type="password" required autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy} className={`${buttonClass.primary} w-full`}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
