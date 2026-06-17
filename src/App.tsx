import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from '@/components/layout/BottomNav';
import Dashboard from '@/pages/Dashboard';
import Appointment from '@/pages/Appointment';
import Result from '@/pages/Result';
import Schedule from '@/pages/Schedule';
import Stations from '@/pages/Stations';
import Supplies from '@/pages/Supplies';
import Tracking from '@/pages/Tracking';
import Records from '@/pages/Records';

function Layout() {
  const location = useLocation();
  const showBottomNav = !location.pathname.startsWith('/result/');

  return (
    <div className="min-h-screen bg-surface-100">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/appointment" element={<Appointment />} />
        <Route path="/result/:id" element={<Result />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/supplies" element={<Supplies />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/records" element={<Records />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}
