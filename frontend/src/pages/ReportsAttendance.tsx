import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Search, Calendar, Users, ShieldCheck, AlertCircle } from 'lucide-react';

interface AttendanceSummary {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  attendancePercentage: number;
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
}

interface BatchAttendanceReport {
  batchName: string;
  batchCode: string;
  sessions: {
    id: string;
    sessionDate: string;
    topicCovered: string | null;
    attendanceMarked: boolean;
  }[];
  grid: AttendanceSummary[];
}

export const ReportsAttendance: React.FC = () => {
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [report, setReport] = useState<BatchAttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const res = await apiClient.get('/batches', { params: { limit: 100 } });
      setBatches(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedBatchId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  const generateReport = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/attendance/batches/${selectedBatchId}`);
      setReport(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance grid');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      generateReport();
    }
  }, [selectedBatchId]);

  const filteredGrid = report?.grid.filter((item) => {
    const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      item.studentCode.toLowerCase().includes(search.toLowerCase())
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">ATTENDANCE AUDIT REPORTS</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time attendance summary and cohort percentages.</p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">Select Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-brand/40 bg-slate-900"
          >
            <option value="">Choose Batch...</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-sm text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glow-card rounded-2xl p-5 border border-white/5 bg-slate-950/40 text-center">
              <Calendar className="w-6 h-6 text-brand mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Class Sessions</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{report.sessions.length}</span>
            </div>
            <div className="glow-card rounded-2xl p-5 border border-white/5 bg-slate-950/40 text-center">
              <Users className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Enrolled Cohort</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{report.grid.length}</span>
            </div>
            <div className="glow-card rounded-2xl p-5 border border-white/5 bg-slate-950/40 text-center">
              <ShieldCheck className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Eligible students ({'>'}75%)</span>
              <span className="text-2xl font-extrabold text-purple-400 mt-1 block">
                {report.grid.filter(g => g.attendancePercentage >= 75).length}
              </span>
            </div>
          </div>

          {/* Search Table */}
          <div className="space-y-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>

            <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-300">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
                    <tr>
                      <th className="px-6 py-4">Student ID</th>
                      <th className="px-6 py-4">Full Name</th>
                      <th className="px-6 py-4 text-center">Present</th>
                      <th className="px-6 py-4 text-center">Absent</th>
                      <th className="px-6 py-4 text-center">Late</th>
                      <th className="px-6 py-4 text-center">Excused</th>
                      <th className="px-6 py-4 text-center">Marked Sessions</th>
                      <th className="px-6 py-4 text-right">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredGrid.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500">
                          No matching records.
                        </td>
                      </tr>
                    ) : (
                      filteredGrid.map((row) => (
                        <tr key={row.studentId} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-brand font-semibold">{row.studentCode}</td>
                          <td className="px-6 py-4 font-semibold text-white">
                            {row.firstName} {row.lastName}
                          </td>
                          <td className="px-6 py-4 text-center text-emerald-400 font-bold">{row.summary.present}</td>
                          <td className="px-6 py-4 text-center text-red-400 font-bold">{row.summary.absent}</td>
                          <td className="px-6 py-4 text-center text-amber-400">{row.summary.late}</td>
                          <td className="px-6 py-4 text-center text-slate-500">{row.summary.excused}</td>
                          <td className="px-6 py-4 text-center">{row.summary.total}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-bold px-2 py-0.5 rounded ${
                              row.attendancePercentage >= 75
                                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10'
                                : 'bg-red-950/20 text-red-400 border border-red-500/10'
                            }`}>
                              {row.attendancePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[40vh] flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01] p-10 text-center">
          <p className="text-sm text-slate-500">Please select a batch above to load real-time attendance matrix calculations.</p>
        </div>
      )}
    </div>
  );
};

export default ReportsAttendance;
