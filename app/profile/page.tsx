// app/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        setError('❌ LIFF ID ไม่ได้ตั้งค่าในระบบ');
        setLoading(false);
        return;
      }

      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const userProfile = await liff.getProfile();
        setProfile(userProfile);
      } catch (err) {
        console.error('LIFF init error:', err);
        setError('⚠️ ไม่สามารถเชื่อมต่อกับ LINE ได้');
      } finally {
        setLoading(false);
      }
    };

    initializeLiff();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">กำลังเชื่อมต่อกับ LINE...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-md">
        {/* Header with profile image + name side by side */}
        <div className="bg-indigo-600 p-6 flex items-center space-x-4">
          <img
            src={profile.pictureUrl || '/placeholder-avatar.png'}
            alt="profile"
            className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md"
            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/80?text=No+Image')}
          />
          <div className="text-white">
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
            <p className="text-sm font-mono text-gray-800 break-all">{profile.userId}</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              เชื่อมต่อกับ LINE สำเร็จ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}