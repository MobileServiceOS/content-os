import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewJob from './pages/NewJob';
import ContentGenerator from './pages/ContentGenerator';
import ScriptWriter from './pages/ScriptWriter';
import ReviewResponse from './pages/ReviewResponse';
import SocialReply from './pages/SocialReply';
import Repurpose from './pages/Repurpose';
import Media from './pages/Media';
import GbpStudio from './pages/GbpStudio';
import SeoStudio from './pages/SeoStudio';
import Engagement from './pages/Engagement';
import Tasks from './pages/Tasks';
import Library from './pages/Library';
import Calendar from './pages/Calendar';
import BrandSettings from './pages/BrandSettings';
import Fingerprints from './pages/Fingerprints';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <BusinessProvider>
                  <Layout />
                </BusinessProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-job" element={<NewJob />} />
            <Route path="/generator" element={<ContentGenerator />} />
            <Route path="/script" element={<ScriptWriter />} />
            <Route path="/review" element={<ReviewResponse />} />
            <Route path="/social" element={<SocialReply />} />
            <Route path="/repurpose" element={<Repurpose />} />
            <Route path="/media" element={<Media />} />
            <Route path="/gbp" element={<GbpStudio />} />
            <Route path="/seo" element={<SeoStudio />} />
            <Route path="/engagement" element={<Engagement />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/library" element={<Library />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/brand" element={<BrandSettings />} />
            <Route path="/fingerprints" element={<Fingerprints />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
