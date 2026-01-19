// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setError('❌ LIFF ID ไม่ได้ตั้งค่า');
        setLoading(false);
        return;
      }

      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error('LIFF error:', err);
        setError('⚠️ ไม่สามารถเชื่อมต่อกับ LINE ได้');
      } finally {
        setLoading(false);
      }
    };

    initLiff();
  }, []);

  const handleLogin = async () => {
    const liff = (await import('@line/liff')).default;
    liff.login();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative">
            <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-indigo-200"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">กำลังเชื่อมต่อกับระบบ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center border border-rose-100">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">เชื่อมต่อไม่สำเร็จ</h2>
          <p className="text-gray-600 mb-5 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm w-full"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center px-4 pb-24">
        {/* Header */}
        <div className="w-full max-w-md pt-8 text-center">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl text-white">👋</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ยินดีต้อนรับ!</h1>
          <p className="text-gray-600 mt-1">พร้อมใช้งานแล้ว เริ่มต้นได้เลย</p>
        </div>

        {/* Quick Stats / Summary */}
        <div className="w-full max-w-md mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold text-indigo-700">1,250</div>
            <div className="text-xs text-gray-500 mt-1">คะแนนสะสม</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-lg font-bold text-emerald-600">3</div>
            <div className="text-xs text-gray-500 mt-1">แคมเปญใหม่</div>
          </div>
        </div>

        {/* Action Cards - เปลี่ยนเป็น 3 ปุ่มที่สำคัญ */}
        <div className="w-full max-w-md mt-6 space-y-3">
          <button
            onClick={() => router.push('/campaign')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mr-3">
                <span className="text-amber-700">🎁</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">แคมเปญพิเศษ</div>
                <div className="text-xs text-gray-500">รับส่วนลด 20%</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => router.push('/ai-chat')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                <span className="text-blue-700">🤖</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">คุยกับ AI</div>
                <div className="text-xs text-gray-500">ถามคำถามได้ทุกเรื่อง</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => router.push('/rewards')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                <span className="text-purple-700">🏆</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">การเงินส่วนตัว</div>
                <div className="text-xs text-gray-500">ดูสถานะการเงิน</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 w-full max-w-md">
          <button
            onClick={() => router.push('/profile')}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            ดูโปรไฟล์ของคุณ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md space-y-2">
        {/* Logo / Icon */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-white">💬</span>
          </div>
          <div className="absolute -inset-2 bg-indigo-300/30 rounded-2xl blur animate-pulse"></div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          ยินดีต้อนรับสู่ <span className="text-indigo-600">Chatbot</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 mt-3 mb-8 leading-relaxed">
          เชื่อมต่อผ่าน LINE เพื่อเข้าถึงบริการพิเศษ คะแนนสะสม และแคมเปญสุดเอ็กซ์คลูซีฟ
        </p>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full max-w-xs px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 active:translate-y-0"
        >
          🔑 เข้าสู่ระบบด้วย LINE
        </button>

        {/* Footer note */}
        <div className="mt-8 text-sm text-gray-500">
          <p>บริการนี้ใช้งานได้เฉพาะในแอป LINE เท่านั้น</p>
        </div>
      </div>
    </div>
  );
}