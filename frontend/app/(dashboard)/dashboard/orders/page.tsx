import RequesterTasksTable from "@/components/dashboard/requester/orders/RequesterTasksTable";
import RequesterDirectTasksTable from "@/components/dashboard/requester/orders/RequesterDirectTasksTable";


const RequesterOrderPage = () => {
  return (
    <div className="flex flex-col gap-6 font-inter w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <div className="flex flex-col gap-4 md:gap-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[30px] font-semibold font-sora text-[#181d27] leading-none">
              My Orders
            </h1>
            <p className="text-sm font-medium text-[#535862] mt-1">
              Track created tasks, review provider progress, and open each task
              for detailed oversight.
            </p>
          </div>
        </div>
      </div>

      <RequesterTasksTable
        title="Recent Activity"
        role="REQUESTER"
        limit={10}
        showSearch
      />

      <RequesterDirectTasksTable />
    </div>
  );
};

export default RequesterOrderPage;
