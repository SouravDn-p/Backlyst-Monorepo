import { CheckCheck, X } from "lucide-react";
import Image from "next/image";

const comparisonItems = [
  {
    oldWay: "Endless outreach to dead domains",
    newWay: "Access a marketplace of verified active publishers",
  },
  {
    oldWay: "Low response rates from busy editors",
    newWay: "Guaranteed task acceptance with credits",
  },
  {
    oldWay: "Impossible to verify authority metrics",
    newWay: "Real-time DR/DA monitoring for every site",
  },
  {
    oldWay: "No visibility into work progress",
    newWay: "Full workflow dashboard from draft to live",
  },
];

const EfficiencySection = () => {
  return (
    <section className="py-10 md:py-25 px-6 bg-white">
      <div className="max-w-330 mx-auto">
        <div className="flex flex-col gap-20 items-start w-full">
          <h2 className="font-sora font-semibold text-3xl md:text-5xl leading-10 md:leading-15 tracking-[-0.96px] text-gray-900 w-146 max-w-full">
            Why build links manually when you can{" "}
            <span className="text-primary">Backlyst?</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            <div className="lg:col-span-7 bg-[#535862] rounded-[20px] p-8 md:p-12.5 shadow-2xl flex flex-col gap-10 overflow-hidden relative">
              <div className="absolute -top-20 left-1/2 md:left-[60%] w-100 h-100 bg-white/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-6">
                <div>
                  <span className="block font-sora font-semibold text-md md:text-5xl text-white leading-snug mb-4">
                    Efficiency Comparison
                  </span>
                  <h3 className="font-sora font-semibold text-xl md:text-4xl md:text-[48px] leading-tight tracking-tight text-white">
                    Why waste time and money when you can{" "}
                    <span className="text-[#fd751f]">Backlyst?</span>
                  </h3>
                </div>

                <div className="flex flex-col gap-8 w-full mt-4">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-sm md:text-base text-white font-medium">
                        <span>MANUAL OUTREACH</span>
                        <span className="opacity-80">24 Hours/Link</span>
                      </div>
                      <div className="w-full h-2 bg-[#e9eaeb] rounded-full overflow-hidden">
                        <div className="w-[75%] h-full bg-[#fd751f] rounded-full" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-sm md:text-base text-white font-medium">
                        <span>BACKLYST WORKFLOW</span>
                        <span>15 Mins/Link</span>
                      </div>
                      <div className="w-full h-2 bg-[#e9eaeb] rounded-full overflow-hidden">
                        <div className="w-[15%] h-full bg-[#fd751f] rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#717680] rounded-[10px] p-6 md:p-8 flex items-center w-full">
                    <div className="flex flex-col gap-6 items-start w-full">
                      <p className="text-[14px] font-medium font-inter text-white leading-5">
                        &quot;We&apos;ve reduced our link building operational
                        costs by 74% since migrating our entire outreach team to
                        the Backlyst marketplace&quot;
                      </p>
                      <div className="flex items-center gap-4 w-full">
                        <Image
                          width={400}
                          height={400}
                          src="/avatar/marcus.png"
                          alt="Marcus Throne"
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-base font-bold font-sora text-white">
                            Marcus Throne
                          </span>
                          <span className="text-xs font-semibold font-inter text-gray-200 uppercase tracking-wider">
                            CEO, DIGITAL AUTHORITY AGENCY
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6 h-full justify-between">
              <div className="grid grid-cols-1 gap-4">
                {comparisonItems.map((item, index) => (
                  <div
                    key={`compare-${index}`}
                    className="grid md:grid-cols-2 gap-4"
                  >
                    <div className="bg-white border border-[#fed4ba] rounded-[10px] p-4 flex flex-col gap-2 shadow-sm h-full">
                      <div className="flex items-center gap-2 text-[#fd751f]">
                        <span className="text-auto leading-none font-extrabold rotate-90 border-2 rounded-full p-1 border-[#FD751F]!">
                          <X size={16} className="text-[#FD751F]" />
                        </span>
                        <span className="text-[16px] font-semibold font-inter uppercase tracking-wide">
                          THE OLD WAY
                        </span>
                      </div>
                      <p className="text-[16px] font-semibold text-[#535862] leading-snug">
                        {item.oldWay}
                      </p>
                    </div>

                    <div className="bg-[#fff1e9] border border-[#fea369] rounded-[10px] p-4 flex flex-col gap-2 shadow-sm h-full">
                      <div className="flex items-center gap-2 text-[#fd751f]">
                        <span className="text-auto leading-none font-extrabold  border-2 rounded-full p-1 border-green-500!">
                          <CheckCheck size={16} className="text-green-600" />
                        </span>
                        <span className="text-[16px] font-semibold font-inter uppercase tracking-wide">
                          BACKLYST
                        </span>
                      </div>
                      <p className="text-[16px] font-semibold text-[#181d27] leading-snug">
                        {item.newWay}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EfficiencySection;
