import { Shield, Star, Zap, Lock, Globe, CircleCheckBig, Flag } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Transparency",
    description: "Clear communication and open processes.",
  },
  {
    icon: Star,
    title: "Quality First",
    description: "Every publisher is vetted to ensure top-tier quality.",
  },
  {
    icon: Zap,
    title: "Speed",
    description: "We automate and streamline so you save time.",
  },
  {
    icon: Lock,
    title: "Trust",
    description: "Your success is our success. We've got your back.",
  },
];

const stats = [
  {
    icon: Lock,
    value: "5,000+",
    label: "Tasks Completed",
    bgColor: "bg-orange-100",
    iconColor: "text-orange-500",
  },
  {
    icon: Globe,
    value: "1,200+",
    label: "Verified Publishers",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-500",
  },
  {
    icon: CircleCheckBig,
    value: "98%",
    label: "Success Rate",
    bgColor: "bg-green-100",
    iconColor: "text-green-500",
  },
  {
    icon: Flag,
    value: "60+",
    label: "Countries Served",
    bgColor: "bg-purple-100",
    iconColor: "text-purple-500",
  },
];

const TopEmpowered = () => {
  return (
    <section className="py-20 px-6 bg-[#fdfdff]">
      <div className="max-w-330 mx-auto flex flex-col items-center gap-14">
        {/* Heading Group */}
        <div className="flex flex-col gap-4 items-center justify-center w-full">
          {/* Tagline */}
          <div className="inline-flex items-center justify-center bg-[#FFF1E9] border border-[#FEA369] rounded-[30px] px-4 py-2">
            <span className="text-xs font-medium font-inter text-[#FD751F] leading-4.5">
              OUR MISSION
            </span>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1 items-center text-center font-sora font-semibold text-[26px] md:text-[32px] leading-[1.35] tracking-[-0.5px]">
            <h2 className="text-gray-900">
              To empower brands with high-quality backlinks
            </h2>
            <h2 className="text-primary">
              through technology, transparency, and trust.
            </h2>
          </div>
        </div>

        {/* Value Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 w-full max-w-217 divide-x-0 md:divide-x divide-gray-200">
          {values.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center gap-3 px-6 py-2"
            >
              <div className="flex items-center justify-center w-15 h-15 rounded-xl bg-[#EEF0FF]">
                <Icon className="w-10 h-10 text-primary" />
              </div>
              <span className="font-semibold font-inter text-sm text-gray-900 leading-5">
                {title}
              </span>
              <p className="text-xs font-inter text-gray-400 leading-4.5 max-w-40">
                {description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 w-full max-w-217 rounded-2xl border border-gray-200 divide-x-0 md:divide-x divide-y md:divide-y-0 divide-gray-200 overflow-hidden">
  {stats.map(({ icon: Icon, value, label, bgColor, iconColor }) => (
    <div key={label} className="flex items-center gap-3 px-6 py-5">
      <div
        className={`flex items-center justify-center w-15 h-15 rounded-sm shrink-0 ${bgColor}`}
      >
        <Icon className={`w-10 h-10 ${iconColor}`} />
      </div>

      <div className="flex flex-col">
        <span className="font-sora font-bold text-lg text-gray-900 leading-6">
          {value}
        </span>
        <span className="text-xs font-inter text-gray-400 leading-4.5">
          {label}
        </span>
      </div>
    </div>
  ))}
</div>
      </div>
    </section>
  );
};

export default TopEmpowered;