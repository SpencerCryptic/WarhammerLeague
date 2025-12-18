'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

export default function HelpdeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketCounts, setTicketCounts] = useState({ open: 0, inProgress: 0, waiting: 0, resolved: 0, closed: 0, total: 0, assignedToMe: 0 });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      setCurrentUserId(user.id);
      fetchTicketCounts(token, user.id);
    } catch (error) {
      window.location.href = '/auth/login';
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketCounts = useCallback(async (token: string, userId?: number) => {
    try {
      const response = await fetch(`${API_URL}/api/support-tickets?populate=assignee&pagination[limit]=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const tickets = data.data || [];
        const closed = tickets.filter((t: any) => t.status === 'closed').length;
        const userIdToCheck = userId || currentUserId;
        setTicketCounts({
          open: tickets.filter((t: any) => t.status === 'open').length,
          inProgress: tickets.filter((t: any) => t.status === 'in_progress').length,
          waiting: tickets.filter((t: any) => t.status === 'waiting').length,
          resolved: tickets.filter((t: any) => t.status === 'resolved').length,
          closed: closed,
          total: tickets.length - closed, // Active tickets (excludes closed)
          assignedToMe: tickets.filter((t: any) => t.assignee?.id === userIdToCheck && t.status !== 'closed').length
        });
      }
    } catch (error) {
      console.error('Failed to fetch ticket counts:', error);
    }
  }, [currentUserId]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!isAuthorized || !currentUserId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const interval = setInterval(() => {
      fetchTicketCounts(token, currentUserId);
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthorized, currentUserId, fetchTicketCounts]);

  // Refresh counts when pathname or search params change
  useEffect(() => {
    if (!isAuthorized || !currentUserId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetchTicketCounts(token, currentUserId);
  }, [pathname, searchParams, isAuthorized, currentUserId, fetchTicketCounts]);

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
    <div className="fixed inset-x-0 top-[72px] bottom-0 z-40" style={{ backgroundColor: '#0F1117' }}>
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <aside className="w-64 h-full border-r overflow-y-auto flex-shrink-0" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-2">Helpdesk</h1>
            <p className="text-gray-400 text-sm">Support Tickets</p>
          </div>

          <nav className="px-4 space-y-2">
            <Link
              href="/helpdesk"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk' && !searchParams.get('status') && !searchParams.get('assignee')
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
              href="/helpdesk?assignee=me"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                searchParams.get('assignee') === 'me'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>Assigned to Me</span>
              <span className={`text-white text-xs px-2 py-1 rounded-full ${ticketCounts.assignedToMe > 0 ? 'bg-purple-500' : 'bg-gray-600'}`}>
                {ticketCounts.assignedToMe}
              </span>
            </Link>

            <div className="border-t my-2" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }} />

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

            <Link
              href="/helpdesk?status=waiting"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk' && typeof window !== 'undefined' && window.location.search.includes('status=waiting')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>Waiting</span>
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {ticketCounts.waiting}
              </span>
            </Link>

            <Link
              href="/helpdesk?status=resolved"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk' && typeof window !== 'undefined' && window.location.search.includes('status=resolved')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>Resolved</span>
              <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                {ticketCounts.resolved}
              </span>
            </Link>

            <Link
              href="/helpdesk?status=closed"
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                pathname === '/helpdesk' && typeof window !== 'undefined' && window.location.search.includes('status=closed')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>Closed</span>
              <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                {ticketCounts.closed}
              </span>
            </Link>

            <div className="border-t mt-4 pt-4" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}>
              <Link
                href="/helpdesk/settings"
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  pathname === '/helpdesk/settings'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
