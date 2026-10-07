"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import mobileImage from "@/public/landing/mobile.jpg";
import penImage from "@/public/landing/pen.jpg";
import chartImage from "@/public/landing/chart.jpg";

const InstructionPage = () => {
  return (
    <div className="bg-[#ffffff] min-h-screen font-inter flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-24 md:pt-36  md:pb-24 px-4 lg:px-0 mb-12">
        <h1 className="text-[36px] lg:text-[48px] font-semibold font-sora text-[#181d27] text-center mb-6 md:mb-12 tracking-tight leading-tight">
          How It Works
        </h1>

        <div className="w-full max-w-[1200px] space-y-8 lg:space-y-12">
          {/* Card 1: Finding Your Audience */}
          <div className="bg-white rounded-[20px] shadow-[0px_4px_20px_0px_#dedee3] overflow-hidden flex flex-col lg:flex-row p-6 lg:p-5 gap-8 lg:gap-12 hover:shadow-xl transition-shadow duration-300">
            <div className="w-full lg:w-[400px] h-[240px] lg:h-auto bg-[#f5f5f5] rounded-xl relative overflow-hidden group cursor-pointer">
              <Image
                src={mobileImage}
                alt="Finding Your Audience"
                className="w-full h-full object-cover opacity-100"
              />
            </div>

            <div className="flex-1 flex flex-col justify-center py-2">
              <h2 className="text-[28px] lg:text-[36px] font-semibold font-sora text-[#181d27] mb-4 leading-tight">
                Finding Your Audience
              </h2>
              <p className="text-[16px] lg:text-[18px] text-[#414651] leading-relaxed mb-6 font-normal">
                Learn how to use our marketplace filters to find the perfect
                websites that match your business niche.
              </p>
              <button className="flex items-center gap-2 text-primary font-normal text-[14px] hover:underline group w-fit">
                Click to watch full session
                <ChevronRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>

          {/* Card 2: Creating a Great Pitch */}
          <div className="bg-white rounded-[20px] shadow-[0px_4px_20px_0px_#dedee3] overflow-hidden flex flex-col lg:flex-row p-6 lg:p-5 gap-8 lg:gap-12 hover:shadow-xl transition-shadow duration-300">
            <div className="w-full lg:w-[400px] h-[240px] lg:h-auto bg-[#f5f5f5] rounded-xl relative overflow-hidden group cursor-pointer">
              <Image
                src={penImage}
                alt="Creating a Great Pitch"
                className="w-full h-full object-cover opacity-100"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center py-2">
              <h2 className="text-[28px] lg:text-[36px] font-semibold font-sora text-[#181d27] mb-4 leading-tight">
                Creating a Great Pitch
              </h2>
              <p className="text-[16px] lg:text-[18px] text-[#414651] leading-relaxed mb-6 font-normal">
                Simple templates to reach out to editors and get your content
                published effectively.
              </p>
              <button className="flex items-center gap-2 text-primary font-normal text-[14px] hover:underline group w-fit">
                Click to watch full session
                <ChevronRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>

          {/* Card 3: Measuring Your Success */}
          <div className="bg-white rounded-[20px] shadow-[0px_4px_20px_0px_#dedee3] overflow-hidden flex flex-col lg:flex-row p-6 lg:p-5 gap-8 lg:gap-12 hover:shadow-xl transition-shadow duration-300">
            <div className="w-full lg:w-[400px] h-[240px] lg:h-auto bg-[#f5f5f5] rounded-xl relative overflow-hidden group cursor-pointer">
              <Image
                src={chartImage}
                alt="Measuring Your Success"
                className="w-full h-full object-cover opacity-100"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center py-2">
              <h2 className="text-[28px] lg:text-[36px] font-semibold font-sora text-[#181d27] mb-4 leading-tight">
                Measuring Your Success
              </h2>
              <p className="text-[16px] lg:text-[18px] text-[#414651] leading-relaxed mb-6 font-normal">
                Understand the metrics that matter and how to track your new
                traffic sources.
              </p>
              <button className="flex items-center gap-2 text-primary font-normal text-[14px] hover:underline group w-fit">
                Click to watch full session
                <ChevronRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstructionPage;
