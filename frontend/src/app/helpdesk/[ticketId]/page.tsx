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
  messageId?: string; // Gmail messageId for marking as read
  attachments: string[];
  createdAt: string;
}

interface Ticket {
  id: number;
  documentId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel: 'email' | 'messenger' | 'instagram' | 'web';
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
  firstName?: string;
  lastName?: string;
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

/**
 * Format email content for better display
 * - Removes forwarded message headers
 * - Extracts key fields from contact forms
 * - Cleans up formatting
 */
function formatMessageContent(content: string): { formatted: string; fields?: Record<string, string> } {
  if (!content) return { formatted: '' };

  // Check if this looks like a contact form submission
  const isContactForm = content.includes('First Name:') ||
                        content.includes('Last Name:') ||
                        content.includes('Email:') ||
                        content.includes('Message:');

  if (isContactForm) {
    // Extract fields from contact form
    const fields: Record<string, string> = {};
    const lines = content.split('\n');
    let currentField = '';
    let messageLines: string[] = [];
    let inMessage = false;

    for (const line of lines) {
      // Skip forwarded message headers
      if (line.includes('---------- Forwarded message') ||
          line.startsWith('From:') && line.includes('@') ||
          line.startsWith('Date:') ||
          line.startsWith('Subject:') && lines.indexOf(line) < 10 ||
          line.startsWith('To:')) {
        continue;
      }

      // Check for field patterns
      const fieldMatch = line.match(/^(First ?Name|Last ?Name|Name|Email|Phone|Subject|Message|Other)[:\s]+(.*)$/i);
      if (fieldMatch) {
        currentField = fieldMatch[1].toLowerCase().replace(' ', '');
        const value = fieldMatch[2].trim();
        if (currentField === 'message') {
          inMessage = true;
          if (value) messageLines.push(value);
        } else if (value) {
          fields[currentField] = value;
        }
      } else if (inMessage) {
        messageLines.push(line);
      } else if (currentField && line.trim()) {
        // This might be a continuation of the previous field
        fields[currentField] = (fields[currentField] || '') + ' ' + line.trim();
      }
    }

    if (messageLines.length > 0) {
      fields['message'] = messageLines.join('\n').trim();
    }

    // Build formatted output
    let formatted = '';
    if (fields['firstname'] || fields['lastname']) {
      formatted += `**Name:** ${fields['firstname'] || ''} ${fields['lastname'] || ''}\n`;
    } else if (fields['name']) {
      formatted += `**Name:** ${fields['name']}\n`;
    }
    if (fields['email']) formatted += `**Email:** ${fields['email']}\n`;
    if (fields['phone']) formatted += `**Phone:** ${fields['phone']}\n`;
    if (fields['subject']) formatted += `**Subject:** ${fields['subject']}\n`;
    if (fields['message']) {
      formatted += `\n${fields['message']}`;
    }

    return { formatted: formatted.trim() || content, fields };
  }

  // For regular emails, clean up forwarded headers and quoted text
  let cleaned = content
    // Remove forwarded message headers
    .replace(/---------- Forwarded message ---------[\s\S]*?(?=\n\n|\n[A-Z])/gi, '')
    .replace(/^From:.*$/gm, '')
    .replace(/^Date:.*$/gm, '')
    .replace(/^Subject:.*$/gm, '')
    .replace(/^To:.*$/gm, '');

  // Remove "On ... wrote:" lines and everything after (quoted reply)
  const onWroteMatch = cleaned.match(/\n*On .+? wrote:[\s\S]*/i);
  if (onWroteMatch) {
    cleaned = cleaned.replace(onWroteMatch[0], '');
  }

  // Remove lines starting with > (quoted text)
  cleaned = cleaned
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  // Remove signature dividers and everything after
  const sigDividerMatch = cleaned.match(/\n---+\s*\n[\s\S]*/);
  if (sigDividerMatch) {
    cleaned = cleaned.replace(sigDividerMatch[0], '');
  }

  // Remove "Ref: #" lines
  cleaned = cleaned.replace(/^Ref:\s*#\w+.*$/gm, '');

  // Remove "Ticket Reference:" lines
  cleaned = cleaned.replace(/^Ticket Reference:.*$/gm, '');

  // Clean up multiple newlines and trim
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .trim();

  return { formatted: cleaned || content };
}

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
  const [blocking, setBlocking] = useState(false);

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

        // For assignee, update with full user object so UI reflects the change
        if (field === 'assignee') {
          const assignedUser = value ? users.find(u => u.id === value) : null;
          setTicket(prev => prev ? { ...prev, assignee: assignedUser ? { id: assignedUser.id, username: assignedUser.username } : undefined } : null);
        } else {
          setTicket(prev => prev ? { ...prev, [field]: value } : null);
        }

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

          // Mark Gmail emails as read when ticket is assigned
          const gmailMessageIds = ticket.messages
            ?.filter(m => m.direction === 'inbound' && m.messageId)
            .map(m => m.messageId);

          if (gmailMessageIds && gmailMessageIds.length > 0) {
            fetch('/api/helpdesk/mark-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageIds: gmailMessageIds })
            }).catch(err => console.error('Failed to mark emails as read:', err));
          }
        }

        // Send resolved notification when status changes to resolved
        if (field === 'status' && value === 'resolved' && ticket.customerEmail) {
          fetch('/api/helpdesk/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'resolved',
              ticketId: ticket.documentId,
              ticketSubject: ticket.subject,
              customerEmail: ticket.customerEmail,
              channel: ticket.channel,
              channelId: ticket.channelId
            })
          }).catch(err => console.error('Failed to send resolved notification:', err));
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
        // For web/contact form submissions, reply via email
        const replyChannel = ticket.channel === 'web' ? 'email' : ticket.channel;

        // Get the last inbound message for quoting
        const lastInboundMessage = ticket.messages
          ?.filter(m => m.direction === 'inbound')
          .slice(-1)[0];

        const replyResponse = await fetch('/api/helpdesk/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.documentId,
            channel: replyChannel,
            channelId: ticket.channelId,
            content: replyContent,
            customerEmail: ticket.customerEmail,
            subject: ticket.subject,
            agentFirstName: currentUser.firstName || currentUser.username,
            originalMessage: lastInboundMessage?.content,
            originalMessageDate: lastInboundMessage?.createdAt
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

  const blockSender = async () => {
    if (!ticket?.customerEmail) return;

    if (!confirm(`Block all future emails from ${ticket.customerEmail}? This ticket will be closed.`)) {
      return;
    }

    setBlocking(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Add to blocklist in Strapi
      const response = await fetch(`${API_URL}/api/email-blocklists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            email: ticket.customerEmail,
            reason: `Blocked from ticket #${ticket.id}: ${ticket.subject}`
          }
        })
      });

      if (response.ok) {
        // Close this ticket
        await updateTicket('status', 'closed');
        alert(`${ticket.customerEmail} has been blocked. Future emails from this address will be ignored.`);
      } else {
        const error = await response.json();
        if (error.error?.message?.includes('unique')) {
          alert('This email is already blocked.');
        } else {
          alert('Failed to block sender: ' + (error.error?.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to block sender:', error);
      alert('Failed to block sender');
    } finally {
      setBlocking(false);
    }
  };

  const [markingRead, setMarkingRead] = useState(false);
  const [hasUnreadEmails, setHasUnreadEmails] = useState(false);

  // Check if there are unread emails (new since last Mark Read)
  useEffect(() => {
    if (!ticket?.messages || !ticketId) return;

    const inboundMessages = ticket.messages.filter(m => m.direction === 'inbound' && m.messageId);
    if (inboundMessages.length === 0) {
      setHasUnreadEmails(false);
      return;
    }

    const lastMarkedRead = localStorage.getItem(`ticket-${ticketId}-lastMarkedRead`);
    if (!lastMarkedRead) {
      // Never marked read - show as unread
      setHasUnreadEmails(true);
      return;
    }

    const lastMarkedTime = new Date(lastMarkedRead).getTime();
    const latestInbound = Math.max(...inboundMessages.map(m => new Date(m.createdAt).getTime()));
    setHasUnreadEmails(latestInbound > lastMarkedTime);
  }, [ticket?.messages, ticketId]);

  const markEmailsAsRead = async () => {
    if (!ticket?.messages) return;

    const gmailMessageIds = ticket.messages
      .filter(m => m.direction === 'inbound' && m.messageId)
      .map(m => m.messageId);

    if (gmailMessageIds.length === 0) {
      alert('No emails to mark as read');
      return;
    }

    setMarkingRead(true);
    try {
      const response = await fetch('/api/helpdesk/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: gmailMessageIds })
      });

      if (response.ok) {
        const result = await response.json();
        const successCount = result.results?.filter((r: any) => r.success).length || 0;
        // Store timestamp of when we marked read
        localStorage.setItem(`ticket-${ticketId}-lastMarkedRead`, new Date().toISOString());
        setHasUnreadEmails(false);
        alert(`Marked ${successCount} email(s) as read in Gmail`);
      } else {
        alert('Failed to mark emails as read');
      }
    } catch (error) {
      console.error('Failed to mark emails as read:', error);
      alert('Failed to mark emails as read');
    } finally {
      setMarkingRead(false);
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
            <span>via {ticket.channel === 'web' ? 'contact form' : ticket.channel}</span>
            <span>-</span>
            <span>Created {formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        {/* Conversation */}
        <div className="rounded-xl border mb-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(168, 85, 247, 0.15)' }}>
            <h2 className="text-lg font-semibold text-white">Conversation</h2>
          </div>

          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((message, index) => {
                const { formatted } = formatMessageContent(message.content);
                const isLastMessage = index === ticket.messages!.length - 1;
                const needsResponse = isLastMessage && message.direction === 'inbound' && ticket.status !== 'resolved' && ticket.status !== 'closed';
                const daysSinceMessage = Math.floor((Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = needsResponse && daysSinceMessage >= 3;

                // Determine background color
                let bgClass = 'bg-gray-700 text-white';
                if (message.direction === 'outbound') {
                  bgClass = 'bg-purple-600 text-white';
                } else if (message.senderType === 'system') {
                  bgClass = 'bg-gray-600 text-gray-300 italic';
                } else if (isUrgent) {
                  bgClass = 'bg-red-600 text-white';
                } else if (needsResponse) {
                  bgClass = 'bg-purple-500 text-white';
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-4 ${bgClass}`}>
                      {needsResponse && (
                        <div className={`text-xs mb-2 px-2 py-1 rounded inline-block ${isUrgent ? 'bg-red-800' : 'bg-purple-700'}`}>
                          {isUrgent ? `Awaiting response (${daysSinceMessage} days)` : 'Needs response'}
                        </div>
                      )}
                      <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                        <span className="font-medium">{message.senderName}</span>
                        <span>•</span>
                        <span>{formatDate(message.createdAt)}</span>
                      </div>
                      <div
                        className="whitespace-pre-wrap text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: formatted
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br />')
                        }}
                      />
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/20 text-xs">
                          📎 {message.attachments.length} attachment(s)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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
              Reply will be sent via {ticket.channel === 'web' ? 'email' : ticket.channel}
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
          <div className="flex gap-2 mt-4">
            {ticket.messages?.some(m => m.direction === 'inbound' && m.messageId) && (
              <button
                onClick={markEmailsAsRead}
                disabled={markingRead}
                className={`flex-1 px-3 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm ${
                  hasUnreadEmails
                    ? 'bg-green-600 hover:bg-green-500 animate-pulse shadow-lg shadow-green-500/50'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                {markingRead ? 'Marking...' : hasUnreadEmails ? '● Mark Read' : 'Mark Read'}
              </button>
            )}
            {ticket.customerEmail && (
              <button
                onClick={blockSender}
                disabled={blocking}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {blocking ? 'Blocking...' : 'Block'}
              </button>
            )}
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
