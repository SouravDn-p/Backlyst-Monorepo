import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

const Hero = () => {
  return (
    <section className="pt-28 md:pt-45 pb-25 px-6 bg-[#fdfdff]">
      <div className="max-w-330 mx-auto flex flex-col items-center">
        {/* Content Wrapper */}
        <div className="flex flex-col gap-15 items-center w-full">
          {/* Text Content */}
          <div className="flex flex-col gap-15 items-center w-231.5 max-w-full">
            {/* Heading Group */}
            <div className="flex flex-col gap-5 items-center justify-center w-full">
              <div className="flex flex-col gap-5 items-center w-186.5 max-w-full">
                {/* Tagline */}
                <div className="inline-flex items-center justify-center bg-[#FFF1E9] border border-[#FEA369] rounded-[30px] px-4 py-2">
                  <span className="text-xs font-medium font-inter text-[#FD751F] leading-4.5">
                    NEXT-GEN SEO MARKETPLACE
                  </span>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-3 items-center text-center font-sora font-semibold text-[60px] leading-[72px] tracking-[-1.2px] w-full">
                  <h1 className="text-gray-900 text-5xl md:text-6xl ">
                    Scale Your Backlinks.
                  </h1>
                  <h1 className="text-primary text-2xl md:text-6xl">
                    Without The Hassle.
                  </h1>
                </div>
              </div>

              {/* Subtitle */}
              <p className="md:text-xl font-normal font-inter text-gray-900 leading-[30px] text-center max-w-[926px]">
                Connect with verified publishers, streamline outreach, manage
                tasks, and grow organic authority with the world&apos;s first
                automated back link procurement platform.
              </p>
            </div>

            {/* CTAs */}
            <div className="grid md:grid-cols-2 gap-5 items-center flex-wrap">
              <Link
                href="/auth/register"
                className="flex gap-2.5 items-center justify-center bg-secondary hover:bg-brand-orange-600 text-white px-7.5 py-3.5 rounded-2xl font-semibold font-inter text-base leading-6 shadow-[0_3px_7px_0_rgba(0,0,0,0.1)] transition-all"
              >
                <span>GET STARTED FREE</span>
                <ArrowRight className="w-6 h-6" />
              </Link>
              <Link
                href="/how-it-works"
                className="flex gap-2.5  items-center justify-center bg-white border border-[#FEA369]! text-secondary px-7.5 py-3.5 rounded-2xl font-semibold font-inter text-base leading-6 transition-all hover:bg-brand-orange-50"
              >
                <PlayCircle className="w-6 h-6" />
                <span>WATCH DEMO</span>
              </Link>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="w-218.5 max-w-full h-auto overflow-hidden rounded-[20px] shadow-[0_-4px_30px_0_rgba(0,0,0,0.06)] relative">
            <div className="absolute inset-0 bg-white/20 rounded-[20px]" />
            <div className="absolute left-2 top-1.75 flex gap-1 items-center z-10">
              <div className="w-3.5 h-3.5 rounded-full bg-[#fecaca]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#fde68a]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#bbf7d0]" />
            </div>
            <video
              className="w-full h-auto relative outline-none border-0 focus:outline-none focus:ring-0"
              autoPlay
              loop
              playsInline
              controls
            >
              <source src="/video/banner.mp4" type="video/mp4" />
            </video>
            {/* Floating Card */}
            <div className="hidden md:absolute left-6 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-lg p-5 flex gap-2.5 items-start">
              <div className="flex items-center -space-x-1.5 grayscale-0">
                <div className="w-6 h-6 rounded-full bg-[#fca5a5] border-2 border-white z-0" />
                <div className="w-6 h-6 rounded-full bg-[#fcd34d] border-2 border-white z-10" />
                <div className="w-6 h-6 rounded-full bg-[#86efac] border-2 border-white z-20" />
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1 w-37">
                  <span className="text-sm font-semibold font-inter text-gray-400 leading-5">
                    NEW PLACEMENT
                  </span>
                  <span className="text-base font-semibold font-inter text-[#0f0f0f] leading-6">
                    startuply.io
                  </span>
                </div>
                <div className="w-42.5 h-1.5 bg-gray-200 rounded-[20px] overflow-hidden">
                  <div className="w-34.75 h-full bg-brand-green-600 rounded-[20px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          {/* <div className="w-full h-px bg-gray-200" /> */}
        </div>

        {/* Trust Section */}
        <div className="flex flex-col gap-[60px] items-center p-5 w-[1035px] max-w-full mt-5">
          <p className="text-base font-semibold font-inter text-gray-600 leading-6 text-center">
            TRUSTED BY 400+ SEO AGENCIES & DIGITAL BRANDS
          </p>
          <div className="w-full overflow-hidden relative">
            <div className="flex w-max animate-scroll hover:paused">
              <div className="flex items-center gap-[115px] font-sora font-bold text-[30px] leading-[38px] text-gray-400 whitespace-nowrap px-[57.5px]">
                {["NOTION", "CLICKUP", "WEBFLOW", "AHREFS", "SEMRUSH"].map(
                  (logo, i) => (
                    <span key={`${logo}-${i}`}>{logo}</span>
                  ),
                )}
              </div>
              <div className="flex items-center gap-[115px] font-sora font-bold text-[30px] leading-[38px] text-gray-400 whitespace-nowrap px-[57.5px]">
                {["NOTION", "CLICKUP", "WEBFLOW", "AHREFS", "SEMRUSH"].map(
                  (logo, i) => (
                    <span key={`${logo}-duplicate-${i}`}>{logo}</span>
                  ),
                )}
              </div>
            </div>
            {/* Fade edges */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#fdfdff] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#fdfdff] to-transparent z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
