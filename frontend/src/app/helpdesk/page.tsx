'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface Ticket {
  id: number;
  documentId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel: 'email' | 'messenger' | 'instagram' | 'web';
  customerName: string;
  customerEmail: string;
  lastMessageAt: string;
  createdAt: string;
  assignee?: {
    username: string;
  };
}

const statusColors: Record<string, string> = {
  open: 'bg-green-500',
  in_progress: 'bg-yellow-500',
  waiting: 'bg-blue-500',
  resolved: 'bg-gray-500',
  closed: 'bg-gray-600'
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400'
};

const channelIcons: Record<string, string> = {
  email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  messenger: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  instagram: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  web: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
};

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    channel: ''
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const status = searchParams.get('status') || '';
    setFilter(prev => ({ ...prev, status }));
  }, [searchParams]);

  const fetchTickets = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let url = `${API_URL}/api/support-tickets?populate=assignee&sort=lastMessageAt:desc&pagination[limit]=1000`;

      if (filter.status) {
        url += `&filters[status][$eq]=${filter.status}`;
      } else {
        // By default, exclude closed tickets from "All Tickets"
        url += `&filters[status][$ne]=closed`;
      }
      if (filter.priority) {
        url += `&filters[priority][$eq]=${filter.priority}`;
      }
      if (filter.channel) {
        url += `&filters[channel][$eq]=${filter.channel}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading tickets...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Support Tickets</h1>
          <p className="text-gray-400 mt-1">{tickets.length} tickets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.status}
          onChange={(e) => {
            setFilter(prev => ({ ...prev, status: e.target.value }));
            if (e.target.value) {
              router.push(`/helpdesk?status=${e.target.value}`);
            } else {
              router.push('/helpdesk');
            }
          }}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filter.priority}
          onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filter.channel}
          onChange={(e) => setFilter(prev => ({ ...prev, channel: e.target.value }))}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="web">Contact Form</option>
          <option value="messenger">Messenger</option>
          <option value="instagram">Instagram</option>
        </select>
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No tickets found</h3>
          <p className="text-gray-500">Tickets will appear here when customers contact support</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.documentId}
              href={`/helpdesk/${ticket.documentId}`}
              className="block rounded-lg p-4 border transition-all duration-200 hover:border-purple-500"
              style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Channel Icon */}
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={channelIcons[ticket.channel] || channelIcons.email} />
                    </svg>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{ticket.subject}</h3>
                      <span className={`w-2 h-2 rounded-full ${statusColors[ticket.status]}`}></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <span>{ticket.customerName || ticket.customerEmail || 'Unknown'}</span>
                      <span>-</span>
                      <span className={priorityColors[ticket.priority]}>{ticket.priority}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-gray-400 text-sm">{formatDate(ticket.lastMessageAt || ticket.createdAt)}</div>
                  {ticket.assignee && (
                    <div className="text-xs text-gray-500 mt-1">
                      Assigned to {ticket.assignee.username}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
