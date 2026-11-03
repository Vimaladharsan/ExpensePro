import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DEMO_LOGIN } from '../constants.js';
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn(email, password) {
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      // the login page redirects automatically once a user is set
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Enter your email and password');
    signIn(form.email, form.password);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your dashboard."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">Email</span>
          <div className="input-icon">
            <Mail size={17} />
            <input type="email" autoComplete="email" placeholder="you@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <div className="input-icon">
            <Lock size={17} />
            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading && <LoaderCircle size={16} className="spin" />} Log in
        </button>
        <div className="divider"><span>or</span></div>
        <button type="button" className="btn btn-ghost btn-block" disabled={loading}
          onClick={() => signIn(DEMO_LOGIN.email, DEMO_LOGIN.password)}>
          <Sparkles size={16} /> Explore with the demo account
        </button>
      </form>
    </AuthLayout>
  );
}
