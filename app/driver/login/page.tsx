'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function DriverOTPLogin() {
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (!error) {
      setStep('verify');
    } else {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (data?.user) {
      router.push('/driver'); // රියදුරු ප්‍රධාන පිටුවට යොමු කිරීම
    } else {
      setErrorMsg(error?.message || 'Verification failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] border border-[#1d1d1d]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#FFD700] tracking-wider drop-shadow-md mb-2">බැදුම</h1>
          <h2 className="text-lg font-bold text-gray-200">Driver Portal</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">නගරේ රහට * ගානට</p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 pl-2">Driver Phone Number</label>
              <input
                type="text"
                placeholder="+94 7X XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-4 rounded-xl bg-[#121212] text-white outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] focus:shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] transition-all"
                required
              />
            </div>
            {errorMsg && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
            <button disabled={loading} className="w-full py-4 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all">
              {loading ? 'Requesting...' : 'Request Access Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 pl-2 text-center">Enter 6-Digit Code</label>
              <input
                type="text"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-4 rounded-xl bg-[#121212] text-white text-center tracking-[0.5em] font-mono text-xl outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all"
                maxLength={6}
                required
              />
            </div>
            {errorMsg && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
            <button disabled={loading} className="w-full py-4 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all">
              {loading ? 'Verifying...' : 'Login to Portal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
