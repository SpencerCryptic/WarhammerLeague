'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

const publicLinks: { href: string; text: string }[] = [
  { href: '/leagues', text: 'leagues' },
  { href: '/stats', text: 'stats' },
];

const authenticatedLinks: { href: string; text: string }[] = [
  { href: '/dashboard', text: 'dashboard' },
  { href: '/leagues', text: 'leagues' },
  { href: '/stats', text: 'stats' },
];

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (err) {
        console.error('Invalid user JSON in localStorage');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  };

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg border-b border-gray-700">
      <div className='max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between'>
        <Link href='/' className='flex-shrink-0'>
          <Image width={40} height={40} src='/cabin-logo.png' alt='logo' className='sm:w-[48px] sm:h-[48px] object-contain' />
        </Link>

        <ul className='flex items-center space-x-4 sm:space-x-6 ml-4'>
          {(user ? authenticatedLinks : publicLinks).map((link) => (
            <li key={link.href} className='hover:text-orange-400 transition-all duration-150'>
              <Link href={link.href} className='text-sm sm:text-base font-medium'>{link.text}</Link>
            </li>
          ))}

          {user ? (
            <li className='relative group'>
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className='hover:text-orange-400 font-semibold transition-all duration-150 text-sm sm:text-base px-2 py-1 rounded flex items-center max-w-[120px] sm:max-w-none'
              >
                <span className='truncate'>{user.username}</span>
                <span className='ml-1 flex-shrink-0'>⌄</span>
              </button>

              {showMenu && (
                <div className='absolute right-0 mt-2 bg-gray-800 text-white rounded-lg shadow-xl w-36 sm:w-40 z-50 border border-gray-600'>
                  <Link href='/settings' className='block px-4 py-2 text-sm hover:bg-gray-700 rounded-t-lg'>
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className='w-full text-left px-4 py-2 text-sm hover:bg-red-600 rounded-b-lg'
                  >
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <div className='flex items-center space-x-2 sm:space-x-4'>
              <li>
                <Link 
                  href='/auth/login'
                  className='hover:text-orange-400 transition-all duration-150 px-2 py-1 text-sm sm:text-base font-medium'
                >
                  login
                </Link>
              </li>
              <li>
                <Link 
                  href='/auth/register'
                  className='bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold transition-all duration-150 text-sm sm:text-base'
                >
                  Register
                </Link>
              </li>
            </div>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
