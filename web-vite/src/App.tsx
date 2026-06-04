import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import RequestPage from './pages/RequestPage';
import QRPage from './pages/QRPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-beige text-delft selection:bg-pistachio/60 selection:text-emerald-900 font-sans">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/request" element={<RequestPage />} />
          <Route path="/qr/:requestId" element={<QRPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
