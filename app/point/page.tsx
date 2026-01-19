// app/point/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export default function PointPage() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        console.error('NEXT_PUBLIC_LIFF_ID is missing in .env.local');
        setMessage({ type: 'error', text: 'ไม่พบ LIFF ID — ตรวจสอบ .env.local' });
        return;
      }

      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          console.log('User not logged in. Redirecting to LINE login...');
          liff.login();
          return;
        }

        const prof = await liff.getProfile();
        console.log('LINE Profile:', prof); // 🔍 ดีบั๊ก: ตรวจสอบ userId

        // 🔒 ตรวจสอบว่าได้ userId จริงหรือไม่
        if (!prof?.userId || typeof prof.userId !== 'string') {
          console.error('Invalid or missing userId from LINE profile');
          setMessage({ type: 'error', text: 'ไม่สามารถรับข้อมูลผู้ใช้จาก LINE ได้' });
          return;
        }

        setProfile(prof);
        loadPoints(prof.userId);
      } catch (err) {
        console.error('LIFF initialization error:', err);
        setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อกับ LINE ได้' });
      }
    };

    initLiff();
  }, []);

  const loadPoints = async (lineId: string) => {
    console.log('Fetching points for lineId:', lineId); // 🔍 ดีบั๊ก: ดูว่าส่งอะไรไป

    if (!lineId || typeof lineId !== 'string') {
      setMessage({ type: 'error', text: 'ไม่มีข้อมูลผู้ใช้' });
      return;
    }

    try {
      const encodedLineId = encodeURIComponent(lineId);
      const res = await fetch(`/api/points?lineId=${encodedLineId}`);
      const data = await res.json();

      if (!res.ok) {
        console.error('API error response:', data);
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      if (data.success) {
        setPoints(data.totalPoints);
      } else {
        setMessage({ type: 'error', text: data.message || 'ไม่สามารถโหลดแต้มได้' });
      }
    } catch (err) {
      console.error('Failed to load points:', err);
      setMessage({ type: 'error', text: 'ไม่สามารถโหลดแต้มได้' });
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !code.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: profile.userId,
          code: code.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setCode('');
        loadPoints(profile.userId);
      } else {
        setMessage({ type: 'error', text: data.message || 'เกิดข้อผิดพลาด' });
      }
    } catch (err) {
      console.error('Redeem error:', err);
      setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pt-20 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">คะแนนสะสม</h1>

      {profile ? (
        <p className="mt-1 text-gray-600">สวัสดี, {profile.displayName}</p>
      ) : (
        <p className="text-gray-500">กำลังโหลด...</p>
      )}

      <div className="mt-2">
        {points !== null ? (
          <p className="text-3xl font-bold text-indigo-600">{points.toLocaleString()} แต้ม</p>
        ) : (
          <p className="text-gray-400">...</p>
        )}
      </div>

      <form onSubmit={handleRedeem} className="mt-6 space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="กรอกรหัสแลกแต้ม (เช่น ABC123)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white ${
            loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
          } transition`}
        >
          {loading ? 'กำลังแลก...' : 'แลกแต้ม'}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-center ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-8 text-xs text-gray-500">
        <p>• รหัสแลกแต้มใช้ได้ครั้งเดียวเท่านั้น</p>
        <p>• แต้มจะอัปเดตทันทีหลังแลกสำเร็จ</p>
      </div>
    </div>
  );
}