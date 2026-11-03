import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: undefined, form: undefined });
  };

  function validate() {
    const found = {};
    if (!form.name.trim()) found.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) found.email = 'Enter a valid email';
    if (form.password.length < 6) found.password = 'Use at least 6 characters';
    if (form.confirm !== form.password) found.confirm = 'Passwords do not match';
    return found;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      toast.success(`Welcome, ${user.name.split(' ')[0]}! Your account is ready.`);
    } catch (err) {
      setErrors({ form: err.message });
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your money in under a minute."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">Full name</span>
          <div className={`input-icon ${errors.name ? 'invalid' : ''}`}>
            <User size={17} />
            <input autoComplete="name" placeholder="Your name" value={form.name} onChange={update('name')} maxLength={50} />
          </div>
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <div className={`input-icon ${errors.email ? 'invalid' : ''}`}>
            <Mail size={17} />
            <input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} />
          </div>
          {errors.email && <small className="field-error">{errors.email}</small>}
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Password</span>
            <div className={`input-icon ${errors.password ? 'invalid' : ''}`}>
              <Lock size={17} />
              <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="6+ characters"
                value={form.password} onChange={update('password')} />
              <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <small className="field-error">{errors.password}</small>}
          </label>
          <label className="field">
            <span className="field-label">Confirm password</span>
            <div className={`input-icon ${errors.confirm ? 'invalid' : ''}`}>
              <Lock size={17} />
              <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat it"
                value={form.confirm} onChange={update('confirm')} />
            </div>
            {errors.confirm && <small className="field-error">{errors.confirm}</small>}
          </label>
        </div>

        {errors.form && <p className="form-error">{errors.form}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading && <LoaderCircle size={16} className="spin" />} Create account
        </button>
      </form>
    </AuthLayout>
  );
}
