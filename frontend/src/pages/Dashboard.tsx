import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';

export function Dashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiService.getStats(),
  });

  if (isLoading) return <Loading />;
  if (error) return <Error message={error instanceof Error ? error.message : 'Failed to load stats'} onRetry={() => refetch()} />;
  if (!stats) return <div>No stats available</div>;

  const conversionRate = stats.conversionFunnel.started > 0
    ? ((stats.conversionFunnel.completed / stats.conversionFunnel.started) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Sessions</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalSessions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Conversion Rate</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{conversionRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Completed</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.conversionFunnel.completed}</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Started</span>
              <span className="text-sm text-gray-600">{stats.conversionFunnel.started}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Awaiting Payment</span>
              <span className="text-sm text-gray-600">{stats.conversionFunnel.awaitingPayment}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{
                  width: `${stats.conversionFunnel.started > 0 ? (stats.conversionFunnel.awaitingPayment / stats.conversionFunnel.started) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Paid</span>
              <span className="text-sm text-gray-600">{stats.conversionFunnel.paid}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${stats.conversionFunnel.started > 0 ? (stats.conversionFunnel.paid / stats.conversionFunnel.started) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Completed</span>
              <span className="text-sm text-gray-600">{stats.conversionFunnel.completed}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${stats.conversionFunnel.started > 0 ? (stats.conversionFunnel.completed / stats.conversionFunnel.started) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Plan</h2>
        <div className="space-y-3">
          {stats.revenueByPlan.map((item) => (
            <div key={item.plan} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.plan}</span>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{item.count} sales</span>
                <span className="text-sm font-semibold text-gray-900">${item.revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

