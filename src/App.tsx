import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StudentLayout } from './components/layouts/StudentLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { StudentLogin } from './pages/student/StudentLogin';
import { StudentRegistration } from './pages/student/StudentRegistration';
import { AdminLogin } from './pages/admin/AdminLogin';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ReportIncident } from './pages/student/ReportIncident';
import { CommunityFeed } from './pages/student/CommunityFeed';
import { UserProfile } from './pages/student/UserProfile';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ReportVerification } from './pages/admin/ReportVerification';
import { Analytics } from './pages/admin/Analytics';

export function App() {
  return <Router>
      <Routes>
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegistration />} />
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="report" element={<ReportIncident />} />
          <Route path="feed" element={<CommunityFeed />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* TBA: add admin verification function to avoid access from non-admin*/}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard/>} />
          <Route path='/admin/reports' element={<ReportVerification/>} />
          <Route path='/admin/analytics' element={<Analytics/>} />
        </Route>
        <Route path="/" element={<Navigate to="/student/login" replace />} />
      </Routes>
    </Router>;
}