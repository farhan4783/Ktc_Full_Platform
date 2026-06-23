import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Search, Edit2, X, AlertCircle } from 'lucide-react';

interface Trainer {
  id: string;
  bio: string | null;
  specialisations: string[];
  experienceYears: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

export const Trainers: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  // Form State
  const [bio, setBio] = useState('');
  const [specialisations, setSpecialisations] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/trainers', {
        params: { page, limit: 10, search: search || undefined },
      });
      setTrainers(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load trainers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, [page, search]);

  const handleOpenEdit = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setBio(trainer.bio || '');
    setSpecialisations(trainer.specialisations.join(', '));
    setExperienceYears(trainer.experienceYears || 0);
    setLinkedinUrl(trainer.linkedinUrl || '');
    setGithubUrl(trainer.githubUrl || '');
    setFirstName(trainer.user.firstName);
    setLastName(trainer.user.lastName);
    setPhone(trainer.user.phone || '');
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    const payload = {
      bio: bio || null,
      specialisations: specialisations ? specialisations.split(',').map(s => s.trim()) : [],
      experienceYears: experienceYears ? Number(experienceYears) : null,
      linkedinUrl: linkedinUrl || null,
      githubUrl: githubUrl || null,
      firstName,
      lastName,
      phone: phone || null,
    };

    try {
      await apiClient.patch(`/trainers/${selectedTrainer.id}`, payload);
      setIsOpen(false);
      fetchTrainers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update trainer profile');
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
            placeholder="Search trainers by spec, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
          />
        </div>
      </div>

      {/* Trainers Table */}
      <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Trainer Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4">Specialisations</th>
                <th className="px-6 py-4">Socials</th>
                {isSuperAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : trainers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    No trainers found.
                  </td>
                </tr>
              ) : (
                trainers.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">
                      {trainer.user.firstName} {trainer.user.lastName}
                    </td>
                    <td className="px-6 py-4">{trainer.user.email}</td>
                    <td className="px-6 py-4 font-bold text-slate-200">
                      {trainer.experienceYears ? `${trainer.experienceYears} Years` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {trainer.specialisations.map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20"
                          >
                            {spec}
                          </span>
                        ))}
                        {trainer.specialisations.length === 0 && <span className="text-slate-500">N/A</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      {trainer.linkedinUrl && (
                        <a
                          href={trainer.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand hover:underline"
                        >
                          LinkedIn
                        </a>
                      )}
                      {trainer.githubUrl && (
                        <a
                          href={trainer.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-400 hover:underline"
                        >
                          GitHub
                        </a>
                      )}
                      {!trainer.linkedinUrl && !trainer.githubUrl && <span className="text-slate-500">N/A</span>}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(trainer)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-brand/10 hover:border-brand/20 text-slate-400 hover:text-brand transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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

      {/* Edit Dialog Modal */}
      {isOpen && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">EDIT TRAINER PROFILE</h3>

            {error && (
              <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Experience (Years)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Specialisations (Comma separated)</label>
                <input
                  type="text"
                  value={specialisations}
                  onChange={(e) => setSpecialisations(e.target.value)}
                  placeholder="e.g. React, Node.js, TypeScript"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">LinkedIn URL</label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">GitHub URL</label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)] transition-all hover:shadow-[0_0_25px_rgba(0,210,255,0.3)]"
              >
                SAVE CHANGES
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trainers;
