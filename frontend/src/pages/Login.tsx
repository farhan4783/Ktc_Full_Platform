import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';

export const Login: React.FC = () => {
  const { setSession, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [website, setWebsite] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isRegister && (!firstName || !lastName || !companyName)) {
      setError('First name, last name, and company name are required');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Register Recruiter
        await apiClient.post('/recruiters/register', {
          email,
          password,
          firstName,
          lastName,
          companyName,
          designation: designation || undefined,
          website: website || undefined,
        });
      }

      // Login
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      setSession(accessToken, refreshToken, user);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-deep px-4 py-12 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-electric/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-dark/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md p-8 glow-card rounded-2xl relative z-10 border border-white/5 bg-slate-950/40">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-dark to-brand-electric shadow-[0_0_20px_rgba(0,210,255,0.4)] mb-4">
            <span className="text-2xl font-bold text-white tracking-tighter">K</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">KODETOCAREER</h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-1">
            {isRegister ? 'Recruiter Registration' : 'Portal Authentication'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Login/Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. HR Manager"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-dark to-brand-electric hover:from-brand-dark/95 hover:to-brand-electric/95 text-white font-bold tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)] hover:shadow-[0_0_25px_rgba(0,210,255,0.3)] transition-all duration-200 text-xs disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : isRegister ? 'CREATE RECRUITER ACCOUNT' : 'SIGN IN'}
          </button>
        </form>

        {/* Toggle Form Type */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-brand hover:underline font-semibold tracking-wide uppercase"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Are you a Recruiter? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
