import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Colleges from './pages/Colleges';
import Students from './pages/Students';
import Trainers from './pages/Trainers';
import Courses from './pages/Courses';
import Batches from './pages/Batches';
import Placements from './pages/Placements';
import Jobs from './pages/Jobs';
import Communication from './pages/Communication';
import ReportsAttendance from './pages/ReportsAttendance';
import ReportsProgress from './pages/ReportsProgress';
import Attendance from './pages/Attendance';
import Grading from './pages/Grading';


const queryClient = new QueryClient();

export default function App() {
  const loadSession = useAuthStore((state) => state.loadSession);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes inside DashboardLayout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    
                    {/* Super Admin / College Admin scoped */}
                    <Route path="colleges" element={<Colleges />} />
                    <Route path="students" element={<Students />} />
                    <Route path="trainers" element={<Trainers />} />
                    
                    {/* LMS Scoped */}
                    <Route path="courses" element={<Courses />} />
                    <Route path="batches" element={<Batches />} />
                    
                    {/* CRM & Placement Scoped */}
                    <Route path="placements" element={<Placements />} />
                    <Route path="jobs" element={<Jobs />} />
                    <Route path="communication" element={<Communication />} />
                    
                    {/* Reports Scoped */}
                    <Route path="reports/attendance" element={<ReportsAttendance />} />
                    <Route path="reports/progress" element={<ReportsProgress />} />
                    
                    {/* Trainer Scoped */}
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="grading" element={<Grading />} />
                    
                    {/* Default redirect to dashboard */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
