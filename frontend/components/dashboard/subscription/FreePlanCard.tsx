import { RootState } from "@/redux/store/store";
import { Check, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";

export const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
      <Check className="w-3 h-3 text-success0" />
    </div>
    <span className="font-inter font-medium text-sm text-gray-600">{text}</span>
  </div>
);

export const FreePlanCard = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  return (
    <div className="w-full max-w-300  bg-white rounded-2xl border border-gray-200 shadow-md px-6 py-5 flex items-center justify-between flex-wrap gap-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
        <div className="flex flex-col">
          <span className="font-inter text-sm text-gray-500">Free</span>
          <div className="flex relative items-baseline gap-1">
            <span className="flex font-sora font-bold text-5xl pl-6 text-gray-900">
              0
            </span>
            <span className="font-sora font-bold text-xl text-gray-900">
              /mth
            </span>
            <Image
              width={200}
              height={200}
              src="/icon/pound.svg"
              className="absolute w-8 h-8 pointer-events-none left-0 top-6"
              alt="pound"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-col gap-2">
        <FeatureItem text="Visible For 7 Days" />
        <FeatureItem text="1 Task Credit Per Month" />
        <FeatureItem text="5 Task & 2 Visibility credits Capacity" />
        {/* <FeatureItem text="Weekly backlink required for visibility" /> */}
      </div>

      {/* CTA */}
      <Link
        href={`${user ? "/dashboard" : "/auth/login"}`}
        className="bg-primary px-6 w-full md:w-fit text-center hover:bg-brand-indigo-600 text-white  md:px-32 py-2 rounded-xl font-inter font-semibold text-base transition-all"
      >
        Get started
      </Link>
    </div>
  );
};
