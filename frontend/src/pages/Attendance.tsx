import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { PlayCircle, Plus, X, Calendar, AlertCircle } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
}

interface StudentGridItem {
  id: string;
  studentCode: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Session {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topicCovered: string | null;
  attendanceMarked: boolean;
}

export const Attendance: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [students, setStudents] = useState<StudentGridItem[]>([]);

  // Attendance marking payload
  const [attendanceStates, setAttendanceStates] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({});

  // Dialog & Form states
  const [isOpen, setIsOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [topicCovered, setTopicCovered] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const fetchSessions = async () => {
    if (!selectedBatchId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/attendance/batches/${selectedBatchId}`);
      setSessions(res.data.data.sessions || []);
      // Map grid students list
      const studentsList = res.data.data.grid.map((g: any) => ({
        id: g.studentId,
        studentCode: g.studentCode,
        user: { firstName: g.firstName, lastName: g.lastName },
      }));
      setStudents(studentsList);
      setSelectedSessionId('');
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [selectedBatchId]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !sessionDate || !startTime || !endTime) {
      setError('Date, Start Time, and End Time are required');
      return;
    }

    try {
      setError(null);
      await apiClient.post('/attendance/sessions', {
        batchId: selectedBatchId,
        sessionDate: new Date(sessionDate).toISOString(),
        startTime,
        endTime,
        topicCovered: topicCovered || null,
      });
      setIsOpen(false);
      setTopicCovered('');
      fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create class session');
    }
  };

  const loadSessionGrid = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    // Initialize all students as PRESENT by default
    const initialStates: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
    students.forEach((s) => {
      initialStates[s.id] = 'PRESENT';
    });
    setAttendanceStates(initialStates);
  };

  const handleMarkStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setAttendanceStates((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;
    try {
      setSaving(true);
      setError(null);
      const records = Object.entries(attendanceStates).map(([studentId, status]) => ({
        studentId,
        status,
        overrideReason: null,
      }));

      await apiClient.post(`/attendance/sessions/${selectedSessionId}/mark`, { records });
      alert('Attendance saved successfully!');
      setSelectedSessionId('');
      fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">MARK SESSION ATTENDANCE</h2>
          <p className="text-xs text-slate-500 mt-1">Track daily session attendees and latecomers.</p>
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
        {/* Left side: Sessions List & Scheduler */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-brand uppercase tracking-wider">Class Sessions</h4>
            <button
              onClick={() => {
                setSessionDate('');
                setTopicCovered('');
                setError(null);
                setIsOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-brand/10 hover:bg-brand/20 text-brand text-[10px] font-bold border border-brand/20 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>New Session</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">No sessions scheduled.</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSessionGrid(s.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedSessionId === s.id
                      ? 'bg-brand/10 border-brand/40 shadow-[0_0_10px_rgba(0,210,255,0.1)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">{new Date(s.sessionDate).toLocaleDateString()}</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      s.attendanceMarked
                        ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10'
                        : 'bg-amber-950/30 text-amber-400 border border-amber-500/10'
                    }`}>
                      {s.attendanceMarked ? 'MARKED' : 'PENDING'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-white mt-1.5 line-clamp-1">{s.topicCovered || 'Daily Session'}</h5>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{s.startTime} - {s.endTime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right side: Attendance grid / marking sheet */}
        <div className="lg:col-span-2">
          {selectedSessionId ? (
            <div className="glow-card rounded-2xl p-6 border border-white/5 bg-slate-950/40 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white">ATTENDANCE SHEET</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Mark each student's current status for this session.</p>
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white text-xs font-extrabold shadow-[0_0_10px_rgba(0,210,255,0.15)] disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : 'SAVE ATTENDANCE'}
                </button>
              </div>

              {error && (
                <div className="p-3 text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto pr-1">
                {students.map((stud) => {
                  const currentStatus = attendanceStates[stud.id] || 'PRESENT';
                  return (
                    <div key={stud.id} className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-semibold text-xs text-white block">
                          {stud.user.firstName} {stud.user.lastName}
                        </span>
                        <span className="font-mono text-[10px] text-brand block">{stud.studentCode}</span>
                      </div>

                      {/* Status selectors */}
                      <div className="flex gap-1.5">
                        {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleMarkStatus(stud.id, status)}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold border transition-all ${
                              currentStatus === status
                                ? status === 'PRESENT'
                                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30'
                                  : status === 'ABSENT'
                                  ? 'bg-red-950/30 text-red-400 border-red-500/30'
                                  : 'bg-amber-950/30 text-amber-400 border-amber-500/30'
                                : 'bg-white/[0.01] border-white/5 text-slate-500 hover:text-slate-400'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[50vh] flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01] p-10 text-center">
              <PlayCircle className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-md font-bold text-white">No Session Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Choose or create a class session on the left to mark attendance for the students.</p>
            </div>
          )}
        </div>
      </div>

      {/* Scheduler Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">SCHEDULE NEW SESSION</h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Session Date *</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm bg-slate-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Topic Covered</label>
                <input
                  type="text"
                  value={topicCovered}
                  onChange={(e) => setTopicCovered(e.target.value)}
                  placeholder="e.g. Introduction to CSS Flexbox"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                CREATE SESSION
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
