import React from "react";

const steps = [
  {
    num: "01",
    stepNum: 1,
    title: "Create a task",
    desc: "Define your requirements, anchor text, and target URL in under 60 seconds.",
  },
  {
    num: "02",
    stepNum: 2,
    title: "Select a provider",
    desc: "Choose from pre-vetted domain offers or let publishers apply to your task.",
  },
  {
    num: "03",
    stepNum: 3,
    title: "Verify & Go Live",
    desc: "Review the delivery, approve the content, and watch your authority grow.",
  },
];

const ProcessSection = () => {
  return (
    <section
      className="py-25 px-6 bg-[#535862]! relative overflow-hidden"
      id="process"
    >
      {/* Background Grid (Decorative) */}
      <div className="absolute inset-0 opacity-[0.27] pointer-events-none">
        <div className="absolute h-18 left-54 top-27.5 w-full flex gap-54 ">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-70 h-full bg-[#181D27]/30! border border-gray-50/10!"
            />
          ))}
        </div>
        <div className="absolute h-18 left-0 top-55 w-full flex gap-54">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-70 h-full bg-[#181D27]/30! border border-gray-50/10!"
            />
          ))}
        </div>
        <div className="absolute h-18 left-54 top-87.5 w-full flex gap-54 ">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-70 h-full bg-[#181D27]/30! border border-gray-50/10!"
            />
          ))}
        </div>
      </div>

      <div className="max-w-289.25 mx-auto flex flex-col gap-15 items-center relative z-10">
        {/* Heading */}
        <h2 className="font-sora font-semibold text-[48px] leading-15 tracking-[-0.96px] text-white text-center w-full">
          The 3-Step Process
        </h2>

        {/* Steps */}
        <div className="flex gap-24.25 items-center w-full justify-center flex-wrap">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex flex-col gap-3 items-center w-80.25"
            >
              {/* Number Stack */}
              <div className="h-22.5 w-25 relative">
                {/* Ghost Number */}
                <p className="absolute left-1/2 -translate-x-1/2 top-0 font-sora font-bold text-[72px] leading-22.5 tracking-[-1.44px] text-gray-500 text-center w-[100px]">
                  {step.num}
                </p>
                {/* Green Circle */}
                <div className="absolute left-[26px] top-[42px] w-12 h-12 rounded-full bg-[#32D583] flex items-center justify-center">
                  <span className="font-inter font-semibold text-xl leading-[30px] text-white">
                    {step.stepNum}
                  </span>
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col gap-2 items-center text-center text-white w-full">
                <h3 className="font-inter font-semibold text-xl leading-[30px]">
                  {step.title}
                </h3>
                <p className="font-inter font-normal text-xs leading-[18px]">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
