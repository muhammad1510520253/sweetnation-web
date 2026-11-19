import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      nav('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-head">
        <h1>Selamat Datang</h1>
        <div className="logo-ring">
          <img src="/logo.png" alt="Sweetnation" />
        </div>
      </div>
      <form className="login-body" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            placeholder="email@contoh.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Kata Sandi</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn block" type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
        <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
          Masuk untuk mulai berjualan
        </p>
      </form>
      <div className="login-foot">Kebahagiaan itu buatan sendiri</div>
    </div>
  );
}
