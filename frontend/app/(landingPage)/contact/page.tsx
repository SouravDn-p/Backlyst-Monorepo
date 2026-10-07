"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileCheck, PlayCircle, Check } from "lucide-react";
import CTASection from "@/components/landing/CtaSection";
import { useSubmitContactFormMutation } from "@/redux/features/api/contact/contactApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ContactFormPayload } from "@/types/contact/contactTypes";

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  placeholder: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "GB", dialCode: "+44", name: "United Kingdom", placeholder: "7911 123456" },
  { code: "US", dialCode: "+1", name: "United States", placeholder: "(555) 000-0000" },
  { code: "CA", dialCode: "+1", name: "Canada", placeholder: "(555) 000-0000" },
  { code: "AU", dialCode: "+61", name: "Australia", placeholder: "412 345 678" },
  { code: "IE", dialCode: "+353", name: "Ireland", placeholder: "87 123 4567" },
  { code: "DE", dialCode: "+49", name: "Germany", placeholder: "151 23456789" },
  { code: "FR", dialCode: "+33", name: "France", placeholder: "6 12 34 56 78" },
];

const ContactUs = () => {
  const [agreed, setAgreed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [submitContactForm, { isLoading }] = useSubmitContactFormMutation();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!agreed) {
      toast.error("Please agree to our privacy policy before submitting.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const rawPhone = phoneNumber.trim();
    let formattedPhone = "";

    if (rawPhone) {
      if (rawPhone.startsWith("+")) {
        formattedPhone = rawPhone;
      } else {
        const cleanedNumber = rawPhone.replace(/^0+/, "").trim();
        formattedPhone = `${selectedCountry.dialCode} ${cleanedNumber}`;
      }
    }

    const payload: ContactFormPayload = {
      name: `${formData.get("firstName")} ${formData.get("lastName")}`.trim(),
      email: (formData.get("email") as string)?.trim(),
      company: (formData.get("company") as string)?.trim(),
      phone: formattedPhone,
      subject: (formData.get("subject") as string)?.trim(),
      message: (formData.get("message") as string)?.trim(),
    };

    try {
      const response = await submitContactForm(payload).unwrap();
      toast.success(response.message || "Message sent successfully!");
      router.push("/");
    } catch (error: any) {
      toast.error(error.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <section className="py-28 px-6 bg-[#fdfdff]">
      <div className="max-w-300 mx-auto flex flex-col lg:flex-row items-start gap-16">
        {/* Left: Form */}
        <div className="w-full lg:w-1/2 max-w-135 flex flex-col gap-2 md:pl-0">
          <h1 className="font-sora font-bold text-[32px] md:text-[38px] leading-tight text-gray-900">
            Get in touch
          </h1>
          <p className="text-sm font-inter text-gray-500 leading-5 mb-6">
            Our friendly team would love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* First / Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium font-inter text-gray-700">
                  First name
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="First name"
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium font-inter text-gray-700">
                  Last name
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  placeholder="Last name"
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium font-inter text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                name="company"
                placeholder="Your company"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium font-inter text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Phone number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium font-inter text-gray-700">
                Phone number
              </label>
              <div className="relative flex items-center rounded-lg border border-gray-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary bg-white">
                {/* Country Code Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-inter text-gray-700 border-r border-gray-200 shrink-0 hover:bg-gray-50 rounded-l-lg transition-colors cursor-pointer"
                    aria-label="Select Country Code"
                  >
                    <span className="font-semibold text-gray-800">{selectedCountry.code}</span>
                    <span className="text-xs text-gray-500 font-medium">{selectedCountry.dialCode}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {isCountryDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-30 py-1.5 max-h-56 overflow-y-auto">
                      {COUNTRY_CODES.map((country) => {
                        const isSelected = country.code === selectedCountry.code;
                        return (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsCountryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs md:text-sm font-inter flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold w-7">{country.code}</span>
                              <span className="text-gray-600 truncate">{country.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 text-xs">{country.dialCode}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Input */}
                <input
                  type="tel"
                  name="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={selectedCountry.placeholder}
                  className="w-full px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none rounded-r-lg"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium font-inter text-gray-700">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                placeholder="How can we help?"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium font-inter text-gray-700">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={4}
                placeholder="Leave us a message..."
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none resize-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Privacy checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm font-inter text-gray-600">
                You agree to our friendly privacy policy.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:opacity-90 text-white font-semibold font-inter text-sm py-3 rounded-full transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>

        {/* Right: Illustration */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end py-12">
          <div className="w-full max-w-115 rounded-md overflow-hidden">
            <img
              src="/landing/contact.png"
              alt="Contact our team"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
      <div className="mx-auto">
        <CTASection
          title="Ready to grow your authority?"
          description="Join the new era of SEO outreach. Buy credits, create your first task, and experience backlink building without the friction."
          primaryAction={{
            label: "CREATE YOUR FIRST TASK",
            href: "/dashboard",
            icon: <FileCheck className="w-6 h-6" />,
          }}
          secondaryAction={{
            label: "HOW IT WORKS",
            href: "/how-it-works",
            icon: <PlayCircle className="w-6 h-6" />,
          }}
        />
      </div>
    </section>
  );
};

export default ContactUs;