import { useState } from 'react';
import { X, Mail, UserCog } from 'lucide-react';

interface InvitationFormProps {
  onSubmit: (email: string, role: 'OWNER' | 'MANAGER' | 'MEMBER') => void;
  onClose: () => void;
}

export default function InvitationForm({ onSubmit, onClose }: InvitationFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'MEMBER'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      alert('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email, role);
      setEmail('');
      setRole('MEMBER');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="member@example.com"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              An invitation will be sent to this email address
            </p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'OWNER' | 'MANAGER' | 'MEMBER')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MEMBER">Member</option>
              <option value="MANAGER">Manager</option>
            </select>
            <div className="mt-2 space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <UserCog className="w-4 h-4 mt-0.5 text-purple-600" />
                <div>
                  <span className="font-medium">Manager:</span> Can invite members and manage team
                  settings
                </div>
              </div>
              <div className="flex items-start gap-2">
                <UserCog className="w-4 h-4 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-medium">Member:</span> Can view and collaborate with the team
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
