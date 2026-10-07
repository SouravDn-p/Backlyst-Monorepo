"use client";

import { useGetMySubscriptionHistoryQuery } from "@/redux/features/api/subscription/subscriptionApi";

export const SubscriptionHistory = () => {
  const { data, isLoading } = useGetMySubscriptionHistoryQuery({ page: 1, limit: 10, status: 'ACTIVE' });

  if (isLoading) return <div className="w-full p-6 bg-white rounded-2xl shadow-sm border mt-12 animate-pulse h-64"></div>;
  if (!data?.data?.data || data.data.data.length === 0) return null;

  return (
    <div className="w-full bg-white p-6 lg:p-8 rounded-2xl shadow-sm border mt-12">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Subscription History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
              <th className="pb-4">Plan Name</th>
              <th className="pb-4">Status</th>
              <th className="pb-4">Start Date</th>
              <th className="pb-4">End Date</th>
              <th className="pb-4">Price</th>
            </tr>
          </thead>
          <tbody>
            {data.data.data.map((item: any) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-4 font-medium text-gray-900">{item.plan?.name}</td>
                <td className="py-4">
                   <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                     {item.status}
                   </span>
                </td>
                <td className="py-4 text-gray-600">{new Date(item.startDate).toLocaleDateString()}</td>
                <td className="py-4 text-gray-600">{new Date(item.endDate).toLocaleDateString()}</td>
                <td className="py-4 font-semibold text-gray-900">${item.plan?.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
