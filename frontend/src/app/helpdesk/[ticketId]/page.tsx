'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface Message {
  id: number;
  content: string;
  direction: 'inbound' | 'outbound';
  senderType: 'customer' | 'agent' | 'system';
  senderName: string;
  attachments: string[];
  createdAt: string;
}

interface Ticket {
  id: number;
  documentId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel: 'email' | 'messenger' | 'instagram';
  channelId: string;
  customerName: string;
  customerEmail: string;
  lastMessageAt: string;
  createdAt: string;
  assignee?: {
    id: number;
    username: string;
  };
  messages: Message[];
}

interface User {
  id: number;
  username: string;
  email: string;
  role?: {
    name: string;
  };
}

const statusOptions = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];

const statusColors: Record<string, string> = {
  open: 'bg-green-500',
  in_progress: 'bg-yellow-500',
  waiting: 'bg-blue-500',
  resolved: 'bg-gray-500',
  closed: 'bg-gray-600'
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchTicket();
    fetchUsers();
    fetchCurrentUser();
  }, [ticketId]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/support-tickets/${ticketId}?populate[messages][sort]=createdAt:asc&populate=assignee`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTicket(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users?populate=role`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to only show Support Helper users
        const supportUsers = data.filter((user: User) => {
          const roleName = user.role?.name?.toLowerCase() || '';
          return roleName.includes('support') || roleName.includes('admin') || roleName.includes('helper');
        });
        setUsers(supportUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const updateTicket = async (field: string, value: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !ticket) return;

      const response = await fetch(`${API_URL}/api/support-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: { [field]: value } })
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(prev => prev ? { ...prev, [field]: value } : null);

        // Send email notification when assignee changes
        if (field === 'assignee' && value) {
          const assignedUser = users.find(u => u.id === value);
          if (assignedUser?.email) {
            fetch('/api/helpdesk/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'assignment',
                ticketId: ticket.documentId,
                ticketSubject: ticket.subject,
                assigneeEmail: assignedUser.email,
                assigneeName: assignedUser.username
              })
            }).catch(err => console.error('Failed to send notification:', err));
          }
        }
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const sendReply = async () => {
    if (!replyContent.trim() || !ticket || !currentUser) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Create the message in Strapi
      const messageResponse = await fetch(`${API_URL}/api/ticket-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            ticket: ticket.id,
            content: replyContent,
            direction: 'outbound',
            senderType: 'agent',
            senderName: currentUser.username
          }
        })
      });

      if (messageResponse.ok) {
        // Send via the appropriate channel using our Netlify function
        const replyResponse = await fetch('/api/helpdesk/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.documentId,
            channel: ticket.channel,
            channelId: ticket.channelId,
            content: replyContent,
            customerEmail: ticket.customerEmail
          })
        });

        // Update lastMessageAt
        await updateTicket('lastMessageAt', new Date().toISOString());

        // If status is open, change to in_progress
        if (ticket.status === 'open') {
          await updateTicket('status', 'in_progress');
        }

        setReplyContent('');
        fetchTicket();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading ticket...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-white mb-4">Ticket not found</h2>
        <Link href="/helpdesk" className="text-purple-400 hover:text-purple-300">
          Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-6">
          <Link href="/helpdesk" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
            &larr; Back to tickets
          </Link>
          <h1 className="text-2xl font-bold text-white">{ticket.subject}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
            <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span>via {ticket.channel}</span>
            <span>-</span>
            <span>Created {formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        {/* Conversation */}
        <div className="rounded-xl border mb-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}>
            <h2 className="text-lg font-semibold text-white">Conversation</h2>
          </div>

          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.direction === 'outbound'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {message.senderName} - {formatDate(message.createdAt)}
                    </div>
                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: message.content }} />
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 text-xs">
                        {message.attachments.length} attachment(s)
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No messages yet
              </div>
            )}
          </div>
        </div>

        {/* Reply Box */}
        <div className="rounded-xl border p-4" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your reply..."
            className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
            rows={4}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-gray-400 text-sm">
              Reply will be sent via {ticket.channel}
            </div>
            <button
              onClick={sendReply}
              disabled={sending || !replyContent.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80">
        {/* Customer Info */}
        <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <h3 className="text-lg font-semibold text-white mb-4">Customer</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-400">Name</div>
              <div className="text-white">{ticket.customerName || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-gray-400">Email</div>
              <div className="text-white">{ticket.customerEmail || 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-400">Channel ID</div>
              <div className="text-white text-xs break-all">{ticket.channelId || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Ticket Properties */}
        <div className="rounded-xl border p-4" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <h3 className="text-lg font-semibold text-white mb-4">Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => updateTicket('status', e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicket('priority', e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1">Assignee</label>
              <select
                value={ticket.assignee?.id || ''}
                onChange={(e) => updateTicket('assignee', e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
