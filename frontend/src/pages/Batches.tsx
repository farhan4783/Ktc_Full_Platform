import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Plus, Search, Edit2, X } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  capacity: number;
  meetLink: string | null;
  notes: string | null;
  college: {
    id: string;
    name: string;
  };
  course: {
    id: string;
    title: string;
  };
  batchTrainers: {
    isPrimary: boolean;
    trainer: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }[];
  _count: {
    batchStudents: number;
  };
}

export const Batches: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Lists for dropdowns
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; user: { firstName: string; lastName: string } }[]>([]);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>('HYBRID');
  const [capacity, setCapacity] = useState<number>(60);
  const [meetLink, setMeetLink] = useState('');
  const [notes, setNotes] = useState('');
  const [primaryTrainerId, setPrimaryTrainerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/batches', {
        params: { page, limit: 10, search: search || undefined },
      });
      setBatches(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load batches', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    if (isSuperAdmin) {
      try {
        const [collegesRes, coursesRes, trainersRes] = await Promise.all([
          apiClient.get('/colleges', { params: { limit: 100 } }),
          apiClient.get('/courses', { params: { limit: 100 } }),
          apiClient.get('/trainers', { params: { limit: 100 } }),
        ]);
        setColleges(collegesRes.data.data || []);
        setCourses(coursesRes.data.data || []);
        setTrainers(trainersRes.data.data || []);
      } catch (err) {
        console.error('Failed to load dropdowns', err);
      }
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page, search]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setSelectedId(null);
    setName('');
    setCollegeId('');
    setCourseId('');
    setStartDate('');
    setEndDate('');
    setMode('HYBRID');
    setCapacity(60);
    setMeetLink('');
    setNotes('');
    setPrimaryTrainerId('');
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (b: Batch) => {
    setIsEdit(true);
    setSelectedId(b.id);
    setName(b.name);
    setCollegeId(b.college.id);
    setCourseId(b.course.id);
    setStartDate(new Date(b.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(b.endDate).toISOString().split('T')[0]);
    setMode(b.mode);
    setCapacity(b.capacity);
    setMeetLink(b.meetLink || '');
    setNotes(b.notes || '');
    // Note: primaryTrainerId in model represents Trainer profile ID
    // Let's set it if it exists.
    setPrimaryTrainerId(''); // will let user reselect or use default
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !collegeId || !courseId || !startDate || !endDate) {
      setError('All fields marked * are required');
      return;
    }

    const payload = {
      name,
      collegeId,
      courseId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      mode,
      capacity: Number(capacity),
      meetLink: meetLink || null,
      notes: notes || null,
      primaryTrainerId: primaryTrainerId || undefined,
    };

    try {
      if (isEdit && selectedId) {
        await apiClient.patch(`/batches/${selectedId}`, payload);
      } else {
        await apiClient.post('/batches', payload);
      }
      setIsOpen(false);
      fetchBatches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save batch');
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
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
          />
        </div>

        {/* Add button */}
        {isSuperAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE BATCH</span>
          </button>
        )}
      </div>

      {/* Batches Table */}
      <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Batch Details</th>
                <th className="px-6 py-4">Associated College</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Primary Trainer</th>
                <th className="px-6 py-4 text-center">Students</th>
                <th className="px-6 py-4 text-center">Status</th>
                {isSuperAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No active batches scheduled.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const primaryTrainer = batch.batchTrainers.find(t => t.isPrimary);
                  const trainerName = primaryTrainer
                    ? `${primaryTrainer.trainer.user.firstName} ${primaryTrainer.trainer.user.lastName}`
                    : 'Unassigned';

                  return (
                    <tr key={batch.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 space-y-1">
                        <span className="font-semibold text-white block">{batch.name}</span>
                        <span className="font-mono text-xs text-brand block">{batch.code}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{batch.college.name}</td>
                      <td className="px-6 py-4 text-slate-300">{batch.course.title}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-400">{trainerName}</td>
                      <td className="px-6 py-4 text-center font-bold text-white">
                        {batch._count.batchStudents} / {batch.capacity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          batch.status === 'ACTIVE'
                            ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20'
                            : batch.status === 'UPCOMING'
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-900 text-slate-400 border border-slate-700/20'
                        }`}>
                          {batch.status}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(batch)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-brand/10 hover:border-brand/20 text-slate-400 hover:text-brand transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
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

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {isEdit ? 'EDIT BATCH DETAILS' : 'SCHEDULER: NEW ACADEMIC BATCH'}
            </h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Batch Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Full Stack Engineering - Cohort 1"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Target College *</label>
                  <select
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="">Select College</option>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Course *</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Batch Mode</label>
                  <select
                    value={mode}
                    onChange={(e: any) => setMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="ONLINE">Online (Virtual)</option>
                    <option value="OFFLINE">Offline (In-Person)</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Class Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Meet / Virtual Live Link</label>
                <input
                  type="text"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Primary Trainer Allocation</label>
                <select
                  value={primaryTrainerId}
                  onChange={(e) => setPrimaryTrainerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                >
                  <option value="">Choose Instructor</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.user.firstName} {t.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Schedules & Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                {isEdit ? 'SAVE CHANGES' : 'CREATE BATCH'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
