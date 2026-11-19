import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Boxes, Home as HomeIcon, ReceiptText, User, UtensilsCrossed } from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import { StoreProvider } from './store';
import { Spinner, ToastProvider } from './ui';
import Login from './pages/Login';

// Route-level code splitting: halaman berat baru diunduh saat dibuka.
const Home = lazy(() => import('./pages/Home'));
const Menu = lazy(() => import('./pages/Menu'));
const Transactions = lazy(() => import('./pages/Transactions'));
const TransactionForm = lazy(() => import('./pages/TransactionForm'));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail'));
const StockPage = lazy(() => import('./pages/Stock'));
const Profile = lazy(() => import('./pages/Profile'));
const StatisticPage = lazy(() => import('./pages/Statistic'));
const SettingsPage = lazy(() => import('./pages/Settings'));

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
          <img src="/logo.png" alt="Sweetnation" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>Sweetnation</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase' }}>HOMEMADE</div>
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
            <Suspense fallback={<Spinner />}>
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
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </ToastProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
