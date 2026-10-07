"use client";

import React from "react";
import Link from "next/link";
import { LogOut, type LucideIcon } from "lucide-react";
import logo from "@/public/backlyst-logo.png";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store/store";
import { resolveAvatarSrc } from "@/lib/avatar";

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export interface SidebarContentProps {
  sidebarItems: SidebarItem[];
  activeLabel: string;
  onLinkClick: () => void;
  onLogoutClick: () => void;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  sidebarItems,
  activeLabel,
  onLinkClick,
  onLogoutClick,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const imageSrc = resolveAvatarSrc(user);
  return (
    <>
      <div className="p-8 pb-12">
        <Link href="/" className="flex items-center gap-3" onClick={onLinkClick}>
          <Image
            src={logo}
            alt="Backlyst"
            className="w-10 h-9 object-contain"
            priority
          />
          <span className="text-2xl font-semibold font-sora text-gray-900">
            backlyst
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {sidebarItems.map((item) => (
          <Link
            key={item.label}
            href={item.path}
            onClick={onLinkClick}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-sm transition-all duration-300 group ${
              activeLabel === item.label
                ? "bg-indigo text-primary/90 font-semibold border-l-4 border-primary transition-all duration-200"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-700 pl-2 transition-all duration-200"
            }`}
          >
            <item.icon
              size={20}
              className={
                activeLabel === item.label
                  ? "text-primary"
                  : "text-gray-700 group-hover:text-gray-900"
              }
            />
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-100 mt-auto">
        <div
          onClick={onLogoutClick}
          className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl hover:bg-red-50 transition-colors cursor-pointer group border border-transparent hover:border-red-100"
        >
          <div className="w-12 h-12 flex items-center justify-center bg-gray-200 rounded-full overflow-hidden">
            {/* {imageSrc ? (
              <Image
                width={48}
                height={48}
                src={imageSrc}
                alt={user?.name || "User"}
                className="w-full h-full object-cover rounded-full"
              />
            ) : ( */}
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                {user?.name?.charAt(0) || "S"}
              </div>
            {/* )} */}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              {user?.role || "Member"}
            </p>
          </div>
          <LogOut
            size={16}
            className="text-gray-400 group-hover:text-red-500 transition-colors shrink-0"
          />
        </div>
      </div>
    </>
  );
};
