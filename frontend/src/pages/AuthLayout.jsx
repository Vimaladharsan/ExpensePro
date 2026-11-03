import { Link } from 'react-router-dom';
import { ArrowUpRight, ChartPie, ShieldCheck, Target, Wallet } from 'lucide-react';

// Shared look of the login and sign-up pages: brand panel on the left, form on the right
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <Link to="/welcome" className="brand brand-light" title="Back to home">
          <span className="brand-mark"><Wallet size={18} /></span>
          <span className="brand-name">Expense<b>Pro</b></span>
        </Link>

        <div className="auth-pitch">
          <h2>Take control of every rupee.</h2>
          <p>Track income and expenses, set budgets, and see exactly where your money goes, with clear charts and smart insights.</p>
          <ul className="auth-features">
            <li><ChartPie size={18} /> Smart dashboard with live charts</li>
            <li><Target size={18} /> Monthly and category budgets</li>
            <li><ShieldCheck size={18} /> Private account with secure login</li>
          </ul>
        </div>

        {/* Decorative preview card */}
        <div className="auth-preview" aria-hidden="true">
          <div className="preview-row">
            <span>Monthly balance</span>
            <span className="preview-badge"><ArrowUpRight size={13} /> 12%</span>
          </div>
          <b>₹12,430</b>
          <div className="preview-bars">
            {[38, 62, 45, 80, 55, 92, 70].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </section>
    </div>
  );
}
