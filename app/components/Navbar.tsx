// app/components/Navbar.tsx
'use client';

import { useEffect, useState } from 'react';

export default function Navbar() {
  const [profile, setProfile] = useState<{ displayName: string; pictureUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const liff = (await import('@line/liff')).default;
        // สมมติว่า LIFF ได้ init มาแล้ว (จาก layout หรือหน้าหลัก)
        // หากยังไม่ได้ init → คุณอาจต้อง init อีกครั้ง หรือส่ง profile มาจาก parent
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile();
          setProfile(p);
        }
      } catch (err) {
        console.warn('Cannot fetch profile in Navbar:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-end space-x-3">
        {loading ? (
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        ) : profile ? (
          <>
            <span className="text-gray-800 font-medium truncate max-w-[120px]">
              {profile.displayName}
            </span>
            <div className="relative">
              <img
                src={profile.pictureUrl || 'https://via.placeholder.com/32?text=U'}
                alt="profile"
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/32?text=U')}
              />
            </div>
          </>
        ) : (
          <span className="text-gray-500 text-sm">ไม่พบผู้ใช้</span>
        )}
      </div>
    </nav>
  );
}