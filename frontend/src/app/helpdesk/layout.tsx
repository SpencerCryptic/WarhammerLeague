'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

export default function HelpdeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketCounts, setTicketCounts] = useState({ open: 0, inProgress: 0, total: 0 });
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      const response = await fetch(`${API_URL}/api/users/me?populate=role`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        window.location.href = '/auth/login';
        return;
      }

      const user = await response.json();
      // Check if user has Support Helper role or is admin
      const roleName = user.role?.name?.toLowerCase() || '';
      const isSupport = roleName.includes('support') || roleName.includes('admin') || roleName.includes('helper');

      if (!isSupport) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);
      fetchTicketCounts(token);
    } catch (error) {
      window.location.href = '/auth/login';
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketCounts = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/support-tickets?pagination[limit]=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const tickets = data.data || [];
        setTicketCounts({
          open: tickets.filter((t: any) => t.status === 'open').length,
          inProgress: tickets.filter((t: any) => t.status === 'in_progress').length,
          total: tickets.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch ticket counts:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1117' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1117' }}>
        <div className="text-white text-xl">Unauthorized</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1117' }}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen border-r" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-2">Helpdesk</h1>
            <p className="text-gray-400 text-sm">Support Tickets</p>
          </div>

          <nav className="px-4 space-y-2">
            <Link
              href="/helpdesk"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>All Tickets</span>
              <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                {ticketCounts.total}
              </span>
            </Link>

            <Link
              href="/helpdesk?status=open"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk' && typeof window !== 'undefined' && window.location.search.includes('status=open')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>Open</span>
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                {ticketCounts.open}
              </span>
            </Link>

            <Link
              href="/helpdesk?status=in_progress"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk' && typeof window !== 'undefined' && window.location.search.includes('status=in_progress')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>In Progress</span>
              <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
                {ticketCounts.inProgress}
              </span>
            </Link>
          </nav>

          <div className="absolute bottom-0 left-0 w-64 p-4 border-t" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}>
            <Link
              href="/dashboard"
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
