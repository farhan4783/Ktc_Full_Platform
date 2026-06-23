import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface College {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
  logoUrl: string | null;
  createdAt: string;
  _count: {
    students: number;
    batches: number;
  };
}

export const Colleges: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/colleges', {
        params: { page, limit: 10, search: search || undefined },
      });
      setColleges(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load colleges', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, [page, search]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setSelectedId(null);
    setName('');
    setCode('');
    setCity('');
    setStateName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (college: College) => {
    setIsEdit(true);
    setSelectedId(college.id);
    setName(college.name);
    setCode(college.code);
    setCity(college.city || '');
    setStateName(college.state || '');
    // Fetch details for full contact info
    apiClient.get(`/colleges/${college.id}`).then((res) => {
      const data = res.data.data;
      setContactName(data.contactName || '');
      setContactEmail(data.contactEmail || '');
      setContactPhone(data.contactPhone || '');
    });
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      setError('Name and Code are required');
      return;
    }

    const payload = {
      name,
      code,
      city: city || null,
      state: stateName || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
    };

    try {
      if (isEdit && selectedId) {
        await apiClient.patch(`/colleges/${selectedId}`, payload);
      } else {
        await apiClient.post('/colleges', payload);
      }
      setIsOpen(false);
      fetchColleges();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this college?')) return;
    try {
      await apiClient.delete(`/colleges/${id}`);
      fetchColleges();
    } catch (err) {
      console.error('Delete failed', err);
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
            placeholder="Search colleges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
          />
        </div>

        {/* Add College button */}
        {isSuperAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>ADD COLLEGE</span>
          </button>
        )}
      </div>

      {/* College Table */}
      <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">College Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Batches</th>
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
              ) : colleges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No partner colleges found.
                  </td>
                </tr>
              ) : (
                colleges.map((college) => (
                  <tr key={college.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{college.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{college.code}</td>
                    <td className="px-6 py-4">
                      {college.city && college.state ? `${college.city}, ${college.state}` : 'Not Specified'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-100">{college._count.batches}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-100">{college._count.students}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        college.isActive ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/30 text-red-400 border border-red-500/20'
                      }`}>
                        {college.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(college)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-brand/10 hover:border-brand/20 text-slate-400 hover:text-brand transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(college.id)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-950/20 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* Dialog modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {isEdit ? 'EDIT COLLEGE DETAILS' : 'REGISTER NEW PARTNER COLLEGE'}
            </h3>

            {error && (
              <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">College Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. IIT Bombay"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">College Code</label>
                  <input
                    type="text"
                    value={code}
                    disabled={isEdit}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. IITB"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <hr className="border-white/5 my-4" />

              <h4 className="text-xs font-bold text-brand uppercase tracking-wider mb-2">Point of Contact</h4>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Dr. Rajesh Kumar"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="rajesh@college.edu"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)] transition-all hover:shadow-[0_0_25px_rgba(0,210,255,0.3)]"
              >
                {isEdit ? 'SAVE CHANGES' : 'REGISTER COLLEGE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colleges;
