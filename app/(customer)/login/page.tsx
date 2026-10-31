'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CustomerOTPLogin() {
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const isEmail = identifier.includes('@');
    const { error } = isEmail 
      ? await supabase.auth.signInWithOtp({ email: identifier })
      : await supabase.auth.signInWithOtp({ phone: identifier });

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

    const isEmail = identifier.includes('@');
    const { data, error } = await supabase.auth.verifyOtp(
      isEmail
        ? { email: identifier, token, type: 'email' }
        : { phone: identifier, token, type: 'sms' }
    );

    if (data?.user) {
      // OTP තහවුරු වූ වහාම Profile එකට යොමු කිරීම (Seamless Redirect)
      router.push('/profile');
    } else {
      setErrorMsg(error?.message || 'Invalid verification code.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-10 rounded-[2.5rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] border border-[#1d1d1d]">
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-[#FFD700] mb-2 tracking-wide drop-shadow-md">
            {step === 'request' ? 'Sign In' : 'Verify'}
          </h2>
          <p className="text-sm text-gray-400 font-medium">
            {step === 'request' 
              ? 'Enter Phone Number or Email' 
              : `Secure code sent to ${identifier}`}
          </p>
        </div>
        
        {step === 'request' ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-6">
            <input
              type="text"
              placeholder="+94 77 000 0000 or email@domain.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-6 py-5 rounded-2xl bg-[#121212] text-white outline-none shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] focus:shadow-[inset_8px_8px_16px_#070707,inset_-8px_-8px_16px_#1d1d1d] transition-all text-sm font-bold tracking-wider"
              required
            />
            {errorMsg && <p className="text-red-500 text-xs text-center font-bold bg-[#121212] p-2 rounded-lg shadow-[inset_2px_2px_4px_#070707]">{errorMsg}</p>}
            <button disabled={loading} className="mt-2 w-full py-5 rounded-2xl font-black text-[#121212] bg-[#FFD700] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all disabled:opacity-50 tracking-wider">
              {loading ? 'Sending OTP...' : 'Send Secure OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
            <input
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-6 py-5 rounded-2xl bg-[#121212] text-[#FFD700] text-center tracking-[1em] font-mono text-2xl outline-none shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] transition-all"
              maxLength={6}
              required
            />
            {errorMsg && <p className="text-red-500 text-xs text-center font-bold bg-[#121212] p-2 rounded-lg shadow-[inset_2px_2px_4px_#070707]">{errorMsg}</p>}
            <button disabled={loading} className="mt-2 w-full py-5 rounded-2xl font-black text-[#121212] bg-[#FFD700] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all disabled:opacity-50 tracking-wider">
              {loading ? 'Verifying...' : 'Verify & Enter Profile'}
            </button>
            <button type="button" onClick={() => setStep('request')} className="text-xs text-gray-500 hover:text-[#FFD700] text-center mt-2 font-bold transition-all">
              ← Change Phone/Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
