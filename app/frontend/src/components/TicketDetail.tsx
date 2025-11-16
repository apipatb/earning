import { useState } from 'react';
import { X, Send, Clock, User, AlertCircle } from 'lucide-react';
import { Ticket } from '../pages/SupportTickets';
import SLAIndicator from './SLAIndicator';
import { notify } from '../store/notification.store';

interface TicketDetailProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: (ticketId: string, updates: any) => Promise<void>;
}

export default function TicketDetail({ ticket, onClose, onUpdate }: TicketDetailProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState(ticket.messages || []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: comment, isInternal: false }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();
      setMessages([...messages, data.data]);
      setComment('');
      notify.success('Success', 'Comment added');
    } catch (error) {
      notify.error('Error', 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await onUpdate(ticket.id, { status: newStatus });
  };

  const handlePriorityChange = async (newPriority: string) => {
    await onUpdate(ticket.id, { priority: newPriority });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{ticket.subject}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {ticket.user?.name || ticket.user?.email}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(ticket.createdAt)}
              </div>
              <span className="text-xs text-gray-400">#{ticket.id.slice(0, 8)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SLA Indicator & Badges */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <select
                value={ticket.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              {ticket.category && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  {ticket.category}
                </span>
              )}
            </div>
            <SLAIndicator
              createdAt={ticket.createdAt}
              firstResponseAt={ticket.firstResponseAt}
              resolvedAt={ticket.resolvedAt}
              slaResponseTime={ticket.slaResponseTime}
              slaResolveTime={ticket.slaResolveTime}
              slaBreach={ticket.slaBreach}
            />
          </div>
          {ticket.slaBreach && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300 font-medium">SLA Breach Detected</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {ticket.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
          )}

          {/* Messages/Comments */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Comments</h3>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No comments yet</div>
              ) : (
                messages.map((message: any) => (
                  <div key={message.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.user?.name || 'User'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Comment Form */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <form onSubmit={handleAddComment} className="flex gap-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
