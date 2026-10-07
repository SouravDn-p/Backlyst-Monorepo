import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import Image from "next/image";

const AboutHero = () => {
  return (
    <section className="pt-24 md:pt-32 pb-16 px-6 bg-[#fdfdff]">
      <div className="max-w-320 mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
        {/* Left: Text Content */}
        <div className="flex flex-col gap-6 items-start w-full lg:w-1/2 max-w-135">
          {/* Tagline */}
          <div className="inline-flex items-center justify-center bg-[#FFF1E9] border border-[#FEA369] rounded-[30px] px-4 py-2">
            <span className="text-xs font-medium font-inter text-[#FD751F] leading-4.5">
              ABOUT BACKLYST
            </span>
          </div>

          {/* Title */}
          <div className="flex flex-col font-sora font-semibold text-[39px] md:text-[45px] leading-[1.2] tracking-[-1px]">
            <h1 className="text-gray-900">We make link building</h1>
            <h1 className="text-primary">simple, transparent &amp;</h1>
            <h1 className="text-primary">scalable.</h1>
          </div>

          {/* Subtitle */}
          <p className="text-sm md:text-base font-normal font-inter text-gray-500 leading-6 max-w-110">
            Backlyst is the world&apos;s first automated backlink procurement
            platform. We connect brands with verified publishers, streamline
            outreach, manage tasks, and grow organic authority — all in one
            place.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 pt-2">
            <Link
              href="/auth/register"
              className="flex gap-2 items-center justify-center bg-secondary hover:bg-brand-orange-600 text-white px-6 py-3 rounded-xl font-semibold font-inter text-sm leading-5 shadow-[0_3px_7px_0_rgba(0,0,0,0.1)] transition-all"
            >
              <span>GET STARTED FREE</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="flex gap-2 items-center justify-center bg-white border border-[#FEA369]! text-secondary px-6 py-3 rounded-xl font-semibold font-inter text-sm leading-5 transition-all hover:bg-brand-orange-50"
            >
              <PlayCircle className="w-4 h-4" />
              <span>WATCH DEMO</span>
            </Link>
          </div>
        </div>

        {/* Right: Dashboard Preview */}
        <div className="w-3/4 mx-auto ml-12 md:ml-0 lg:w-1/2 flex justify-center lg:justify-end md:p-6 p-0 mt-6 md:mt-0">
          <Image
            src="/landing/dashboard-preview.png"
            alt="Backlyst dashboard preview"
            className="w-full h-auto relative outline-none border-0 rounded-2xl"
            width={800}
            height={800}
          />
        </div>
      </div>
    </section>
  );
};

export default AboutHero;