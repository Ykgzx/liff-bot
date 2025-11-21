// app/components/BottomNav.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Home',
      path: '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'กล่องจดหมาย',
      path: '/noti',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.8-8h4.8l-.4-1.6A4.5 4.5 0 0112 8a4.5 4.5 0 014.5 4.5l-.4 1.6h4.8z" />
        </svg>
      ),
      badge: 34,
    },
    {
      name: 'คะแนนสะสม',
      path: '/point',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Your Profile',
      path: '/profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200/60 px-4 py-2 flex justify-around items-center z-50 shadow-[0_-2px_20px_-5px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link key={item.name} href={item.path} className="flex flex-col items-center relative group">
            {/* ใช้ motion.div เพื่อเพิ่ม micro-interaction */}
            <motion.div
              className="relative mb-1"
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div
                className={`transition-colors duration-200 ${
                  isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-800'
                }`}
              >
                {item.icon}
              </div>
              {item.badge !== undefined && (
                <motion.span
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center leading-none"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </motion.span>
              )}
            </motion.div>

            <motion.span
              className={`text-xs font-medium ${
                isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-800'
              }`}
              initial={false}
              animate={{ y: isActive ? -4 : 0 }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              {item.name}
            </motion.span>

            {isActive && (
              <motion.div
                className="absolute bottom-[-8px] w-10 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                layoutId="activeIndicator"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}