"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Wallet,
  Link,
  Gift,
  Shield,
  FileText,
  Building2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import AccountSettings from "@/components/dashboard/settings/AccountSettings";
import SecuritySettings from "@/components/dashboard/settings/SecuritySettings";
import NotificationSettings from "@/components/dashboard/settings/NotificationSettings";
import CreditsSettings from "@/components/dashboard/settings/CreditsSettings";
import OrganizationSettings from "@/components/dashboard/settings/OrganizationSettings";
import WebsiteSettings from "@/components/dashboard/settings/WebsiteSettings";
import ReferralsSettings from "@/components/dashboard/settings/ReferralsSettings";
import LegalSettings from "@/components/dashboard/settings/LegalSettings";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("ACCOUNT");

  const tabs = [
    { id: "ACCOUNT", label: "Account", icon: User },
    { id: "ORGANIZATION", label: "Organization", icon: Building2 },
    { id: "NOTIFICATION", label: "Notification", icon: Bell },
    { id: "CREDITS", label: "Credits & Wallet", icon: Wallet },
    // { id: "WEBSITES", label: "Websites & Domains", icon: Link },
    { id: "REFERRALS", label: "Referrals", icon: Gift },
    { id: "SECURITY", label: "Security & Privacy", icon: Shield },
    { id: "LEGAL", label: "Legal & Consent", icon: FileText },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "ACCOUNT":
        return <AccountSettings />;

      case "SECURITY":
        return <SecuritySettings />;

      case "NOTIFICATION":
        return <NotificationSettings />;

      case "CREDITS":
        return <CreditsSettings />;

      case "ORGANIZATION":
        return <OrganizationSettings />;

      case "WEBSITES":
        return <WebsiteSettings />;

      case "REFERRALS":
        return <ReferralsSettings />;

      case "LEGAL":
        return <LegalSettings />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 font-inter w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-sora text-gray-900">Settings</h1>
        <p className="text-gray-500 font-medium text-sm">
          Manage your account preferences and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="xl:col-span-1 space-y-2 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full  cursor-pointer flex items-center gap-3 px-4 py-3.5 rounded-sm  transition-all duration-300 group ${
                activeTab === tab.id
                  ? "bg-indigo text-primary/90 font-semibold border-l-4 border-primary transition-all duration-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 pl-2 transition-all duration-200"
              }`}
            >
              <tab.icon size={18} />
              <span className="pl-4">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Pane */}
        <div className="xl:col-span-3">
          <Card className="  border-none">{renderTabContent()}</Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
