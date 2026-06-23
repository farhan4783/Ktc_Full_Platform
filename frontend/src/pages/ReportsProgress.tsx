import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Search, GraduationCap, Percent, Award, AlertCircle } from 'lucide-react';

interface BatchStudentEnrollment {
  id: string;
  status: string;
  completionPct: number;
  lastActiveAt: string | null;
  student: {
    id: string;
    studentCode: string;
    cgpa: number | null;
    placementStatus: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export const ReportsProgress: React.FC = () => {
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [enrollments, setEnrollments] = useState<BatchStudentEnrollment[]>([]);
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
      // Fetch details of batch including batchStudents
      const res = await apiClient.get(`/batches/${selectedBatchId}`);
      setEnrollments(res.data.data.batchStudents || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch batch progress details');
      setEnrollments([]);
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

  const filteredEnrollments = enrollments.filter((item) => {
    const fullName = `${item.student.user.firstName} ${item.student.user.lastName}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      item.student.studentCode.toLowerCase().includes(search.toLowerCase())
    );
  });

  const averageCompletion = enrollments.length > 0
    ? enrollments.reduce((acc, curr) => acc + curr.completionPct, 0) / enrollments.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">STUDENT ACADEMIC PROGRESS</h2>
          <p className="text-xs text-slate-500 mt-1">LMS completion metrics, grades, and profile status.</p>
        </div>

        {/* Batch Select */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">Select Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-brand/40 bg-slate-950"
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
      ) : enrollments.length > 0 ? (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glow-card rounded-2xl p-5 border border-white/5 bg-slate-950/40 text-center">
              <GraduationCap className="w-6 h-6 text-brand mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Average CGPA</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {(enrollments.reduce((acc, curr) => acc + (curr.student.cgpa || 0), 0) / enrollments.filter(e => e.student.cgpa).length || 0).toFixed(2)}
              </span>
            </div>
            <div className="glow-card rounded-2xl p-5 border border-white/5 bg-slate-950/40 text-center">
              <Percent className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg LMS Syllabus Comp</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{averageCompletion.toFixed(1)}%</span>
            </div>
            <div className="glow-card rounded-2xl p-5 border border-white/5 bg-slate-950/40 text-center">
              <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Actively Applying Students</span>
              <span className="text-2xl font-extrabold text-purple-400 mt-1 block">
                {enrollments.filter(e => e.student.placementStatus === 'ACTIVELY_APPLYING' || e.student.placementStatus === 'PLACED').length}
              </span>
            </div>
          </div>

          {/* Search bar */}
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

            {/* Progress grid */}
            <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-300">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
                    <tr>
                      <th className="px-6 py-4">Student ID</th>
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4 text-center">CGPA</th>
                      <th className="px-6 py-4 text-center">LMS Syllabus Progress</th>
                      <th className="px-6 py-4 text-center">Placement</th>
                      <th className="px-6 py-4 text-right">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredEnrollments.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-brand font-semibold">{row.student.studentCode}</td>
                        <td className="px-6 py-4 font-semibold text-white">
                          {row.student.user.firstName} {row.student.user.lastName}
                        </td>
                        <td className="px-6 py-4">{row.student.user.email}</td>
                        <td className="px-6 py-4 text-center font-bold">{row.student.cgpa || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-[150px] mx-auto">
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                              <div className="bg-brand h-full" style={{ width: `${row.completionPct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 shrink-0">{row.completionPct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                            row.student.placementStatus === 'PLACED'
                              ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10'
                              : 'bg-slate-900 text-slate-400 border border-slate-700/10'
                          }`}>
                            {row.student.placementStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500">
                          {row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[40vh] flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01] p-10 text-center">
          <p className="text-sm text-slate-500">No active students enrolled in this batch, or please choose a batch.</p>
        </div>
      )}
    </div>
  );
};

export default ReportsProgress;
