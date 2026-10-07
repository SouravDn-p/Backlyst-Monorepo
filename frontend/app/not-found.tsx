import { Button } from "@/components/ui/Button";
import Navbar from "@/components/landing/Navbar";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import bannerImage from "@/public/hero-dashboard.jpg";
import Image from "next/image";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center max-w-7xl mx-auto">
        {/* Left content */}
        <div className="px-6 md:px-12 lg:px-20 py-8 space-y-4 text-center lg:text-left">
          <p className="text-xl font-semibold text-secondary tracking-wide">
            404 error
          </p>

          <h1 className="text-5xl md:text-6xl font-bold font-sora text-gray-900 leading-tight">
            Page not found 
          </h1>

          <div className="space-y-4 max-w-xl mx-auto lg:mx-0">
            <p className="text-lg md:text-xl text-gray-600 font-inter leading-relaxed">
              Sorry, the page you are looking for doesn&apos;t exist. Here are
              some helpful links:
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 pt-4">
            <Link href="javascript:history.back()">
              <Button
                variant="outline"
                className="min-w-40 md:min-w-45 cursor-pointer px-8 py-6 md:py-7 text-base font-semibold rounded-xl md:rounded-2xl border-gray-400 text-gray-800 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
              >
                <ArrowLeft size={18} />
                Go back
              </Button>
            </Link>

            <Link href="/">
              <Button className="min-w-40 md:min-w-45 cursor-pointer px-8 py-6 md:py-7 text-base font-semibold rounded-xl md:rounded-2xl bg-secondary hover:bg-orange-600/90 text-white flex items-center gap-2 shadow-md shadow-secondary/30 transition-all hover:scale-[1.02]">
                <Home size={18} />
                Take me home
              </Button>
            </Link>
          </div>
        </div>

        {/* Right image */}
        <div className="relative hidden lg:block h-full max-w-140 max-h-120  ">
          <Image
            src={bannerImage}
            alt="Dashboard Preview"
            fill
            priority
            className="rounded-2xl "
          />
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
