
import {
  STAGE_BADGE,
} from "@/lib/referral/referralHelpers";

const STAGES = [
  {
    stage: "0",
    title: "Signed Up",
    desc: "Referral has created an account using your link.",
    color: STAGE_BADGE[0],
    reward: "No reward",
  },
  {
    stage: "1",
    title: "Website Verified",
    desc: "Referral verifies ownership of their website.",
    color: STAGE_BADGE[1],
    reward: "Task Credits",
  },
  {
    stage: "2",
    title: "First Backlink Accepted",
    desc: "Referral submits and gets their first backlink approved.",
    color: STAGE_BADGE[2],
    reward: "Task + Visibility Credits",
  },
  {
    stage: "3",
    title: "Paid Subscription",
    desc: "Referral upgrades to a paid plan.",
    color: STAGE_BADGE[3],
    reward: "Full Rewards",
  },
];
const HowRewardsUnlock = () => {
  return (
    <div className="bg-white border border-[#e9eaeb] rounded-xl p-6 space-y-5">
        <div>
          <p className="text-sm font-bold text-[#181d27]">
            How Referral Rewards Unlock
          </p>
          <p className="text-xs text-[#535862] mt-0.5">
            Credits are earned as referrals complete specific milestones
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((s) => (
            <div key={s.stage} className="space-y-2">
              <span
                className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.color}`}
              >
                Stage {s.stage}
              </span>
              <p className="text-sm font-bold text-[#181d27]">{s.title}</p>
              <p className="text-xs text-[#535862] leading-relaxed">{s.desc}</p>
              <p className="text-xs text-[#535862]">
                <span className="font-semibold">Reward:</span> {s.reward}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#9DA4AE] pt-2 border-t border-[#e9eaeb]">
          Credits are applied to the website wallet, not the user account.
        </p>
      </div>
  )
}

export default HowRewardsUnlock
