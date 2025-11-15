import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Platforms from './pages/Platforms';
import Earnings from './pages/Earnings';
import Goals from './pages/Goals';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Layout from './components/Layout';

function App() {
  const { token } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={token ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/" /> : <Register />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={token ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="goals" element={<Goals />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
