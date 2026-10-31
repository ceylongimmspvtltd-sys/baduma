'use client';

import { useState } from 'react';

const NEUMO_INPUT =
  'w-full px-4 py-3 rounded-xl bg-[#121212] text-sm text-gray-200 font-bold outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] focus:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37] transition-all';

export default function ScheduleOrderPage() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !address || !contact) return;
    setConfirmed(true);
  };

  const formatted = () => {
    const d = new Date(`${date}T00:00:00`);
    const t = new Date(`2000-01-01T${time}:00`);
    return `${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const reset = () => {
    setConfirmed(false);
    setDate('');
    setTime('');
    setAddress('');
    setContact('');
    setNotes('');
  };

  return (
    <div className="flex flex-col gap-8 pt-4 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 tracking-wide">📅 Food Schedule</h1>
        <p className="text-sm text-gray-400 font-bold">Schedule an Order for a later time or date</p>
      </div>

      {confirmed ? (
        <div className="p-10 rounded-[2rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d,0_0_0_1px_#2a2a2a,0_0_30px_rgba(212,175,55,0.2)] border border-[#1d1d1d] text-center">
          <span className="text-5xl">✅</span>
          <h2 className="text-2xl font-black text-[#D4AF37] mt-4 tracking-wide">Order Scheduled!</h2>
          <p className="text-sm text-gray-300 mt-3 font-bold">
            Your delivery is set for <span className="text-white">{formatted()}</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            We'll confirm by phone before dispatching. Thank you for choosing බැදුම!
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 px-8 py-4 rounded-xl font-black text-[#121212] bg-[#D4AF37] shadow-[5px_5px_12px_#070707,-5px_-5px_12px_#8a6d1a] active:shadow-[inset_5px_5px_10px_#8a6d1a,inset_-5px_-5px_10px_#ffea4d] transition-all tracking-wider hover:brightness-110"
          >
            Schedule Another Order
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="flex flex-col gap-5 p-8 rounded-[2rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d]"
        >
          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={NEUMO_INPUT}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Time</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={NEUMO_INPUT}
                required
              />
            </label>
          </div>

          {/* Delivery Address */}
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Delivery Address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House No, Street, Area, Kandy"
              rows={3}
              className={`${NEUMO_INPUT} resize-none`}
              required
            />
          </label>

          {/* Contact Phone */}
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Contact Phone</span>
            <input
              type="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+94 77 000 0000"
              className={NEUMO_INPUT}
              required
            />
          </label>

          {/* Notes */}
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra instructions for the rider..."
              className={NEUMO_INPUT}
            />
          </label>

          {/* Submit */}
          <button
            type="submit"
            className="mt-2 w-full py-5 rounded-2xl font-black text-[#121212] bg-[#D4AF37] shadow-[6px_6px_14px_#070707,-6px_-6px_14px_#8a6d1a] active:shadow-[inset_5px_5px_10px_#8a6d1a,inset_-5px_-5px_10px_#ffea4d] transition-all tracking-wider text-lg hover:brightness-110"
          >
            Schedule Order
          </button>
        </form>
      )}
    </div>
  );
}
