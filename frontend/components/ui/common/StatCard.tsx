interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  width?: string;
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  width = " lg:w-95",
}: StatCardProps) => (
  <div
    className={`bg-white border border-[#e9eaeb] rounded-xl p-5 flex items-center gap-5 `}
  >
    <div className="w-13.5 h-13.5 bg-[#f5f5f5] rounded-full flex items-center justify-center shrink-0">
      <Icon className="w-6 h-6 text-[#535862]" />
    </div>
    <div className="flex flex-col gap-1.5 flex-1">
      <span className="text-sm font-semibold text-[#535862] uppercase leading-5">
        {label}
      </span>
      <span className="text-2xl font-semibold font-sora text-[#181d27] leading-8">
        {value}
      </span>
      {subtext && <span className="text-sm font-normal text-[#717680] leading-5">
            {subtext}
       </span>}
    </div>
  </div>
);
