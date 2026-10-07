export default function CreditCard({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "orange" | "purple" | "pink" | "dark";
  bold?: boolean;
}) {
  const COLORS: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: "bg-[#EFF8FF]",
      text: "text-[#175CD3]",
      border: "border-[#B2DDFF]",
    },
    green: {
      bg: "bg-[#ECFDF3]",
      text: "text-[#027A48]",
      border: "border-[#6CE9A6]",
    },
    orange: {
      bg: "bg-[#FFF6ED]",
      text: "text-[#B54708]",
      border: "border-[#FEE6C0]",
    },
    purple: {
      bg: "bg-[#F9F5FF]",
      text: "text-[#6938EF]",
      border: "border-[#D9D2FE]",
    },
    pink: {
      bg: "bg-[#FFF1F3]",
      text: "text-[#C01048]",
      border: "border-[#FDA29B]",
    },
    dark: {
      bg: "bg-[#f2f4f7]",
      text: "text-[#181d27]",
      border: "border-[#e9eaeb]",
    },
  };
  const c = COLORS[color] ?? COLORS.dark;

  return (
    <div
      className={`${c.bg} ${c.border} border rounded-xl px-3 py-3 text-center`}
    >
      <p
        className={`text-lg ${bold ? "font-extrabold" : "font-bold"} ${c.text}`}
      >
        {value}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#535862] mt-0.5">
        {label}
      </p>
    </div>
  );
}