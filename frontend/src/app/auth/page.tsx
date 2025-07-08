'use client';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const LoginPage = dynamic(() => import('./login/page'));
const RegisterPage = dynamic(() => import('./register/page'));

export default function AuthRouter() {
  const pathname = usePathname();

  if (pathname === '/auth/login') return <LoginPage />;
  if (pathname === '/auth/register') return <RegisterPage />;

  return <div style={{ color: 'white' }}>404 - Auth Page Not Found</div>;
}
