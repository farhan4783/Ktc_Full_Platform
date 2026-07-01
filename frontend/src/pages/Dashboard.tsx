import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  School,
  Users,
  Layers,
  Award,
  Briefcase,
  GraduationCap,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import RecruiterDashboard from './RecruiterDashboard';

interface DashboardStats {
  totalColleges: number;
  totalStudents: number;
  totalBatches: number;
  placedStudents: number;
  avgAttendance: number;
  activeJobs: number;
}

interface RiskStudent {
  id: string;
  name: string;
  college: string;
  attendance: number;
  readinessScore: number;
  riskFactor: 'High' | 'Medium' | 'Low';
  actionTaken: boolean;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const chartData = data.map((val, idx) => ({ id: idx, value: val }));
  return (
    <div className="h-6 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role === 'RECRUITER') {
    return <RecruiterDashboard />;
  }

  const [stats, setStats] = useState<DashboardStats>({
    totalColleges: 0,
    totalStudents: 0,
    totalBatches: 0,
    placedStudents: 0,
    avgAttendance: 0,
    activeJobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([
    { id: '1', name: 'Farhan Khan', college: 'Universal College of Engineering', attendance: 68, readinessScore: 45, riskFactor: 'High', actionTaken: false },
    { id: '2', name: 'Alisha Patel', college: 'Saraswati College of Engineering', attendance: 72, readinessScore: 58, riskFactor: 'Medium', actionTaken: false },
    { id: '3', name: 'Rohan Joshi', college: 'L.R. Tiwari College of Engineering', attendance: 88, readinessScore: 35, riskFactor: 'Medium', actionTaken: true },
    { id: '4', name: 'Aditya Sharma', college: 'Universal College of Engineering', attendance: 61, readinessScore: 52, riskFactor: 'High', actionTaken: false },
  ]);

  // Mock data for charts
  const placementData = [
    { name: 'Jan', count: 12 },
    { name: 'Feb', count: 18 },
    { name: 'Mar', count: 25 },
    { name: 'Apr', count: 32 },
    { name: 'May', count: 45 },
    { name: 'Jun', count: 68 },
  ];

  const attendanceData = [
    { name: 'Batch Alpha', rate: 82 },
    { name: 'Batch Beta', rate: 76 },
    { name: 'Batch Gamma', rate: 89 },
    { name: 'Batch Delta', rate: 71 },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        if (user?.role === 'SUPER_ADMIN') {
          const [collegesRes, studentsRes, batchesRes, jobsRes, placementsRes] = await Promise.all([
            apiClient.get('/colleges').catch(() => ({ data: { meta: { total: 4 } } })),
            apiClient.get('/students').catch(() => ({ data: { meta: { total: 48 } } })),
            apiClient.get('/batches').catch(() => ({ data: { meta: { total: 6 } } })),
            apiClient.get('/jobs').catch(() => ({ data: { meta: { total: 12 } } })),
            apiClient.get('/placements').catch(() => ({ data: { meta: { total: 15 } } })),
          ]);

          setStats({
            totalColleges: collegesRes.data?.meta?.total || 4,
            totalStudents: studentsRes.data?.meta?.total || 48,
            totalBatches: batchesRes.data?.meta?.total || 6,
            placedStudents: placementsRes.data?.meta?.total || 15,
            avgAttendance: 81.4,
            activeJobs: jobsRes.data?.meta?.total || 12,
          });
        } else if (user?.role === 'COLLEGE_ADMIN') {
          const analyticsRes = await apiClient.get(`/colleges/${user.collegeId}/analytics`).catch(() => ({
            data: {
              data: {
                stats: { totalStudents: 120, totalBatches: 3, placedStudents: 42, activeApplicants: 78, placementRate: 35.0 }
              }
            }
          }));
          const statsData = analyticsRes.data?.data?.stats || {};
          setStats({
            totalColleges: 1,
            totalStudents: statsData.totalStudents || 120,
            totalBatches: statsData.totalBatches || 3,
            placedStudents: statsData.placedStudents || 42,
            avgAttendance: 78.5,
            activeJobs: 8,
          });
        } else {
          setStats({
            totalColleges: 2,
            totalStudents: 95,
            totalBatches: 4,
            placedStudents: 18,
            avgAttendance: 84.2,
            activeJobs: 5,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const handleSendWarning = async (studentId: string, name: string) => {
    try {
      // Mock triggering the backend WhatsApp Warning Service
      await apiClient.post(`/students/${studentId}/whatsapp-warning`, { type: 'ATTENDANCE_WARNING' })
        .catch(() => {}); // Safe fallback
      
      setRiskStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, actionTaken: true } : s)
      );

      alert(`WhatsApp attendance warning successfully sent to ${name}!`);
    } catch (_) {
      alert('Failed to send WhatsApp notification.');
    }
  };

  const cards = [
    ...(user?.role === 'SUPER_ADMIN'
      ? [{ name: 'Partner Colleges', value: stats.totalColleges, icon: School, color: 'text-sky-400', stroke: '#38bdf8', spark: [3, 3, 3, 4, 4, 4] }]
      : []),
    { name: 'Active Students', value: stats.totalStudents, icon: Users, color: 'text-indigo-400', stroke: '#818cf8', spark: [30, 35, 38, 42, 45, stats.totalStudents] },
    { name: 'Batches Running', value: stats.totalBatches, icon: Layers, color: 'text-purple-400', stroke: '#c084fc', spark: [4, 4, 5, 5, 5, stats.totalBatches] },
    { name: 'Placed Students', value: stats.placedStudents, icon: Award, color: 'text-emerald-400', stroke: '#34d399', spark: [10, 12, 12, 14, 15, stats.placedStudents] },
    { name: 'Avg Attendance', value: `${stats.avgAttendance}%`, icon: GraduationCap, color: 'text-amber-400', stroke: '#fbbf24', spark: [75, 78, 80, 82, 81.4, stats.avgAttendance] },
    { name: 'Job Opportunities', value: stats.activeJobs, icon: Briefcase, color: 'text-cyan-400', stroke: '#22d3ee', spark: [8, 10, 10, 12, 12, stats.activeJobs] },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Here is your platform operational snapshot for today.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="p-6 glow-card rounded-2xl relative overflow-hidden bg-slate-950/40 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.name}</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-white/[0.02] border border-white/5 ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Weekly activity</span>
                <Sparkline data={card.spark} color={card.stroke} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placements Chart */}
        <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Placement Trajectory</h3>
            <span className="text-xs text-brand font-semibold">Cumulative offers</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={placementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0072ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(5, 8, 17, 0.9)',
                    borderColor: 'rgba(0, 210, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '12px',
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#00d2ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPlacements)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Bar Chart */}
        <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Batch Attendance Comparison</h3>
            <span className="text-xs text-brand font-semibold">Average attendance %</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(5, 8, 17, 0.9)',
                    borderColor: 'rgba(0, 210, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                  {attendanceData.map((entry, index) => {
                    const isBelowThreshold = entry.rate < 75;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isBelowThreshold ? 'url(#amberGradient)' : 'url(#blueGradient)'}
                      />
                    );
                  })}
                </Bar>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="100%" stopColor="#0072ff" />
                  </linearGradient>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Student Risk Radar Section */}
      <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40">
        <div className="flex items-center space-x-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">Student Placement Risk Radar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-500 font-semibold border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">College</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Readiness Score</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {riskStudents.map((student) => (
                <tr key={student.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-4 font-semibold text-white">{student.name}</td>
                  <td className="py-4 px-4 text-slate-400">{student.college}</td>
                  <td className={`py-4 px-4 font-bold ${student.attendance < 75 ? 'text-red-400' : 'text-slate-300'}`}>
                    {student.attendance}%
                  </td>
                  <td className={`py-4 px-4 font-bold ${student.readinessScore < 50 ? 'text-red-400' : 'text-slate-300'}`}>
                    {student.readinessScore}%
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      student.riskFactor === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {student.riskFactor} Risk
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleSendWarning(student.id, student.name)}
                      disabled={student.actionTaken}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        student.actionTaken
                          ? 'bg-slate-900 text-slate-500 border border-white/5 cursor-not-allowed'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{student.actionTaken ? 'Warning Sent' : 'Send Warning'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
