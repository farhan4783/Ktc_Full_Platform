import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import {
  Search,
  Filter,
  Download,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  Briefcase,
  Building,
  Globe,
  Sliders,
  GraduationCap,
  CheckCircle2,
  Clock,
  Edit2,
  X,
  FileDown
} from 'lucide-react';

interface Student {
  id: string;
  studentCode: string;
  enrollmentNumber: string | null;
  branch: string | null;
  graduationYear: number | null;
  cgpa: number | null;
  skills: string[];
  resumeUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  readinessScore: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  college?: {
    name: string;
  };
}

interface JobOpportunity {
  id: string;
  title: string;
  companyName: string;
}

interface JobApplicant {
  id: string;
  status: 'INTERESTED' | 'APPLIED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';
  student: Student;
}

export const RecruiterDashboard: React.FC = () => {
  const { user, clearSession } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Student Search State
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [minCgpa, setMinCgpa] = useState<number>(0);
  const [minReadiness, setMinReadiness] = useState<number>(0);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Applicant Tracking State
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantStatusTab, setApplicantStatusTab] = useState<string>('ALL');

  // Load Recruiter Profile
  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await apiClient.get('/recruiters/profile');
      const data = res.data.data;
      setProfile(data);
      setEditCompanyName(data.companyName || '');
      setEditDesignation(data.designation || '');
      setEditWebsite(data.website || '');
    } catch (err) {
      console.error('Failed to load recruiter profile', err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch Students (only if profile is approved)
  const fetchStudents = async () => {
    if (!profile?.isApproved) return;
    try {
      setStudentsLoading(true);
      const params: any = {
        page,
        limit: 10,
        search: searchQuery || undefined,
        skills: skillsFilter || undefined,
        minCgpa: minCgpa > 0 ? minCgpa : undefined,
        minReadiness: minReadiness > 0 ? minReadiness : undefined,
      };

      const res = await apiClient.get('/recruiters/students', { params });
      setStudents(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch Jobs Posted by this Recruiter
  const fetchJobs = async () => {
    if (!profile?.isApproved) return;
    try {
      // Fetch jobs
      const res = await apiClient.get('/jobs');
      // Filter jobs where postedBy matches current user id
      const postedJobs = (res.data.data || []).filter(
        (job: any) => job.postedBy === user?.id
      );
      setJobs(postedJobs);
      if (postedJobs.length > 0) {
        setSelectedJobId(postedJobs[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  // Fetch Applicants for Selected Job
  const fetchApplicants = async () => {
    if (!selectedJobId) return;
    try {
      setApplicantsLoading(true);
      const res = await apiClient.get(`/recruiters/jobs/${selectedJobId}/interests`);
      setApplicants(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch applicants', err);
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.isApproved) {
      fetchStudents();
    }
  }, [profile, page, minCgpa, minReadiness]);

  useEffect(() => {
    if (profile?.isApproved) {
      fetchJobs();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedJobId) {
      fetchApplicants();
    }
  }, [selectedJobId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  // Profile Edit Submit
  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      const res = await apiClient.patch('/recruiters/profile', {
        companyName: editCompanyName,
        designation: editDesignation,
        website: editWebsite,
      });
      setProfile(res.data.data);
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // Toggle select student
  const handleToggleSelectStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // Toggle select all students
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  // Bulk download resumes
  const handleBulkDownload = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      setDownloadingZip(true);
      const response = await apiClient.post(
        '/recruiters/students/bulk-resume',
        { studentIds: selectedStudentIds },
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resumes_export_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download bulk resumes ZIP', err);
      alert('Error downloading ZIP. Some student resumes might be missing.');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Update Job Applicant Status
  const handleUpdateApplicantStatus = async (studentId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/recruiters/jobs/${selectedJobId}/interests/${studentId}`, {
        status: newStatus,
      });
      // Refresh applicants list
      fetchApplicants();
    } catch (err) {
      console.error('Failed to update candidate status', err);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  // Awaiting Approval Screen
  if (profile && !profile.isApproved) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10">
        <div className="p-8 glow-card rounded-2xl border border-white/5 bg-slate-950/40 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white tracking-wide uppercase">Profile Pending Verification</h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Your recruiter profile at <strong className="text-brand">{profile.companyName}</strong> is currently undergoing review by our administrators.
              You will be granted access to the placement student directory once approved.
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-semibold uppercase tracking-wider py-2">
            <span className="flex items-center gap-1.5"><Building className="w-4 h-4 text-brand" /> {profile.companyName}</span>
            {profile.designation && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-brand" /> {profile.designation}</span>}
            {profile.website && <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-brand" /> {profile.website}</span>}
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>EDIT DETAILS</span>
            </button>
            <button
              onClick={() => {
                clearSession();
                window.location.href = '/login';
              }}
              className="px-5 py-2.5 rounded-xl bg-red-950/20 hover:bg-red-950/45 text-red-400 border border-red-950/30 font-semibold text-xs transition-all"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Edit profile dialog in pending view */}
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/95 relative animate-in zoom-in-95 duration-150">
              <button onClick={() => setIsEditingProfile(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Update Registration Profile</h3>

              {profileError && <div className="p-3 mb-4 text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl">{profileError}</div>}

              <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Talent Acquisition Manager"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Website URL</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="e.g. https://company.com"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
                >
                  SAVE CHANGES
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Approved Recruiter Portal
  return (
    <div className="space-y-8">
      {/* Search & Filter Header Card */}
      <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide uppercase">Placement Student Directory</h1>
            <p className="text-xs text-slate-400 mt-1">Search, filter, and export candidate resumes based on real-time scores.</p>
          </div>
          {selectedStudentIds.length > 0 && (
            <button
              onClick={handleBulkDownload}
              disabled={downloadingZip}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-xs hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingZip ? 'PREPARING ZIP...' : `EXPORT ${selectedStudentIds.length} RESUMES`}</span>
            </button>
          )}
        </div>

        {/* Filter controls */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Keyword Search */}
          <div className="space-y-1.5 col-span-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Candidate Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Name, branch, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-xs placeholder-slate-600"
              />
            </div>
          </div>

          {/* Skills Filter */}
          <div className="space-y-1.5 col-span-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Required Skills (React, Node)</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Comma separated skills..."
                value={skillsFilter}
                onChange={(e) => setSkillsFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-xs placeholder-slate-600"
              />
            </div>
          </div>

          {/* Slider CGPA */}
          <div className="space-y-1.5 col-span-1">
            <div className="flex justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Min CGPA</label>
              <span className="text-xs text-brand font-bold">{minCgpa.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={minCgpa}
              onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>

          {/* Slider Readiness Score */}
          <div className="space-y-1.5 col-span-1">
            <div className="flex justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Min Placement Readiness</label>
              <span className="text-xs text-brand font-bold">{minReadiness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minReadiness}
              onChange={(e) => setMinReadiness(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>
        </form>
      </div>

      {/* Student List Grid */}
      <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40">
        {studentsLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm">
            No students found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-4 pl-4 w-12">
                    <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-brand">
                      {selectedStudentIds.length === students.length ? (
                        <CheckSquare className="w-4 h-4 text-brand" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-4">Student</th>
                  <th className="py-4">Branch / Code</th>
                  <th className="py-4">CGPA</th>
                  <th className="py-4 text-center">Placement Readiness</th>
                  <th className="py-4">Skills</th>
                  <th className="py-4 pr-4 text-right">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <tr key={student.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-brand/5' : ''}`}>
                      <td className="py-4 pl-4">
                        <button onClick={() => handleToggleSelectStudent(student.id)} className="text-slate-400 hover:text-brand">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold text-sm">
                            {student.user.firstName[0]}{student.user.lastName[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">
                              {student.user.firstName} {student.user.lastName}
                            </span>
                            <span className="text-[10px] text-slate-500">{student.user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <span className="font-medium text-slate-300 block">{student.branch || 'General'}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{student.studentCode}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-slate-200">{student.cgpa ? student.cgpa.toFixed(2) : 'N/A'}</span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            student.readinessScore >= 80
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : student.readinessScore >= 60
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {student.readinessScore}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {student.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-slate-400">
                              {skill}
                            </span>
                          ))}
                          {student.skills.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-slate-500 font-bold">
                              +{student.skills.length - 3} MORE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        {student.resumeUrl ? (
                          <a
                            href={student.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-brand font-semibold hover:underline"
                          >
                            <FileDown className="w-4 h-4" />
                            <span>PDF</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">NO RESUME</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 disabled:opacity-50 hover:bg-white/10 transition-all animate-duration-150"
          >
            PREV
          </button>
          <span className="text-xs text-slate-500 font-medium">PAGE {page} OF {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 disabled:opacity-50 hover:bg-white/10 transition-all animate-duration-150"
          >
            NEXT
          </button>
        </div>
      </div>

      {/* Applicant Tracking Board */}
      <div className="p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/40 space-y-6">
        <div>
          <h2 className="text-md font-bold text-white tracking-wide uppercase">Candidate Application Tracker</h2>
          <p className="text-xs text-slate-400 mt-1">Review candidates who applied for your posted opportunities and progress them.</p>
        </div>

        {/* Dropdown selector for jobs */}
        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Posted Job Opportunity</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-brand/40"
          >
            {jobs.length === 0 ? (
              <option value="">No jobs posted yet</option>
            ) : (
              jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Tab Filters for applicant progression */}
        <div className="flex gap-2 border-b border-white/5 pb-3">
          {['ALL', 'INTERESTED', 'SHORTLISTED', 'REJECTED', 'HIRED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setApplicantStatusTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                applicantStatusTab === tab
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'INTERESTED' ? 'APPLIED (INTERESTED)' : tab}
            </button>
          ))}
        </div>

        {/* Applicants List */}
        {applicantsLoading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
          </div>
        ) : applicants.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No applicants for this job yet.
          </div>
        ) : (
          <div className="space-y-4">
            {applicants
              .filter(
                (app) => applicantStatusTab === 'ALL' || app.status === applicantStatusTab
              )
              .map((applicant) => (
                <div
                  key={applicant.id}
                  className="p-5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-extrabold">
                      {applicant.student.user.firstName[0]}
                      {applicant.student.user.lastName[0]}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {applicant.student.user.firstName} {applicant.student.user.lastName}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          {applicant.student.studentCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4 text-brand" /> CGPA: {applicant.student.cgpa?.toFixed(2) || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Sliders className="w-4 h-4 text-brand" /> Readiness: {applicant.student.readinessScore}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      applicant.status === 'HIRED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : applicant.status === 'SHORTLISTED'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : applicant.status === 'REJECTED'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {applicant.status}
                    </span>

                    {/* Action selectors */}
                    <div className="flex gap-1.5 border-l border-white/5 pl-3">
                      <button
                        onClick={() => handleUpdateApplicantStatus(applicant.student.id, 'SHORTLISTED')}
                        disabled={applicant.status === 'SHORTLISTED'}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-brand/30 hover:text-brand text-slate-400 text-xs font-semibold disabled:opacity-50"
                        title="Shortlist Candidate"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateApplicantStatus(applicant.student.id, 'HIRED')}
                        disabled={applicant.status === 'HIRED'}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:text-emerald-400 text-slate-400 text-xs font-semibold disabled:opacity-50"
                        title="Mark as Hired"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateApplicantStatus(applicant.student.id, 'REJECTED')}
                        disabled={applicant.status === 'REJECTED'}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-red-500/30 hover:text-red-400 text-slate-400 text-xs font-semibold disabled:opacity-50"
                        title="Reject Candidate"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterDashboard;
