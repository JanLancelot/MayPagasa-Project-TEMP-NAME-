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
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard/>} />
        </Route>
        <Route path="/" element={<Navigate to="/student/login" replace />} />
      </Routes>
    </Router>;
}