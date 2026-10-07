import { Info } from "lucide-react";

const LIMITS = [
  "No rewards on signup alone",
  "Full rewards unlock only after subscription",
  "Max 3 referrals per month",
  "Max 10 rewarded referrals lifetime",
  "Referral credits are non-transferable",
  "Referral credits cannot be converted to cash",
];

const LimitsAndCompliance = () => {
  return (
    <div>
       <div className="bg-white border border-[#e9eaeb] rounded-xl p-6 space-y-4">
        <div>
          <p className="text-sm font-bold text-[#181d27]">Limits & Rules</p>
          <p className="text-xs text-[#535862] mt-0.5">
            Review the referral program guidelines
          </p>
        </div>

        <ul className="space-y-2">
          {LIMITS.map((rule) => (
            <li
              key={rule}
              className="flex items-center gap-2 text-sm text-[#535862]"
            >
              <span className="text-[#9DA4AE] font-bold leading-none">·</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Compliance Notice */}
      <div className="flex items-start gap-3 border border-[#e9eaeb] rounded-xl p-5 bg-white">
        <Info className="w-4 h-4 text-[#4169E1] shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-[#181d27]">
            System & Compliance Notice
          </p>
          <p className="text-xs text-[#535862] mt-1 leading-relaxed">
            All referral actions are logged and auditable. Backlyst may throttle,
            revoke, or pause referrals to prevent abuse.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LimitsAndCompliance
