const links: {href: string, text: string}[] = [
    { href: '/leagues', text: 'leagues' },
    { href: '/stats', text: 'stats' },
    { href: '/settings', text: 'settings' }
];

import Link from 'next/link';
import Image from 'next/image'
import React from 'react';

const Navbar = () => {
  return (
    <nav>
        <div className='m-5 flex-row sm:flex'>
            <Link href='/'>
                <Image width={60} height={60} src="/cabin-logo.png" alt="logo" />
            </Link>
            <span className='ml-auto'></span>
            <ul className='flex-row sm:flex'>
                {
                    links.map((link: {href: string, text: string}) => (
                        <li key={link.href} className='mr-4 hover:text-orange-400 ease-linear transition-all duration-150'>
                            <Link href={link.href}>
                                {link.text}
                            </Link>
                        </li>
                    ))
                }
            </ul>
        </div>
    </nav>
  )
}

export default Navbar