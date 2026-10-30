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
      router.push('/profile');
    } else {
      setErrorMsg(error?.message || 'Invalid verification code.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#121212] shadow-[10px_10px_20px_#070707,-10px_-10px_20px_#1d1d1d] border border-[#1d1d1d]">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#FFD700] mb-2 tracking-wide">
            {step === 'request' ? 'Sign In / Register' : 'Verify Account'}
          </h2>
          <p className="text-xs text-gray-400">
            {step === 'request' 
              ? 'Enter Phone Number or Email to receive an OTP' 
              : `Code sent to ${identifier}`}
          </p>
        </div>
        
        {step === 'request' ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="+94 77 000 0000 or email@domain.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-4 rounded-xl bg-[#121212] text-white outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] focus:shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] transition-all text-sm"
              required
            />
            {errorMsg && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
            <button disabled={loading} className="w-full py-4 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all">
              {loading ? 'Sending OTP...' : 'Send Secure OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
            <input
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-4 rounded-xl bg-[#121212] text-white text-center tracking-[0.5em] font-mono text-xl outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all"
              maxLength={6}
              required
            />
            {errorMsg && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
            <button disabled={loading} className="w-full py-4 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all">
              {loading ? 'Verifying...' : 'Verify & Enter Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
