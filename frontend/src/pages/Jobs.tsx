import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Plus, Search, Edit2, Trash2, X, Briefcase, MapPin, Building, Calendar, DollarSign } from 'lucide-react';

interface JobOpportunity {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  jobType: 'FULL_TIME' | 'INTERNSHIP' | 'CONTRACT';
  ctcInfo: string | null;
  experienceRequired: string | null;
  description: string;
  requirements: string[] | null;
  applicationDeadline: string | null;
  isActive: boolean;
  createdAt: string;
}

export const Jobs: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCollegeAdmin = user?.role === 'COLLEGE_ADMIN';
  const canModifyJobs = isSuperAdmin || isCollegeAdmin;

  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState<'FULL_TIME' | 'INTERNSHIP' | 'CONTRACT'>('FULL_TIME');
  const [ctcInfo, setCtcInfo] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/jobs', {
        params: { page, limit: 10, search: search || undefined },
      });
      setJobs(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load job listings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, search]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setSelectedId(null);
    setTitle('');
    setCompanyName('');
    setLocation('');
    setJobType('FULL_TIME');
    setCtcInfo('');
    setExperienceRequired('');
    setDescription('');
    setRequirements('');
    setApplicationDeadline('');
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (job: JobOpportunity) => {
    setIsEdit(true);
    setSelectedId(job.id);
    setTitle(job.title);
    setCompanyName(job.companyName);
    setLocation(job.location || '');
    setJobType(job.jobType);
    setCtcInfo(job.ctcInfo || '');
    setExperienceRequired(job.experienceRequired || '');
    setDescription(job.description);
    setRequirements(job.requirements ? job.requirements.join('\n') : '');
    setApplicationDeadline(job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split('T')[0] : '');
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !companyName || !description) {
      setError('Title, Company Name, and Job Description are required');
      return;
    }

    const payload = {
      title,
      companyName,
      location: location || null,
      jobType,
      ctcInfo: ctcInfo || null,
      experienceRequired: experienceRequired || null,
      description,
      requirements: requirements ? requirements.split('\n').filter(line => line.trim().length > 0) : null,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : null,
    };

    try {
      if (isEdit && selectedId) {
        await apiClient.patch(`/jobs/${selectedId}`, payload);
      } else {
        await apiClient.post('/jobs', payload);
      }
      setIsOpen(false);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save job opportunity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await apiClient.delete(`/jobs/${id}`);
      fetchJobs();
    } catch (err) {
      console.error('Delete job failed', err);
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
            placeholder="Search job title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
          />
        </div>

        {/* Add Job Opportunity button */}
        {canModifyJobs && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>POST JOB OPPORTUNITY</span>
          </button>
        )}
      </div>

      {/* Job Postings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="md:col-span-2 text-center py-20">
            <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 text-slate-500">
            No job opportunities posted.
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                      {job.jobType}
                    </span>
                    <h3 className="text-md font-bold text-white mt-1.5">{job.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Building className="w-3.5 h-3.5 text-brand" />
                      <span>{job.companyName}</span>
                    </div>
                  </div>

                  {canModifyJobs && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(job)}
                        className="p-2 rounded bg-white/5 hover:bg-brand/15 text-slate-400 hover:text-brand border border-white/10"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-2 rounded bg-white/5 hover:bg-red-950/30 text-slate-400 hover:text-red-400 border border-white/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-3">{job.description}</p>
              </div>

              <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{job.location || 'Remote'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  <span>{job.ctcInfo || 'Best in Industry'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <span>{job.experienceRequired || 'Freshers / No Exp'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Dead: {job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          ))
        )}
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
              {isEdit ? 'EDIT JOB DETAILS' : 'POST A NEW JOB OPPORTUNITY'}
            </h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Associate React Developer"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. KodeToCareer Tech"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore or Remote"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Job Type</label>
                  <select
                    value={jobType}
                    onChange={(e: any) => setJobType(e.target.value)}
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
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Compensation (CTC)</label>
                  <input
                    type="text"
                    value={ctcInfo}
                    onChange={(e) => setCtcInfo(e.target.value)}
                    placeholder="e.g. 6-8 LPA"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Exp Required</label>
                  <input
                    type="text"
                    value={experienceRequired}
                    onChange={(e) => setExperienceRequired(e.target.value)}
                    placeholder="e.g. 0-2 Years"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Job Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Responsibilities, role overview, etc."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Requirements (one per line)</label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                  placeholder="ReactJS&#10;TypeScript&#10;Good Communication"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Deadline Date</label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                POST JOB OPPORTUNITY
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
