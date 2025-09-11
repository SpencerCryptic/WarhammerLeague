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
      <div className='mx-3 my-4 sm:m-5 flex flex-col sm:flex-row items-start sm:items-center relative'>
        <Link href='/' className='mb-3 sm:mb-0'>
          <Image width={48} height={48} src='/cabin-logo.png' alt='logo' className='sm:w-[60px] sm:h-[60px]' />
        </Link>

        <ul className='flex flex-col sm:flex-row ml-0 sm:ml-auto w-full sm:w-auto'>
          {links.map((link) => (
            <li key={link.href} className='mb-2 sm:mb-0 sm:mr-4 hover:text-orange-400 transition-all duration-150'>
              <Link href={link.href} className='text-sm sm:text-base'>{link.text}</Link>
            </li>
          ))}

          {user ? (
            <li className='relative group'>
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className='hover:text-orange-400 font-semibold transition-all duration-150 text-sm sm:text-base'
              >
                {user.username} ⌄
              </button>

              {showMenu && (
                <div className='absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 bg-gray-800 text-white rounded shadow-lg w-full sm:w-40 z-50 max-w-xs'>
                  <Link href='/settings' className='block px-3 py-2 text-sm hover:bg-gray-700'>
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-red-600'
                  >
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <div className='flex flex-col sm:flex-row w-full sm:w-auto'>
              <li className='mb-2 sm:mb-0 sm:mr-4'>
                <Link 
                  href='/auth/login'
                  className='hover:text-orange-400 transition-all duration-150 px-3 py-1 text-sm sm:text-base'
                >
                  Login
                </Link>
              </li>
              <li>
                <Link 
                  href='/auth/register'
                  className='bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-semibold transition-all duration-150 text-sm sm:text-base inline-block text-center'
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
