/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { ClassroomView } from './pages/ClassroomView';
import { PcaMobileView } from './pages/PcaMobileView';
import { Loading } from './components/Loading';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'teacher' }) {
    const { user, role, loading } = useAuth();
    
    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" />;
    
    if (requiredRole && role !== requiredRole) {
         if (role === 'admin') return <Navigate to="/admin" />;
         return <Navigate to="/teacher" />;
    }
    
    return children;
}

function DefaultHome() {
    const { user, role, loading } = useAuth();
    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" />;
    if (role === 'admin') return <Navigate to="/admin" />;
    return <Navigate to="/teacher" />;
}

export default function App() {
  return (
    <Router>
        <AuthProvider>
            <div className="w-full bg-slate-50 text-slate-900 font-sans flex flex-col min-h-screen print:h-auto print:bg-white print:overflow-visible">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/teacher/*" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
                    <Route path="/classroom/:classroomId" element={<ProtectedRoute requiredRole="teacher"><ClassroomView /></ProtectedRoute>} />
                    <Route path="/pca/:classroomId/:token" element={<PcaMobileView />} />
                    <Route path="/" element={<DefaultHome />} />
                </Routes>
            </div>
        </AuthProvider>
    </Router>
  );
}
