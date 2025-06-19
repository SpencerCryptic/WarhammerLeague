'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

const links: { href: string; text: string }[] = [
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
    <nav>
      <div className='m-5 flex-row sm:flex items-center relative'>
        <Link href='/'>
          <Image width={60} height={60} src='/cabin-logo.png' alt='logo' />
        </Link>

        <ul className='flex-row sm:flex ml-auto'>
          {links.map((link) => (
            <li key={link.href} className='mr-4 hover:text-orange-400 transition-all duration-150'>
              <Link href={link.href}>{link.text}</Link>
            </li>
          ))}

          {user && (
            <li className='relative group'>
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className='hover:text-orange-400 font-semibold transition-all duration-150'
              >
                {user.username} ⌄
              </button>

              {showMenu && (
                <div className='absolute right-0 mt-2 bg-gray-800 text-white rounded shadow-lg w-40 z-50'>
                  <Link href='/settings' className='block px-4 py-2 hover:bg-gray-700'>
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className='w-full text-left px-4 py-2 hover:bg-red-600'
                  >
                    Logout
                  </button>
                </div>
              )}
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
