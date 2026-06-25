import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Search, Upload, X, AlertCircle, Award, Check, ExternalLink, Loader } from 'lucide-react';

interface Student {
  id: string;
  studentCode: string;
  enrollmentNumber: string | null;
  branch: string | null;
  graduationYear: number | null;
  placementStatus: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  college: {
    id: string;
    name: string;
  } | null;
}

export const Students: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCollegeAdmin = user?.role === 'COLLEGE_ADMIN';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collegeId, setCollegeId] = useState(isCollegeAdmin ? user.collegeId || '' : '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // College list for dropdown (for Super Admin)
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);

  // Dialog States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    successCount: number;
    failedCount: number;
    errors: string[];
    importedStudents: { email: string; tempPassword: string; studentCode: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Certificates Dialog States
  const [isCertificatesOpen, setIsCertificatesOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<Record<string, any>>({});
  const [checkingEligibility, setCheckingEligibility] = useState<Record<string, boolean>>({});
  const [generatingCert, setGeneratingCert] = useState<Record<string, boolean>>({});

  const handleOpenCertificates = async (student: Student) => {
    setSelectedStudent(student);
    setIsCertificatesOpen(true);
    setStudentDetails(null);
    setEligibilityData({});
    setCheckingEligibility({});
    setGeneratingCert({});
    setLoadingDetails(true);

    try {
      const res = await apiClient.get(`/students/${student.id}`);
      setStudentDetails(res.data.data);
      
      const batches = res.data.data.batchStudents || [];
      for (const bs of batches) {
        const batch = bs.batch;
        if (batch && batch.courseId) {
          checkCourseEligibility(student.id, batch.courseId, batch.id);
        }
      }
    } catch (err) {
      console.error('Failed to load student details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const checkCourseEligibility = async (studentId: string, courseId: string, batchId: string) => {
    setCheckingEligibility((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await apiClient.get('/certificate/eligibility', {
        params: { studentId, courseId, batchId },
      });
      setEligibilityData((prev) => ({ ...prev, [courseId]: res.data.data }));
    } catch (err) {
      console.error('Failed to check eligibility', err);
    } finally {
      setCheckingEligibility((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleGenerateCertificate = async (studentId: string, courseId: string, batchId: string) => {
    setGeneratingCert((prev) => ({ ...prev, [courseId]: true }));
    try {
      await apiClient.post('/certificate', { studentId, courseId, batchId });
      if (selectedStudent) {
        handleOpenCertificates(selectedStudent);
      }
    } catch (err) {
      console.error('Failed to generate certificate', err);
      alert('Failed to generate certificate. Please make sure the student meets all eligibility criteria.');
    } finally {
      setGeneratingCert((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/students', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          collegeId: collegeId || undefined,
        },
      });
      setStudents(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    if (isSuperAdmin) {
      try {
        const res = await apiClient.get('/colleges', { params: { limit: 100 } });
        setColleges(res.data.data || []);
      } catch (err) {
        console.error('Failed to load colleges', err);
      }
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search, collegeId]);

  useEffect(() => {
    fetchColleges();
    if (isCollegeAdmin) {
      setSelectedCollegeId(user.collegeId || '');
    }
  }, []);

  const handleOpenImport = () => {
    setCsvFile(null);
    setImportResults(null);
    setImportError(null);
    if (isSuperAdmin) {
      setSelectedCollegeId('');
    }
    setIsImportOpen(true);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollegeId) {
      setImportError('Please select a target college');
      return;
    }
    if (!csvFile) {
      setImportError('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const csvData = evt.target?.result;
      if (typeof csvData !== 'string') {
        setImportError('Failed to read CSV content');
        setImporting(false);
        return;
      }

      try {
        const res = await apiClient.post('/students/import', {
          collegeId: selectedCollegeId,
          csvData,
        });

        setImportResults(res.data.data);
        fetchStudents();
      } catch (err: any) {
        setImportError(err.response?.data?.message || 'CSV Import failed');
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
      setImporting(false);
    };
    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
            />
          </div>

          {/* College Filter (Super Admin only) */}
          {isSuperAdmin && (
            <select
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="w-full sm:w-48 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-brand/40"
            >
              <option value="" className="bg-brand-deep text-slate-300">All Colleges</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id} className="bg-brand-deep text-slate-300">
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* CSV Import trigger */}
        {(isSuperAdmin || isCollegeAdmin) && (
          <button
            onClick={handleOpenImport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200"
          >
            <Upload className="w-4 h-4" />
            <span>BULK IMPORT (CSV)</span>
          </button>
        )}
      </div>

      {/* Students Table */}
      <div className="glow-card rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Grad Year</th>
                {isSuperAdmin && <th className="px-6 py-4">College</th>}
                <th className="px-6 py-4 text-center">Placement</th>
                <th className="px-6 py-4 text-center">Certificates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-brand font-semibold">{student.studentCode}</td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {student.user.firstName} {student.user.lastName}
                    </td>
                    <td className="px-6 py-4">{student.user.email}</td>
                    <td className="px-6 py-4">{student.branch || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-slate-200">{student.graduationYear || 'N/A'}</td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                        {student.college?.name || 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        student.placementStatus === 'PLACED'
                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20'
                          : student.placementStatus === 'ACTIVELY_APPLYING'
                          ? 'bg-sky-950/30 text-sky-400 border border-sky-500/20'
                          : 'bg-slate-900 text-slate-400 border border-slate-700/20'
                      }`}>
                        {student.placementStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenCertificates(student)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-brand/10 text-slate-300 hover:text-brand text-xs font-semibold tracking-wide transition-all duration-150"
                      >
                        Manage
                      </button>
                    </td>
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

      {/* CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/95 relative animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsImportOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">BULK IMPORT STUDENTS via CSV</h3>
            <p className="text-xs text-slate-400 mb-6">
              Create student profiles instantly. CSV columns must match: <code className="bg-white/5 px-1.5 py-0.5 rounded text-brand">firstName, lastName, email, enrollmentNumber, branch, graduationYear, cgpa</code>
            </p>

            {importError && (
              <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{importError}</span>
              </div>
            )}

            {!importResults ? (
              <form onSubmit={handleImportSubmit} className="space-y-5">
                {/* College selection (Super Admin only) */}
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target College</label>
                    <select
                      value={selectedCollegeId}
                      onChange={(e) => setSelectedCollegeId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-brand/40"
                    >
                      <option value="" className="bg-brand-deep">Select College</option>
                      {colleges.map((c) => (
                        <option key={c.id} value={c.id} className="bg-brand-deep">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* File Dropzone */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">CSV File</label>
                  <div className="border border-dashed border-white/10 rounded-xl p-8 text-center bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-brand mx-auto mb-3" />
                    <span className="text-sm font-semibold text-slate-300 block">
                      {csvFile ? csvFile.name : 'Select or drop your CSV file'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">Accepts only .csv format</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={importing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)] disabled:opacity-50"
                >
                  {importing ? 'PARSING & IMPORTING...' : 'RUN BULK IMPORT'}
                </button>
              </form>
            ) : (
              // Results Display
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Successfully Imported</span>
                    <span className="text-3xl font-extrabold text-emerald-400 block mt-1">{importResults.successCount}</span>
                  </div>
                  <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl text-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Failed / Duplicate</span>
                    <span className="text-3xl font-extrabold text-amber-400 block mt-1">{importResults.failedCount}</span>
                  </div>
                </div>

                {/* Newly imported passwords */}
                {importResults.importedStudents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Temp Credentials Table</h4>
                    <div className="max-h-40 overflow-y-auto border border-white/5 rounded-xl bg-white/[0.01]">
                      <table className="w-full text-xs text-slate-300 border-collapse text-left">
                        <thead className="bg-white/[0.03] text-slate-400">
                          <tr>
                            <th className="px-4 py-2">Student ID</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Temporary Password</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {importResults.importedStudents.map((stud) => (
                            <tr key={stud.studentCode}>
                              <td className="px-4 py-2 font-bold text-brand">{stud.studentCode}</td>
                              <td className="px-4 py-2">{stud.email}</td>
                              <td className="px-4 py-2 text-white font-bold">{stud.tempPassword}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Errors Display */}
                {importResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Parsing Errors</h4>
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl max-h-32 overflow-y-auto text-xs text-red-300 font-mono space-y-1">
                      {importResults.errors.map((err, idx) => (
                        <p key={idx}>{err}</p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setIsImportOpen(false)}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm tracking-wide hover:bg-white/10"
                >
                  CLOSE DIALOG
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificates Modal */}
      {isCertificatesOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/95 relative animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsCertificatesOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Student Certifications</h3>
                <p className="text-xs text-slate-400">
                  Manage and issue completion certificates for {selectedStudent.user.firstName} {selectedStudent.user.lastName} ({selectedStudent.studentCode})
                </p>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex flex-col items-center py-12 space-y-3">
                <Loader className="w-8 h-8 text-brand animate-spin" />
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading student enrollment...</span>
              </div>
            ) : !studentDetails || !studentDetails.batchStudents || studentDetails.batchStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                This student is not enrolled in any active course batches.
              </div>
            ) : (
              <div className="space-y-6">
                {studentDetails.batchStudents.map((bs: any) => {
                  const batch = bs.batch;
                  if (!batch || !batch.course) return null;
                  const course = batch.course;
                  const eligibility = eligibilityData[course.id];
                  const checking = checkingEligibility[course.id];
                  const generating = generatingCert[course.id];

                  // Check if student already has a certificate issued for this course
                  const existingCert = studentDetails.certificates?.find(
                    (c: any) => c.courseId === course.id && c.isValid
                  );

                  return (
                    <div
                      key={course.id}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-white text-base leading-snug">{course.title}</h4>
                          <span className="text-xs text-slate-500">
                            Batch: <span className="text-slate-400 font-semibold">{batch.name}</span> ({batch.code})
                          </span>
                        </div>

                        <div>
                          {existingCert ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
                              <Check className="w-3 h-3 inline mr-1" /> ISSUED
                            </span>
                          ) : checking ? (
                            <span className="text-xs text-slate-500 font-medium">Checking eligibility...</span>
                          ) : eligibility?.isEligible ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20">
                              ELIGIBLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950/30 text-red-400 border border-red-500/20">
                              INELIGIBLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Eligibility details when not generated */}
                      {!existingCert && eligibility && !checking && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 pb-1 text-xs border-t border-white/5">
                          {/* Attendance metric */}
                          <div className="space-y-1">
                            <span className="text-slate-500 uppercase font-bold tracking-wider text-[9px]">Attendance Rate</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${eligibility.details.isAttendanceEligible ? 'text-white' : 'text-red-400'}`}>
                                {eligibility.attendancePct}%
                              </span>
                              <span className="text-slate-600">/ Req {eligibility.minAttendanceRequired}%</span>
                            </div>
                          </div>

                          {/* Quiz Average metric */}
                          <div className="space-y-1">
                            <span className="text-slate-500 uppercase font-bold tracking-wider text-[9px]">Quiz Average</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${eligibility.details.isQuizEligible ? 'text-white' : 'text-red-400'}`}>
                                {eligibility.quizAvgPct}%
                              </span>
                              <span className="text-slate-600">/ Req {eligibility.minQuizAvgRequired}%</span>
                            </div>
                          </div>

                          {/* Assignment completion metric */}
                          <div className="space-y-1">
                            <span className="text-slate-500 uppercase font-bold tracking-wider text-[9px]">Mandatory Assignments</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${eligibility.details.isAssignmentsEligible ? 'text-white' : 'text-red-400'}`}>
                                {eligibility.gradedAssignmentsCount} / {eligibility.totalAssignmentsCount}
                              </span>
                              <span className="text-slate-600">graded</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3 pt-1">
                        {existingCert ? (
                          <>
                            <a
                              href={`/verify/${existingCert.certificateCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs tracking-wide transition-all duration-150 flex items-center gap-1.5"
                            >
                              Verify <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={existingCert.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-xs tracking-wide shadow-[0_0_10px_rgba(0,210,255,0.15)] hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] transition-all duration-150 flex items-center gap-1.5"
                            >
                              Download PDF <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </>
                        ) : (
                          <button
                            disabled={!eligibility?.isEligible || generating || checking}
                            onClick={() => handleGenerateCertificate(selectedStudent.id, course.id, batch.id)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric disabled:from-slate-800 disabled:to-slate-800 text-white disabled:text-slate-500 font-bold text-xs tracking-wide shadow-[0_0_10px_rgba(0,210,255,0.15)] disabled:shadow-none transition-all duration-150"
                          >
                            {generating ? 'GENERATING CERTIFICATE...' : 'ISSUE OFFICIAL CERTIFICATE'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
