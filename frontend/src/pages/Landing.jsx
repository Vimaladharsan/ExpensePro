import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import {
  ArrowRight, Bell, ChartColumnBig, ChartPie, Check, Flag, LoaderCircle, Lock, Moon, Smartphone, Sparkles, Sun, Target,
  TrendingDown, TrendingUp, Wallet, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Brand, useTheme } from '../components/Layout.jsx';
import { CategoryIcon } from '../components/ui.jsx';
import { DEMO_LOGIN } from '../constants.js';
import { parseQuickAdd } from '../utils/quickParse.js';
import { formatDate, formatINR } from '../utils/format.js';

const FEATURES = [
  { icon: ChartPie, color: '#6366f1', title: 'Smart dashboard', text: 'Income, expenses, balance and savings rate at a glance, compared with last month.' },
  { icon: Zap, color: '#f59e0b', title: 'Quick Add in plain words', text: 'Type “250 pizza yesterday upi” and it fills in the amount, category, date and payment for you.' },
  { icon: Target, color: '#10b981', title: 'Budgets & alerts', text: 'Set monthly and category limits. Get warned before you overspend.' },
  { icon: Flag, color: '#ec4899', title: 'Savings goals', text: 'Save for a laptop or a trip. See your progress and how much to save each month.' },
  { icon: ChartColumnBig, color: '#0ea5e9', title: 'Reports & calendar', text: 'Spending heatmap, category trends and a printable monthly report.' },
  { icon: Lock, color: '#8b5cf6', title: 'Private & secure', text: 'Your own account with encrypted passwords. Only you can see your data.' },
];

const STEPS = [
  { title: 'Create your account', text: 'Sign up in seconds, with just your name, email and a password.' },
  { title: 'Add your transactions', text: 'Use the form or simply type what you spent. It takes two seconds.' },
  { title: 'Watch the insights', text: 'Charts, budgets and goals update instantly so you always know where you stand.' },
];

const TECH = [
  { name: 'MongoDB', text: 'Database, with aggregation for reports' },
  { name: 'Express', text: 'REST API with JSON' },
  { name: 'React', text: 'Fast, responsive interface' },
  { name: 'Node.js', text: 'Server runtime' },
  { name: 'JWT + bcrypt', text: 'Secure login' },
  { name: 'Recharts', text: 'Interactive charts' },
];

const EXAMPLES = ['250 pizza yesterday upi', '1.2k shoes amazon card', 'salary 25000 credited', 'uber 180 cash', '599 wifi bill 5 oct'];
const PREVIEW_DATA = [320, 540, 410, 760, 520, 880, 640, 920, 700, 1080, 860, 1180].map((v, i) => ({ i, v }));

export default function Landing() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [theme, setTheme] = useTheme();
  const [loadingDemo, setLoadingDemo] = useState(false);

  async function tryDemo() {
    if (user) return navigate('/');
    setLoadingDemo(true);
    try {
      await login(DEMO_LOGIN.email, DEMO_LOGIN.password);
      toast.success('Welcome to the live demo!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
      setLoadingDemo(false);
    }
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/welcome"><Brand /></Link>
        <nav className="landing-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#tech">Technology</a>
        </nav>
        <div className="landing-nav-actions">
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Switch theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <Link className="btn btn-primary btn-sm" to="/">Open dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm hide-xs" to="/login">Log in</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Get started</Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-text">
          <span className="hero-badge"><Sparkles size={14} /> Smart money tracking for students</span>
          <h1>Know where <span className="gradient-text">every rupee</span> goes.</h1>
          <p>
            Track income and expenses, set budgets, save for your goals and get instant insights,
            all in one beautiful dashboard.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary btn-lg" onClick={tryDemo} disabled={loadingDemo}>
              {loadingDemo ? <LoaderCircle size={18} className="spin" /> : <Sparkles size={18} />}
              {user ? 'Open dashboard' : 'Try the live demo'}
            </button>
            {!user && <Link to="/register" className="btn btn-ghost btn-lg">Create free account <ArrowRight size={18} /></Link>}
          </div>
          <ul className="hero-points">
            <li><Check size={16} /> No setup needed</li>
            <li><Check size={16} /> Works on your phone</li>
            <li><Check size={16} /> Private and secure</li>
          </ul>
        </div>
        <HeroPreview />
      </section>

      <section className="landing-strip">
        <span><ChartPie size={18} /> 6 interactive charts</span>
        <span><Zap size={18} /> Natural-language Quick Add</span>
        <span><Target size={18} /> Budgets, alerts & goals</span>
        <span><Smartphone size={18} /> Phone friendly + dark mode</span>
      </section>

      <section id="features" className="landing-section">
        <p className="eyebrow">Features</p>
        <h2 className="section-title">Everything you need to master your money</h2>
        <p className="section-sub">Built for students who want to spend smarter, save more and stop wondering where the money went.</p>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, color, title, text }) => (
            <div key={title} className="feature-card" style={{ '--c': color }}>
              <span className="feature-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <QuickAddShowcase />

      <section id="how" className="landing-section">
        <p className="eyebrow">How it works</p>
        <h2 className="section-title">Up and running in three steps</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="step-number">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="tech" className="landing-section">
        <p className="eyebrow">Technology</p>
        <h2 className="section-title">Built on the MERN stack</h2>
        <div className="tech-grid">
          {TECH.map((t) => (
            <div key={t.name} className="tech-card">
              <b>{t.name}</b>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to take control of your money?</h2>
        <p>Explore the demo with six months of real-looking data, or start fresh with your own account.</p>
        <div className="hero-ctas">
          <button className="btn btn-light btn-lg" onClick={tryDemo} disabled={loadingDemo}>
            <Sparkles size={18} /> {user ? 'Open dashboard' : 'Try the live demo'}
          </button>
          {!user && <Link to="/register" className="btn btn-outline-light btn-lg">Create free account</Link>}
        </div>
      </section>

      <footer className="landing-footer">
        <Brand />
        <span className="muted small">© 2026 ExpensePro · Built with MongoDB, Express, React & Node.js</span>
      </footer>
    </div>
  );
}

// A small, decorative version of the dashboard shown in the hero
function HeroPreview() {
  return (
    <div className="hero-preview" aria-hidden="true">
      <div className="preview-window">
        <div className="preview-dots"><span /><span /><span /></div>
        <div className="preview-stats">
          <div><small>Income</small><b className="text-good">₹19,100</b><span className="delta delta-good"><TrendingUp size={12} /> 19%</span></div>
          <div><small>Expenses</small><b className="text-bad">₹17,188</b><span className="delta delta-good"><TrendingDown size={12} /> 7%</span></div>
          <div><small>Balance</small><b>₹1,912</b><span className="muted small">this month</span></div>
        </div>
        <div className="preview-chart">
          <small className="muted">Spending this month</small>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={PREVIEW_DATA} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={3} fill="url(#heroFill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="preview-budget">
          <div className="preview-budget-row"><span>Food budget</span><span className="muted">₹2,790 / ₹3,500</span></div>
          <div className="progress"><div className="progress-fill warning" style={{ width: '80%' }} /></div>
        </div>
      </div>

      <div className="float-card float-1">
        <CategoryIcon category="Freelance" size={36} />
        <div><b>+₹3,100</b><small className="muted">Freelance · App UI design</small></div>
      </div>
      <div className="float-card float-2">
        <span className="float-bell"><Bell size={16} /></span>
        <div><b>Shopping budget</b><small className="text-bad">₹1,300 over limit</small></div>
      </div>
      <div className="float-card float-3">
        <span className="float-goal"><Wallet size={16} /></span>
        <div><b>Goa trip</b><small className="muted">75% saved · ₹11,200</small></div>
      </div>
    </div>
  );
}

// Cycles through example sentences and shows what the real Quick Add parser understands
function QuickAddShowcase() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(timer);
  }, []);
  const example = EXAMPLES[index];
  const parsed = parseQuickAdd(example);

  return (
    <section className="landing-section showcase">
      <div className="showcase-text">
        <p className="eyebrow">Quick Add</p>
        <h2 className="section-title">Just type it. We’ll do the rest.</h2>
        <p className="section-sub">
          No long forms. Write a transaction the way you’d say it, and ExpensePro works out the amount,
          category, date and payment method instantly. Press Enter and it’s saved.
        </p>
      </div>
      <div className="showcase-demo" key={index}>
        <div className="showcase-input"><Sparkles size={16} /><span className="typing">{example}</span></div>
        <div className="showcase-arrow"><ArrowRight size={18} /></div>
        <div className="showcase-result">
          <CategoryIcon category={parsed.category} size={44} />
          <div>
            <b>{parsed.note}</b>
            <small className="muted">{parsed.category} · {formatDate(`${parsed.date}T00:00:00Z`)} · {parsed.paymentMethod}</small>
          </div>
          <span className={`amount ${parsed.type}`}>{parsed.type === 'income' ? '+' : '−'}{formatINR(parsed.amount)}</span>
        </div>
      </div>
    </section>
  );
}
