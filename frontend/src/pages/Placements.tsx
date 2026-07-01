import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Search, X, Plus } from 'lucide-react';

interface PlacementRecord {
  id: string;
  companyName: string;
  role: string;
  ctcLpa: number | null;
  offerType: 'FULL_TIME' | 'INTERNSHIP' | 'CONTRACT';
  offerDate: string;
  placementSource: string;
  status: string;
  verifiedAt: string | null;
  student: {
    studentCode: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    college: {
      name: string;
    } | null;
  };
}

export const Placements: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCollegeAdmin = user?.role === 'COLLEGE_ADMIN';

  const [records, setRecords] = useState<PlacementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');
  const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState<{ id: string; studentCode: string; user: { firstName: string; lastName: string } }[]>([]);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [ctcLpa, setCtcLpa] = useState<number>(5);
  const [offerType, setOfferType] = useState<'FULL_TIME' | 'INTERNSHIP' | 'CONTRACT'>('FULL_TIME');
  const [offerDate, setOfferDate] = useState('');
  const [placementSource, setPlacementSource] = useState('JOB_BOARD');
  const [error, setError] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedRecordId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleVerifyDrag = async (id: string, approve: boolean) => {
    try {
      await apiClient.post(`/placements/${id}/verify`, {
        status: approve ? 'VERIFIED' : 'REJECTED',
        remarks: approve ? 'Verified via Kanban board.' : 'Rejected via Kanban board.',
      });
      fetchPlacements();
    } catch (err) {
      console.error('Failed to verify record', err);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'PENDING' | 'VERIFIED' | 'REJECTED') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedRecordId;
    if (!id) return;
    
    if (targetStatus === 'VERIFIED') {
      await handleVerifyDrag(id, true);
    } else if (targetStatus === 'REJECTED') {
      await handleVerifyDrag(id, false);
    } else {
      try {
        await apiClient.post(`/placements/${id}/verify`, { status: 'PENDING', remarks: 'Reverted to pending.' });
        fetchPlacements();
      } catch (_) {}
    }
    setDraggedRecordId(null);
  };

  const fetchPlacements = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/placements', {
        params: { page, limit: 10, search: search || undefined },
      });
      setRecords(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load placement records', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get('/students', { params: { limit: 100 } });
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, [page, search]);

  useEffect(() => {
    if (isSuperAdmin || isCollegeAdmin) {
      fetchStudents();
    }
  }, []);

  const handleVerify = async (id: string, approve: boolean) => {
    if (!window.confirm(`Are you sure you want to ${approve ? 'verify' : 'reject'} this placement record?`)) return;
    try {
      await apiClient.post(`/placements/${id}/verify`, {
        status: approve ? 'VERIFIED' : 'REJECTED',
        remarks: approve ? 'Verified by administrator.' : 'Rejected by administrator.',
      });
      fetchPlacements();
    } catch (err) {
      console.error('Failed to verify record', err);
    }
  };

  const handleOpenCreate = () => {
    setStudentId('');
    setCompanyName('');
    setRoleName('');
    setCtcLpa(5);
    setOfferType('FULL_TIME');
    setOfferDate('');
    setPlacementSource('JOB_BOARD');
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !companyName || !roleName || !offerDate) {
      setError('Please fill in all required fields');
      return;
    }

    const payload = {
      studentId,
      companyName,
      role: roleName,
      ctcLpa: Number(ctcLpa),
      offerType,
      offerDate: new Date(offerDate).toISOString(),
      placementSource,
    };

    try {
      await apiClient.post('/placements', payload);
      setIsOpen(false);
      fetchPlacements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to report placement record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search company or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
          />
        </div>

        {/* View Mode & Report Button */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-gradient-to-r from-brand-dark to-brand-electric text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-gradient-to-r from-brand-dark to-brand-electric text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kanban Board
            </button>
          </div>

          {(isSuperAdmin || isCollegeAdmin) && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>REPORT PLACEMENT</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'TABLE' ? (
        <>
          {/* Placements Grid Table */}
          <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-300">
                <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-4">Student ID / Name</th>
                    <th className="px-6 py-4">College</th>
                    <th className="px-6 py-4">Company Details</th>
                    <th className="px-6 py-4">Package (LPA)</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    {(isSuperAdmin || isCollegeAdmin) && <th className="px-6 py-4 text-right">Verification</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10">
                        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        No placement records verified.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 space-y-1">
                          <span className="font-semibold text-white block">
                            {rec.student.user.firstName} {rec.student.user.lastName}
                          </span>
                          <span className="font-mono text-xs text-brand block">{rec.student.studentCode}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-400">{rec.student.college?.name || 'N/A'}</td>
                        <td className="px-6 py-4 space-y-1">
                          <span className="font-semibold text-white block">{rec.companyName}</span>
                          <span className="text-xs text-slate-500 block">{rec.role}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {rec.ctcLpa ? `${rec.ctcLpa} LPA` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-400">{rec.offerType}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.verifiedAt
                              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-950/30 text-amber-400 border border-amber-500/20'
                          }`}>
                            {rec.verifiedAt ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </td>
                        {(isSuperAdmin || isCollegeAdmin) && (
                          <td className="px-6 py-4 text-right space-x-2">
                            {!rec.verifiedAt && (
                              <>
                                <button
                                  onClick={() => handleVerify(rec.id, true)}
                                  className="p-1.5 rounded bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleVerify(rec.id, false)}
                                  className="p-1.5 rounded bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 hover:text-red-300"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {rec.verifiedAt && (
                              <span className="text-xs text-slate-500 font-semibold italic">Verified</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-2 px-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 disabled:opacity-50 hover:bg-white/10 transition-all"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 disabled:opacity-50 hover:bg-white/10 transition-all"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        /* Kanban Pipeline Board */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          {/* Column Group 1: Pending */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'PENDING')}
            className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col space-y-4 max-h-[70vh] overflow-y-auto"
          >
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Pending ({records.filter(r => !r.verifiedAt && r.status !== 'REJECTED').length})</h4>
            {records.filter(r => !r.verifiedAt && r.status !== 'REJECTED').map(rec => (
              <div
                key={rec.id}
                draggable
                onDragStart={(e) => handleDragStart(e, rec.id)}
                className="p-4 bg-slate-950/80 border border-white/5 hover:border-brand/40 rounded-xl cursor-grab active:cursor-grabbing space-y-2 transition-all"
              >
                <p className="text-[10px] font-mono text-brand font-semibold">{rec.student.studentCode}</p>
                <h5 className="font-bold text-white text-sm">{rec.student.user.firstName} {rec.student.user.lastName}</h5>
                <p className="text-xs text-slate-400">{rec.companyName} — {rec.role}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs">
                  <span className="font-bold text-slate-200">{rec.ctcLpa ? `${rec.ctcLpa} LPA` : 'N/A'}</span>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 bg-white/5 px-2 py-0.5 rounded">{rec.offerType}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Column Group 2: Verified */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'VERIFIED')}
            className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col space-y-4 max-h-[70vh] overflow-y-auto"
          >
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Verified ({records.filter(r => r.verifiedAt).length})</h4>
            {records.filter(r => r.verifiedAt).map(rec => (
              <div
                key={rec.id}
                draggable
                onDragStart={(e) => handleDragStart(e, rec.id)}
                className="p-4 bg-slate-950/80 border border-white/5 hover:border-brand/40 rounded-xl cursor-grab active:cursor-grabbing space-y-2 transition-all"
              >
                <p className="text-[10px] font-mono text-brand font-semibold">{rec.student.studentCode}</p>
                <h5 className="font-bold text-white text-sm">{rec.student.user.firstName} {rec.student.user.lastName}</h5>
                <p className="text-xs text-slate-400">{rec.companyName} — {rec.role}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs">
                  <span className="font-bold text-slate-200">{rec.ctcLpa ? `${rec.ctcLpa} LPA` : 'N/A'}</span>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 bg-white/5 px-2 py-0.5 rounded">{rec.offerType}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Column Group 3: Rejected */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'REJECTED')}
            className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col space-y-4 max-h-[70vh] overflow-y-auto"
          >
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Rejected ({records.filter(r => r.status === 'REJECTED').length})</h4>
            {records.filter(r => r.status === 'REJECTED').map(rec => (
              <div
                key={rec.id}
                draggable
                onDragStart={(e) => handleDragStart(e, rec.id)}
                className="p-4 bg-slate-950/80 border border-white/5 hover:border-brand/40 rounded-xl cursor-grab active:cursor-grabbing space-y-2 transition-all"
              >
                <p className="text-[10px] font-mono text-brand font-semibold">{rec.student.studentCode}</p>
                <h5 className="font-bold text-white text-sm">{rec.student.user.firstName} {rec.student.user.lastName}</h5>
                <p className="text-xs text-slate-400">{rec.companyName} — {rec.role}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs">
                  <span className="font-bold text-slate-200">{rec.ctcLpa ? `${rec.ctcLpa} LPA` : 'N/A'}</span>
                  <span className="text-[9px] uppercase font-semibold text-slate-500 bg-white/5 px-2 py-0.5 rounded">{rec.offerType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">REPORT PLACEMENT RECORD</h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Select Student *</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                >
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.user.firstName} {s.user.lastName} ({s.studentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Role *</label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Package (LPA) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ctcLpa}
                    onChange={(e) => setCtcLpa(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Offer Type</label>
                  <select
                    value={offerType}
                    onChange={(e: any) => setOfferType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="CONTRACT">Contractual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Offer Date *</label>
                  <input
                    type="date"
                    value={offerDate}
                    onChange={(e) => setOfferDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Placement Source</label>
                  <select
                    value={placementSource}
                    onChange={(e) => setPlacementSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="COLLEGE_DRIVE">College Campus Drive</option>
                    <option value="JOB_BOARD">Job Board (Direct)</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="SELF">Self Sourced</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                REPORT PLACEMENT
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Placements;
