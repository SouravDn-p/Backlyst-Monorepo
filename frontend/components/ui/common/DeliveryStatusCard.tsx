export default function DeliveryStatusCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass: string;
}) {
  return (
    <div className="border border-[#e9eaeb] rounded-xl p-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#535862] mb-2">
        {label}
      </p>
      <div
        className={`flex items-center gap-1.5 text-sm text-primary font-bold `}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}
