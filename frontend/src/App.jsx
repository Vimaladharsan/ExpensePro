import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Budgets from './pages/Budgets.jsx';
import Goals from './pages/Goals.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Pages that need a login. Visitors to the home page see the landing page;
// anyone opening another page goes to /login and comes back here afterwards.
function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Splash />;
  if (!user) {
    if (location.pathname === '/') return <Navigate to="/welcome" replace />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

// Login/register pages: already logged-in users go straight to the app
function GuestOnly({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Splash />;
  if (user) return <Navigate to={location.state?.from || '/'} replace />;
  return children;
}

function Splash() {
  return (
    <div className="splash">
      <span className="brand-mark pulse"><Wallet size={22} /></span>
    </div>
  );
}
