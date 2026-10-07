import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const BlogHero = () => {
  return (
    <section className="pt-24 md:pt-32 pb-16 px-6 bg-[#fdfdff]">
      <div className="max-w-320 mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
        {/* Left: Text Content */}
        <div className="flex flex-col gap-5 items-start w-full lg:w-1/2 max-w-140">
          {/* Tagline */}
          <div className="inline-flex items-center justify-center bg-[#FFF1E9] border border-[#FEA369] rounded-[30px] px-4 py-2">
            <span className="text-xs font-medium font-inter text-[#FD751F] leading-4.5">
              BACKLYST BLOG
            </span>
          </div>

          {/* Title */}
          <div className="flex flex-col font-sora font-semibold text-[39px] md:text-[43px] leading-[1.1] tracking-[-1px]">
            <h1 className="text-gray-900">
              SEO Insights, <span className="text-primary">Link Building</span>
            </h1>
            <h1 className="text-gray-900">Tips &amp; Industry News</h1>
          </div>

          {/* Subtitle */}
          <p className="text-sm md:text-base font-normal font-inter text-gray-500 leading-6 max-w-110">
            Learn proven SEO strategies, guest posting techniques, niche edit
            best practices, and marketplace updates from the Backlyst team.
          </p>

          {/* CTA */}
          <Link
            href="/blog#articles"
            className="flex gap-2 items-center justify-center bg-secondary hover:bg-brand-orange-600 text-white px-6 py-3 rounded-xl font-semibold font-inter text-sm leading-5 shadow-[0_3px_7px_0_rgba(0,0,0,0.1)] transition-all mt-1"
          >
            <span>EXPLORE ARTICLES</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Right: Laptop Preview */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end mt-12">
          <Image
            src="/landing/blog.png"
            alt="Backlyst dashboard on laptop"
            className="w-full max-w-115 h-auto object-contain"
            width={800}
            height={800}
            quality={100}
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default BlogHero;