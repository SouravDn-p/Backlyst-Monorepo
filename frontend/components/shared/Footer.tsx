import Link from "next/link";
import { Send } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import logo from "@/public/backlyst-logo.png";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="bg-indigo py-12 px-6 border-t border-gray-200">
      <div className="max-w-330 mx-auto flex flex-col gap-14">
        {/* Main Content */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">
          {/* Brand & Socials */}
          <div className="flex flex-col gap-6 items-center lg:items-start">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={logo}
                alt="Backlyst"
                className="w-10 h-9 object-contain"
              />
              <span className="text-2xl font-semibold font-sora text-gray-900">
                backlyst
              </span>
            </Link>

            <div className="flex gap-4 items-center">
              {[FaFacebookF, FaXTwitter, FaLinkedinIn, FaInstagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social link"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-900 hover:text-primary hover:bg-white transition-all"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4">
            {["Backlyst", "Features", "Process", "Pricing", "FAQ"].map(
              (item) => (
                <a
                  key={item}
                  href={item === "Backlyst" ? "/" : `#${item.toLowerCase()}`}
                  className="font-inter text-base text-gray-900 hover:text-primary transition-colors"
                >
                  {item}
                </a>
              ),
            )}
          </div>

          {/* Newsletter */}
          <div className="flex flex-col gap-5 w-full sm:max-w-90 mx-auto lg:mx-0">
            <div className="flex flex-col gap-2 text-center lg:text-left">
              <h4 className="font-inter font-semibold text-base text-gray-900">
                About us
              </h4>
              <p className="font-inter text-xs text-gray-600">
                You can contact us by sending an email
              </p>
            </div>

            <div className="relative">
              <input
                type="email"
                placeholder="Your email"
                className="w-full h-12 bg-white rounded-full px-5 pr-14 text-sm font-inter text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary/40 outline-none shadow-sm border border-gray-300"
              />
              <button
                aria-label="Send email"
                className="absolute right-1 top-1 w-10 h-10 bg-primary hover:bg-brand-indigo-600 rounded-full flex items-center justify-center text-white transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-300 pt-6">
          <p className="font-inter text-xs text-gray-700 text-center">
            © 2025 Backlyst | All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
