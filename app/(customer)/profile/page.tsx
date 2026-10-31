// app/(customer)/profile/page.tsx — Loyalty gamification (points + task completion).
"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Profile = {
  user_id: string;
  points: number;
  avatar_url: string | null;
  two_factor_enabled: boolean;
  email_added: boolean;
  facebook_linked: boolean;
  instagram_linked: boolean;
};

type TaskKey = 'avatar' | 'twofa' | 'email' | 'facebook' | 'instagram';

const TASKS: { key: TaskKey; title: string; desc: string; points: number; icon: string }[] = [
  { key: 'avatar', title: 'Upload Profile Picture', desc: 'Personalize your account', points: 50, icon: '🖼️' },
  { key: 'twofa', title: 'Enable 2FA', desc: 'Extra security for your account', points: 100, icon: '🔐' },
  { key: 'email', title: 'Add Email Address', desc: 'Recover access anytime', points: 75, icon: '✉️' },
  { key: 'facebook', title: 'Link Facebook', desc: 'Connect your social accounts', points: 50, icon: '📘' },
  { key: 'instagram', title: 'Link Instagram', desc: 'Connect your social accounts', points: 50, icon: '📸' },
];

const TOTAL_POINTS = TASKS.reduce((sum, t) => sum + t.points, 0);

const FB_URL = 'https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr';
const IG_URL = 'https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr';

export default function CustomerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; phone?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Load session + profile ---------- */

  useEffect(() => {
    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const authUser = authData.user;
        if (!authUser) {
          router.replace('/login');
          return;
        }
        setUser({
          id: authUser.id,
          email: authUser.email ?? undefined,
          phone: authUser.phone ?? undefined,
          user_metadata: authUser.user_metadata as { full_name?: string } | undefined,
        });

        const { data, error: err } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();
        if (err) throw err;

        if (!data) {
          await supabase.from('profiles').insert({ user_id: authUser.id });
          setProfile({
            user_id: authUser.id,
            points: 0,
            avatar_url: null,
            two_factor_enabled: false,
            email_added: false,
            facebook_linked: false,
            instagram_linked: false,
          });
        } else {
          setProfile(data as Profile);
          // Auto-award the email task when the account already has an email.
          // Points are awarded by `complete_loyalty_task()` on the server — the
          // client can no longer write the `points` column itself.
          if (authUser.email && !(data as Profile).email_added) {
            await supabase
              .from('profiles')
              .update({ email_added: true })
              .eq('user_id', authUser.id);
            const { data: newPoints } = await supabase.rpc('complete_loyalty_task', { p_task: 'email' });
            setProfile((p) => ({
              ...(p as Profile),
              email_added: true,
              points: typeof newPoints === 'number' ? newPoints : (p as Profile).points,
            }));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Task completion ---------- */

  function isDone(key: TaskKey): boolean {
    if (!profile || !user) return false;
    switch (key) {
      case 'avatar':
        return !!profile.avatar_url;
      case 'twofa':
        return profile.two_factor_enabled;
      case 'email':
        return profile.email_added || !!user.email;
      case 'facebook':
        return profile.facebook_linked;
      case 'instagram':
        return profile.instagram_linked;
    }
  }

  async function award(key: TaskKey, patch: Partial<Profile>) {
    if (!user || !profile || isDone(key)) return;
    const task = TASKS.find((t) => t.key === key)!;
    setBusy(true);
    try {
      // 1. Persist the non-monetary flag (avatar URL, linked social, …).
      const { error: patchErr } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user.id);
      if (patchErr) throw patchErr;

      // 2. Award the points server-side. `complete_loyalty_task` is a SECURITY
      //    DEFINER RPC with a unique (user_id, task) ledger row, so points can
      //    be earned once per task and can never be forged by the client.
      const { data: newPoints, error: pointsErr } = await supabase.rpc('complete_loyalty_task', {
        p_task: key,
      });
      if (pointsErr) throw pointsErr;

      setProfile((current) => ({
        ...((current ?? profile) as Profile),
        ...patch,
        points: typeof newPoints === 'number' ? newPoints : (current ?? profile).points,
      }));
      setMessage(`+${task.points} points! ${task.title} completed.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save progress.');
      setProfile(profile);
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}${file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.png'}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await award('avatar', { avatar_url: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handle2FA() {
    if (isDone('twofa')) return;
    if (!confirm('Enable Two-Factor Authentication? Your account will require an OTP code at sign-in.')) return;
    await award('twofa', { two_factor_enabled: true });
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user || isDone('email')) return;
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ email: emailInput.trim() });
      if (err) throw err;
      await award('email', { email_added: true });
      setEmailInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add email. Check your inbox to confirm.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkSocial(key: 'facebook' | 'instagram', url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
    await award(key, { [key === 'facebook' ? 'facebook_linked' : 'instagram_linked']: true } as Partial<Profile>);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-500">Loading your profile…</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center gap-4 py-32">
        <p className="text-gray-500">{error || 'Unable to load profile.'}</p>
        <button onClick={() => router.replace('/login')} className="px-6 py-3 rounded-xl font-bold text-[#121212] bg-[#FFD700]">
          Go to Sign In
        </button>
      </div>
    );
  }

  const completedCount = TASKS.filter((t) => isDone(t.key)).length;
  const progress = Math.round((completedCount / TASKS.length) * 100);
  const displayName = user.user_metadata?.full_name || user.email || user.phone || 'Member';

  const inputBase =
    'w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all';

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Profile header + points */}
      <div className="p-8 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-24 h-24 rounded-3xl object-cover shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] flex items-center justify-center text-4xl">
              👤
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
          />
          {!isDone('avatar') && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="absolute -bottom-3 -right-3 px-4 py-2 rounded-xl text-xs font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00] disabled:opacity-60"
            >
              📷
            </button>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-black text-gray-200">{displayName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {user.phone || 'No phone linked'} · Member since your first order
          </p>
          <div className="flex justify-center sm:justify-start gap-3 mt-4">
            <span className="px-4 py-2 rounded-xl text-sm font-black text-[#FFD700] bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d]">
              {profile.points} Points
            </span>
            <span className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
              {completedCount}/{TASKS.length} Tasks
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] hover:text-red-400 transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Progress bar */}
      <div className="p-8 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-[#FFD700]">Loyalty Progress</h3>
          <span className="text-sm font-bold text-gray-400">{progress}% complete</span>
        </div>
        <div className="h-5 rounded-full bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#ffea4d] shadow-[0_0_12px_rgba(255,215,0,0.6)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Earn all {TOTAL_POINTS} points by completing every task below.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-green-500/40 text-green-400 text-sm">
          {message}
        </div>
      )}

      {/* Tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {TASKS.map((task) => {
          const done = isDone(task.key);
          return (
            <div
              key={task.key}
              className={`p-6 rounded-3xl bg-[#121212] border border-[#1d1d1d] flex flex-col gap-4 transition-all ${
                done
                  ? 'shadow-[inset_5px_5px_10px_#070707,inset_-5px_-5px_10px_#1d1d1d]'
                  : 'shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-3xl">{task.icon}</div>
                {done ? (
                  <span className="px-3 py-1 rounded-lg text-[10px] font-black text-green-400 bg-[#121212] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d]">
                    ✓ COMPLETED
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg text-[10px] font-black text-[#FFD700] bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]">
                    +{task.points} PTS
                  </span>
                )}
              </div>
              <div>
                <h4 className="font-black text-gray-200">{task.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{task.desc}</p>
              </div>

              {task.key === 'email' && !done ? (
                <form onSubmit={handleAddEmail} className="flex flex-col gap-3 mt-auto">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className={inputBase}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2.5 rounded-xl text-sm font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00] disabled:opacity-60"
                  >
                    Add Email
                  </button>
                </form>
              ) : task.key === 'twofa' && !done ? (
                <button
                  onClick={handle2FA}
                  disabled={busy}
                  className="mt-auto px-4 py-2.5 rounded-xl text-sm font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00] disabled:opacity-60"
                >
                  Enable 2FA
                </button>
              ) : task.key === 'facebook' && !done ? (
                <button
                  onClick={() => handleLinkSocial('facebook', FB_URL)}
                  disabled={busy}
                  className="mt-auto px-4 py-2.5 rounded-xl text-sm font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00] disabled:opacity-60"
                >
                  Link Facebook
                </button>
              ) : task.key === 'instagram' && !done ? (
                <button
                  onClick={() => handleLinkSocial('instagram', IG_URL)}
                  disabled={busy}
                  className="mt-auto px-4 py-2.5 rounded-xl text-sm font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00] disabled:opacity-60"
                >
                  Link Instagram
                </button>
              ) : (
                <div className="mt-auto text-xs font-bold text-green-400 flex items-center gap-2">
                  <span>✓</span> Completed — points added
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
