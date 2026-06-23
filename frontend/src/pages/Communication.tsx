import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Send, Bell, Volume2, ShieldAlert } from 'lucide-react';

export const Communication: React.FC = () => {

  // Lists for scoping
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('ANNOUNCEMENT');
  const [targetScope, setTargetScope] = useState<'ALL' | 'COLLEGE' | 'BATCH'>('ALL');
  const [targetId, setTargetId] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchScopeOptions = async () => {
    try {
      const [collegesRes, batchesRes] = await Promise.all([
        apiClient.get('/colleges', { params: { limit: 100 } }),
        apiClient.get('/batches', { params: { limit: 100 } }),
      ]);
      setColleges(collegesRes.data.data || []);
      setBatches(batchesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load scope items', err);
    }
  };

  useEffect(() => {
    fetchScopeOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      setError('Please provide announcement title and description');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title,
      body,
      type,
      targetScope,
      targetId: targetScope !== 'ALL' ? targetId || null : null,
      data: {},
    };

    try {
      await apiClient.post('/notifications', payload);
      setSuccess('Announcement broadcast successfully enqueued!');
      setTitle('');
      setBody('');
      setTargetId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Volume2 className="w-6 h-6 text-brand" />
        <h2 className="text-xl font-bold text-white tracking-wide">ANNOUNCEMENT DISPATCHER</h2>
      </div>

      <div className="glow-card rounded-2xl p-6 border border-white/5 bg-slate-950/40">
        <div className="p-4 mb-6 bg-brand/5 border border-brand/20 rounded-xl flex items-start gap-3">
          <Bell className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <span className="font-bold text-white block">Push Notification Gateway</span>
            <span>Broadcast critical announcements, assignment releases, or schedule updates. Notifications will be pushed directly to student mobile devices and internal web inboxes.</span>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 mb-5 text-sm text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Target Scope *</label>
            <div className="grid grid-cols-3 gap-3">
              {(['ALL', 'COLLEGE', 'BATCH'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    setTargetScope(scope);
                    setTargetId('');
                  }}
                  className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${
                    targetScope === scope
                      ? 'bg-brand/10 border-brand text-brand shadow-[0_0_10px_rgba(0,210,255,0.15)]'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Dropdown for scopes */}
          {targetScope === 'COLLEGE' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Select Target College *</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
              >
                <option value="">Select College</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {targetScope === 'BATCH' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Select Target Batch *</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
              >
                <option value="">Select Batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
              >
                <option value="ANNOUNCEMENT">General Announcement</option>
                <option value="ALERT">Critical Alert</option>
                <option value="BATCH_UPDATE">Academic Update</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Announcement Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Schedule Change: Live Class Postponed"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Broadcast Message Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Describe the announcement details..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'BROADCASTING...' : 'DISPATCH ANNOUNCEMENT'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Communication;
