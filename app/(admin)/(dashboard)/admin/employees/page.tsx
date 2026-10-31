// app/(admin)/(dashboard)/admin/employees/page.tsx — Employee Account Generator (RBAC).
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const POSITIONS = ['Manager', 'Kitchen', 'Driver'];
const PERMISSION_LEVELS = [
  { label: 'Full Access', value: 'full' },
  { label: 'Orders & Kitchen', value: 'orders' },
  { label: 'Deliveries', value: 'delivery' },
  { label: 'View Only', value: 'viewer' },
];

const PERMISSION_STYLE: Record<string, string> = {
  full: 'text-[#FFD700]',
  orders: 'text-green-400',
  delivery: 'text-blue-400',
  viewer: 'text-gray-500',
};

type Employee = {
  id: string;
  username: string;
  position: string;
  permission_level: string;
  is_active: boolean;
  created_at: string;
};

type CreatedAccount = {
  employee: { id: string; username: string; position: string; permission_level: string };
  password: string;
  login_url: string;
};

const inputBase =
  'w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [position, setPosition] = useState('Manager');
  const [permission, setPermission] = useState('full');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadEmployees() {
    try {
      const { data, error: err } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setEmployees((data ?? []) as Employee[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, permission_level: permission }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create employee.');
      setCreated(json as CreatedAccount);
      await loadEmployees();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create employee.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Revoke access for "${emp.username}" (${emp.position})?`)) return;
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete employee.');
      }
      await loadEmployees();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete employee.');
    }
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const panel = 'p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]';

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className={panel}>
        <h2 className="text-2xl font-black text-[#FFD700]">Employee Management</h2>
        <p className="text-sm text-gray-400 mt-1">
          Generate internal accounts (Manager, Kitchen, Driver) with strict Role-Based Access Control in Supabase.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Generator */}
      <div className={panel}>
        <h3 className="text-lg font-black text-[#FFD700] mb-5">👤 Employee Account Generator</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Job Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className={inputBase}>
              {POSITIONS.map((p) => (
                <option key={p} value={p} className="bg-[#121212]">
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Permission Level</label>
            <select value={permission} onChange={(e) => setPermission(e.target.value)} className={inputBase}>
              {PERMISSION_LEVELS.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#121212]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all disabled:opacity-60"
            >
              {creating ? 'Generating…' : '+ Generate Account'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-600 mt-4">
          Username and password are generated securely server-side (scrypt hashed). Share the secure login link once —
          credentials are not shown again.
        </p>
      </div>

      {/* Generated credentials */}
      {created && (
        <div className={`${panel} border border-[#FFD700]/40 flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#FFD700]">✅ Account Created — Share Securely</h3>
            <button
              onClick={() => setCreated(null)}
              className="text-xs font-bold text-gray-500 hover:text-[#FFD700] transition-all"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Username</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-gray-200 truncate">{created.employee.username}</span>
                <button
                  onClick={() => copyToClipboard(created.employee.username, 'u')}
                  className="text-xs font-bold text-[#FFD700] shrink-0"
                >
                  {copied === 'u' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Password</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-gray-200 truncate">{created.password}</span>
                <button
                  onClick={() => copyToClipboard(created.password, 'p')}
                  className="text-xs font-bold text-[#FFD700] shrink-0"
                >
                  {copied === 'p' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Position</div>
              <div className="font-bold text-gray-200">{created.employee.position}</div>
              <div className={`text-xs font-bold mt-1 ${PERMISSION_STYLE[created.employee.permission_level]}`}>
                {PERMISSION_LEVELS.find((p) => p.value === created.employee.permission_level)?.label}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Secure Login Link</div>
            <div className="flex items-center justify-between gap-2">
              <a
                href={created.login_url}
                className="font-mono text-xs text-[#FFD700] truncate hover:underline"
              >
                {created.login_url}
              </a>
              <button
                onClick={() => copyToClipboard(created.login_url, 'l')}
                className="text-xs font-bold text-[#FFD700] shrink-0"
              >
                {copied === 'l' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees table */}
      <div className={panel}>
        <h3 className="text-lg font-black text-[#FFD700] mb-5">👥 Active Employee Accounts</h3>
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No employee accounts yet. Generate the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#1d1d1d]">
                  <th className="py-3 px-2 font-bold">Username</th>
                  <th className="py-3 px-2 font-bold">Position</th>
                  <th className="py-3 px-2 font-bold">Permission Level</th>
                  <th className="py-3 px-2 font-bold">Status</th>
                  <th className="py-3 px-2 font-bold">Created</th>
                  <th className="py-3 px-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-[#1d1d1d] last:border-0">
                    <td className="py-3 px-2 font-mono font-bold text-gray-200">{emp.username}</td>
                    <td className="py-3 px-2 text-gray-400">{emp.position}</td>
                    <td className={`py-3 px-2 font-bold ${PERMISSION_STYLE[emp.permission_level]}`}>
                      {PERMISSION_LEVELS.find((p) => p.value === emp.permission_level)?.label || emp.permission_level}
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-3 py-1 rounded-lg text-xs font-bold text-green-400">
                        {emp.is_active ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500">
                      {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleDelete(emp)}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d] hover:text-red-300 transition-all"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
