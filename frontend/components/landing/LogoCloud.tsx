import React from "react";

const LogoCloud = () => {
  const logos = ["Catalog", "Circoooles", "Quotient", "Sisyphus", "Hourglass"];

  return (
    <section className="py-20 bg-white border-y border-gray-50">
      <div className="max-w-[1440px] mx-auto px-8 text-center space-y-12">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
          EMPOWERING DIGITAL GIANTS
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale group-hover:grayscale-0 transition-all">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-2xl md:text-3xl font-black font-sora text-gray-400 hover:text-gray-900 cursor-default transition-colors select-none"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoCloud;
