export function DeliveryDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-[#535862] mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-500">{value}</p>
    </div>
  );
}
