import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Briefcase,
  Megaphone,
  LogOut,
  Bell,
  Menu,
  X,
  FileCheck,
  BarChart3,
  Award
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  // Determine sidebar items based on user role
  const getSidebarItems = (): SidebarItem[] => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Colleges', path: '/colleges', icon: School },
          { name: 'Students', path: '/students', icon: Users },
          { name: 'Trainers', path: '/trainers', icon: GraduationCap },
          { name: 'Courses', path: '/courses', icon: BookOpen },
          { name: 'Batches', path: '/batches', icon: Layers },
          { name: 'Cert Designer', path: '/certificate-designer', icon: Award },
          { name: 'Placements', path: '/placements', icon: Award },
          { name: 'Jobs', path: '/jobs', icon: Briefcase },
          { name: 'Communication', path: '/communication', icon: Megaphone },
        ];
      case 'COLLEGE_ADMIN':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Students', path: '/students', icon: Users },
          { name: 'Attendance Reports', path: '/reports/attendance', icon: BarChart3 },
          { name: 'Progress Reports', path: '/reports/progress', icon: BarChart3 },
          { name: 'Placements', path: '/placements', icon: Award },
        ];
      case 'TRAINER':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Attendance', path: '/attendance', icon: Layers },
          { name: 'Grading', path: '/grading', icon: FileCheck },
        ];
      case 'RECRUITER':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Search Candidates', path: '/recruiter/search', icon: Users },
          { name: 'Job Opportunities', path: '/jobs', icon: Briefcase },
        ];
      default:
        return [];
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const sidebarItems = getSidebarItems();

  const SidebarContent = () => (
    <div className="flex flex-col h-full glass-sidebar text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        {/* K logo element */}
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-dark to-brand-electric shadow-[0_0_12px_rgba(0,210,255,0.4)]">
          <span className="text-xl font-bold text-white tracking-tighter">K</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wide text-white leading-none">KODETOCAREER</span>
          <span className="text-[10px] text-brand font-medium tracking-widest mt-1">PLATFORM</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                isActive
                  ? 'bg-gradient-to-r from-brand-dark/20 to-brand-electric/10 text-brand border-l-2 border-brand shadow-[inset_0_0_12px_rgba(0,210,255,0.05)]'
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-brand' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-white/5 bg-white/[0.01] backdrop-blur-sm">
        <div className="flex items-center gap-3 px-2 py-3 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-semibold">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-medium text-white truncate leading-none mb-1">
              {user.firstName} {user.lastName}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 hover:border-red-500/30 text-xs font-semibold tracking-wide transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>SIGN OUT</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-brand-deep">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0 h-full">
        <SidebarContent />
      </div>

      {/* Main Body container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-brand-deep/50 backdrop-blur-md border-b border-white/5 z-20">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Breadcrumb / Title */}
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              {sidebarItems.find((item) => item.path === location.pathname)?.name || 'KodetoCareer'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Button */}
            <button className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop shadow */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative w-64 max-w-xs h-full bg-brand-deep shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
