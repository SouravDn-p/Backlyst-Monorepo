import Pagination from "@/components/ui/Pagination";
import OrderCard, { OrderItem } from "./OrderCard";

type Props = {
  title: string;
  role: string;
  orders: OrderItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function RecentOrders({
  title,
  role,
  orders,
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <section className="bg-white border border-[#e9eaeb] rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-8 py-6">
        <div>
          <h2 className="text-2xl font-semibold font-sora text-[#181d27]">
            {title}
          </h2>
          <p className="text-sm font-medium text-[#535862] mt-1">{role}</p>
        </div>
      </div>

      {/* Scroll Wrapper */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-225">
          <div
            className="grid border-y border-[#e9eaeb] text-sm font-medium text-[#181d27]"
            style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1.5fr 1fr" }}
          >
            {["Sub Name", "Status", "Applicants", "Provider", "Actions"].map(
              (h) => (
                <div key={h} className="px-8 py-4 text-center first:text-left">
                  {h}
                </div>
              ),
            )}
          </div>

          <div className="divide-y divide-[#e9eaeb]">
            {orders.length > 0 ? (
              orders.map((order) => <OrderCard key={order.taskId} order={order} />)
            ) : (
              <div className="px-8 py-16 text-center text-sm text-[#667085]">
                No tasks found for the current filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="px-6 md:px-8 py-6 border-t border-[#e9eaeb] ">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </section>
  );
}
