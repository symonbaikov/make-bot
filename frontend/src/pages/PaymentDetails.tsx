import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useState } from 'react';

export function PaymentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session', id],
    queryFn: () => apiService.getSession(id!),
    enabled: !!id,
  });

  const resendEmailMutation = useMutation({
    mutationFn: () => apiService.resendEmail(id!),
    onSuccess: () => {
      toast.success('Email resent successfully');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resend email');
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: () => apiService.grantAccess(id!),
    onSuccess: () => {
      toast.success('Access granted successfully');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to grant access');
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: (email: string) => apiService.updateEmail(id!, email),
    onSuccess: () => {
      toast.success('Email updated successfully');
      setIsEditingEmail(false);
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email');
    },
  });

  const handleUpdateEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    updateEmailMutation.mutate(newEmail);
  };

  if (isLoading) return <Loading />;
  if (error) return <Error message={error instanceof Error ? error.message : 'Failed to load session'} onRetry={() => refetch()} />;
  if (!session) return <div>Session not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/payments')}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to Payments
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500">Session ID</label>
            <p className="mt-1 text-sm text-gray-900">{session.sessionId}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Transaction ID</label>
            <p className="mt-1 text-sm text-gray-900">{session.txnId || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Plan</label>
            <p className="mt-1 text-sm text-gray-900">{session.plan}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Amount</label>
            <p className="mt-1 text-sm text-gray-900">
              ${session.amount} {session.currency}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Status</label>
            <p className="mt-1 text-sm text-gray-900">{session.status}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Final Email</label>
            <p className="mt-1 text-sm text-gray-900">{session.finalEmail || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email (User)</label>
            {isEditingEmail ? (
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={session.emailUser || 'Enter email'}
                />
                <button
                  onClick={handleUpdateEmail}
                  disabled={updateEmailMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingEmail(false);
                    setNewEmail('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center space-x-2">
                <p className="text-sm text-gray-900">{session.emailUser || '-'}</p>
                <button
                  onClick={() => {
                    setIsEditingEmail(true);
                    setNewEmail(session.emailUser || '');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email (PayPal)</label>
            <p className="mt-1 text-sm text-gray-900">{session.emailPaypal || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Payment Date</label>
            <p className="mt-1 text-sm text-gray-900">
              {session.paymentDate ? format(new Date(session.paymentDate), 'MMM dd, yyyy HH:mm') : '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">End Date</label>
            <p className="mt-1 text-sm text-gray-900">
              {session.endDate ? format(new Date(session.endDate), 'MMM dd, yyyy') : '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Created At</label>
            <p className="mt-1 text-sm text-gray-900">
              {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => resendEmailMutation.mutate()}
              disabled={resendEmailMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {resendEmailMutation.isPending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to grant access?')) {
                  grantAccessMutation.mutate();
                }
              }}
              disabled={grantAccessMutation.isPending || session.status === 'COMPLETED'}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {grantAccessMutation.isPending ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
        </div>

        {/* Meta Data */}
        {session.meta && Object.keys(session.meta).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(session.meta, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

