import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../config/axios';
import { CheckCircle2, AlertTriangle, ExternalLink, Calendar, ShieldCheck, Award, Share2 } from 'lucide-react';

interface CertificateData {
  id: string;
  certificateCode: string;
  pdfUrl: string;
  issuedAt: string;
  student: {
    studentCode: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  course: {
    title: string;
  };
  batch?: {
    name: string;
    code: string;
  };
}

export const VerifyCertificate: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CertificateData | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!code) return;
      try {
        setLoading(true);
        setError(null);
        // Direct call to public verify endpoint
        const response = await apiClient.get(`/certificate/verify/${code}`);
        setData(response.data.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'Certificate verification failed. Code may be invalid or revoked.');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [code]);

  const handleLinkedInShare = () => {
    if (!data) return;
    const courseTitle = data.course.title;
    const certCode = data.certificateCode;
    const certUrl = window.location.href;
    const shareUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
      courseTitle
    )}&organizationName=KodeToCareer&certId=${encodeURIComponent(certCode)}&certUrl=${encodeURIComponent(certUrl)}`;
    window.open(shareUrl, '_blank');
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const message = `Check out my verified certificate for completing ${data.course.title} from KodeToCareer: ${window.location.href}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050811] text-white px-4 py-12 relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D2FF]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0072FF]/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-3 mb-8 relative z-10">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0072FF] to-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.3)]">
          <span className="text-xl font-black text-white tracking-tighter">K</span>
        </div>
        <div className="text-left">
          <span className="text-sm font-black tracking-widest text-white">KODETOCAREER</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Verification Board</p>
        </div>
      </Link>

      <div className="w-full max-w-2xl glow-card rounded-3xl border border-white/5 bg-slate-950/40 p-8 md:p-12 relative z-10">
        {loading && (
          <div className="flex flex-col items-center py-12 space-y-4">
            <div className="w-12 h-12 border-t-2 border-r-2 border-[#00D2FF] rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 font-semibold tracking-wide">VERIFYING CREDENTIAL HASH...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/30 border border-red-500/20 text-red-400 mb-2">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-400">Invalid or Expired Certificate</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                We could not locate a valid digital certificate matching this verification code. It may have been revoked or is mistyped.
              </p>
            </div>
            <div className="pt-4">
              <Link
                to="/login"
                className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-sm font-semibold tracking-wide transition-all duration-200"
              >
                Go to Authentication
              </Link>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Status Header */}
            <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-white/5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00D2FF]/10 border border-[#00D2FF]/20 text-[#00D2FF] shadow-[0_0_20px_rgba(0,210,255,0.15)]">
                <ShieldCheck size={36} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#00D2FF] tracking-widest bg-[#00D2FF]/10 px-3 py-1 rounded-full border border-[#00D2FF]/10">
                  OFFICIALLY VERIFIED
                </span>
                <h2 className="text-2xl font-black tracking-wide text-white mt-3">Verified Professional Credential</h2>
                <p className="text-xs text-slate-500">Secure digital certification verified by cryptography.</p>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Certified Professional
                  </label>
                  <span className="text-xl font-black text-white">
                    {data.student.user.firstName} {data.student.user.lastName}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Student ID: {data.student.studentCode}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Course Program Complete
                  </label>
                  <div className="flex items-start gap-2">
                    <Award className="text-[#00D2FF] shrink-0 mt-0.5" size={20} />
                    <span className="text-lg font-bold text-white leading-snug">{data.course.title}</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Verification Code
                  </label>
                  <span className="text-sm font-mono bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-lg text-slate-300 block w-fit font-bold">
                    {data.certificateCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Issue Date
                    </label>
                    <div className="flex items-center gap-1.5 text-slate-300 text-sm font-semibold">
                      <Calendar size={16} className="text-slate-500" />
                      {new Date(data.issuedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  {data.batch && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Batch Code
                      </label>
                      <span className="text-slate-300 text-sm font-semibold block">
                        {data.batch.code}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
              <a
                href={data.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#0072FF] to-[#00D2FF] hover:from-[#0072FF]/90 hover:to-[#00D2FF]/90 text-white font-bold rounded-xl text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.15)] transition-all duration-200"
              >
                View Digital PDF <ExternalLink size={16} />
              </a>

              <div className="flex gap-2">
                <button
                  onClick={handleLinkedInShare}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm tracking-wide transition-all duration-200"
                  title="Add to LinkedIn Profile"
                >
                  <Share2 size={16} /> LinkedIn
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm tracking-wide transition-all duration-200"
                  title="Share on WhatsApp"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-slate-600 mt-8 font-semibold tracking-wider uppercase">
        Protected by SHA-256 cryptographic signatures. © KodeToCareer Platform
      </p>
    </div>
  );
};

export default VerifyCertificate;
