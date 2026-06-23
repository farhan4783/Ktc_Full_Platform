import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Plus, FileText, ChevronRight, X } from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  totalMarks: number;
  passMarks: number | null;
  deadlineAt: string | null;
  status: string;
  _count?: {
    submissions: number;
  };
}

interface Submission {
  id: string;
  submittedAt: string;
  submissionText: string | null;
  fileUrl: string | null;
  submissionLink: string | null;
  marksAwarded: number | null;
  feedback: string | null;
  status: string;
  student: {
    studentCode: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export const Grading: React.FC = () => {
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Dialog & Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);

  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passMarks, setPassMarks] = useState<number>(40);

  // Grading Form State
  const [marksAwarded, setMarksAwarded] = useState<number>(0);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const res = await apiClient.get('/batches', { params: { limit: 100 } });
      setBatches(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedBatchId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/assignments', {
        params: { batchId: selectedBatchId },
      });
      setAssignments(res.data.data || []);
      setSelectedAssignment(null);
      setSubmissions([]);
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignment: Assignment) => {
    try {
      setSubLoading(true);
      setSelectedAssignment(assignment);
      const res = await apiClient.get('/assignments/submissions', {
        params: { assignmentId: assignment.id },
      });
      setSubmissions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch submissions', err);
      setSubmissions([]);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedBatchId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !title || !dueDate) {
      setError('Title and Due Date are required');
      return;
    }

    try {
      setError(null);
      await apiClient.post('/assignments', {
        title,
        description: description || null,
        batchId: selectedBatchId,
        dueDate: new Date(dueDate).toISOString(),
        totalMarks: Number(totalMarks),
        passMarks: Number(passMarks),
        status: 'PUBLISHED',
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      fetchAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish assignment');
    }
  };

  const handleOpenGrade = (sub: Submission) => {
    setSelectedSubmission(sub);
    setMarksAwarded(sub.marksAwarded || 0);
    setFeedback(sub.feedback || '');
    setGrade('');
    setError(null);
    setIsGradeOpen(true);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !selectedAssignment) return;

    if (marksAwarded > selectedAssignment.totalMarks) {
      setError(`Marks awarded cannot exceed maximum marks (${selectedAssignment.totalMarks})`);
      return;
    }

    try {
      setError(null);
      await apiClient.post(`/assignments/submissions/${selectedSubmission.id}/grade`, {
        marksAwarded: Number(marksAwarded),
        grade: grade || null,
        feedback: feedback || null,
      });
      setIsGradeOpen(false);
      fetchSubmissions(selectedAssignment);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to grade submission');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">ASSIGNMENTS EVALUATION</h2>
          <p className="text-xs text-slate-500 mt-1">Review student submissions, award marks, and provide feedback.</p>
        </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Assignments list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-brand uppercase tracking-wider">Assignments</h4>
            <button
              onClick={() => {
                setTitle('');
                setDescription('');
                setDueDate('');
                setTotalMarks(100);
                setPassMarks(40);
                setError(null);
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-brand/10 hover:bg-brand/20 text-brand text-[10px] font-bold border border-brand/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">No assignments published.</p>
            ) : (
              assignments.map((a) => (
                <div
                  key={a.id}
                  onClick={() => fetchSubmissions(a)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedAssignment?.id === a.id
                      ? 'bg-brand/10 border-brand/40 shadow-[0_0_10px_rgba(0,210,255,0.1)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <h5 className="text-xs font-bold text-white line-clamp-1">{a.title}</h5>
                  <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-500 mt-3">
                    <span>MAX: {a.totalMarks} MARKS</span>
                    <span>DUE: {a.deadlineAt ? new Date(a.deadlineAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Student Submissions list */}
        <div className="lg:col-span-2">
          {selectedAssignment ? (
            <div className="glow-card rounded-2xl p-6 border border-white/5 bg-slate-950/40 space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white">SUBMISSIONS FOR "{selectedAssignment.title.toUpperCase()}"</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Select a student's answer sheet to grade.</p>
              </div>

              {subLoading ? (
                <div className="text-center py-20">
                  <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No students have submitted this assignment yet.</p>
              ) : (
                <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto pr-1">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-semibold text-xs text-white block">
                          {sub.student.user.firstName} {sub.student.user.lastName}
                        </span>
                        <span className="font-mono text-[10px] text-brand block">{sub.student.studentCode}</span>
                        {sub.submittedAt && (
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            Submitted on {new Date(sub.submittedAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {sub.status === 'GRADED' ? (
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-400 block">{sub.marksAwarded} / {selectedAssignment.totalMarks}</span>
                            <span className="text-[9px] text-slate-500 block font-semibold">Graded</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenGrade(sub)}
                            className="px-3 py-1 rounded bg-brand/10 hover:bg-brand/20 text-brand text-[10px] font-extrabold border border-brand/20"
                          >
                            Grade Sheet
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[50vh] flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01] p-10 text-center">
              <FileText className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-md font-bold text-white">No Assignment Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Choose an assignment on the left to see submitted scripts, verify attachments, and input grades.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsCreateOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">PUBLISH AN ASSIGNMENT</h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Assignment Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Portfolio React App build"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Instructions / description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pass Marks</label>
                  <input
                    type="number"
                    value={passMarks}
                    onChange={(e) => setPassMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                PUBLISH ASSIGNMENT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grading Dialog */}
      {isGradeOpen && selectedSubmission && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsGradeOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">GRADE STUDENT SCRIPT</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              Student: {selectedSubmission.student.user.firstName} {selectedSubmission.student.user.lastName} ({selectedSubmission.student.studentCode})
            </p>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleSaveGrade} className="space-y-4">
              {/* Submission Attachments display */}
              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 text-xs font-semibold">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">Submitted Assets:</span>
                {selectedSubmission.submissionText && (
                  <p className="text-slate-300 font-medium">Text: <span className="font-normal">{selectedSubmission.submissionText}</span></p>
                )}
                {selectedSubmission.fileUrl && (
                  <p className="flex items-center gap-1 text-slate-300">
                    File: <a href={selectedSubmission.fileUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">{selectedSubmission.fileUrl}</a>
                  </p>
                )}
                {selectedSubmission.submissionLink && (
                  <p className="flex items-center gap-1 text-slate-300">
                    Link: <a href={selectedSubmission.submissionLink} target="_blank" rel="noreferrer" className="text-brand hover:underline">{selectedSubmission.submissionLink}</a>
                  </p>
                )}
                {!selectedSubmission.submissionText && !selectedSubmission.fileUrl && !selectedSubmission.submissionLink && (
                  <p className="text-slate-500 italic">No attachments provided.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Marks Awarded (Max: {selectedAssignment.totalMarks}) *</label>
                  <input
                    type="number"
                    max={selectedAssignment.totalMarks}
                    min={0}
                    value={marksAwarded}
                    onChange={(e) => setMarksAwarded(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Grade (Optional)</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g. A+, B"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                SUBMIT GRADE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grading;
