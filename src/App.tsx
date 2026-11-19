import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Boxes, Home as HomeIcon, ReceiptText, User, UtensilsCrossed } from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import { StoreProvider } from './store';
import { ToastProvider } from './ui';
import Login from './pages/Login';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Transactions from './pages/Transactions';
import TransactionForm from './pages/TransactionForm';
import TransactionDetail from './pages/TransactionDetail';
import StockPage from './pages/Stock';
import Profile from './pages/Profile';
import StatisticPage from './pages/Statistic';

const NAV = [
  { to: '/', label: 'Beranda', icon: HomeIcon, end: true },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed, end: false },
  { to: '/transactions', label: 'Transaksi', icon: ReceiptText, end: false },
  { to: '/stock', label: 'Stok', icon: Boxes, end: false },
  { to: '/profile', label: 'Akun', icon: User, end: false },
];

function Shell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="Sweetnation" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--pink)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Sweetnation</div>
            <div style={{ fontSize: 10, color: 'var(--pink)', fontWeight: 600 }}>HOMEMADE</div>
          </div>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </aside>

      <div className="main">
        <Outlet />
      </div>

      <nav className="bottom-nav">
        {NAV.filter((n) => n.to !== '/menu').map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <Guard>
                    <Shell />
                  </Guard>
                }
              >
                <Route index element={<Home />} />
                <Route path="menu" element={<Menu />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="transactions/new" element={<TransactionForm />} />
                <Route path="transactions/:id" element={<TransactionDetail />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="statistic" element={<StatisticPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
