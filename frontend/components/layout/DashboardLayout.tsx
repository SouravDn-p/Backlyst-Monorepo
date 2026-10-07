"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Wallet,
  Globe,
  Settings,
  RefreshCcw,
  SquareCheckBig,
  StretchHorizontal,
  ShoppingBag,
  CreditCard,
  Folder,
  Award,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { selectActiveTab, setActiveTab } from "@/redux/features/slice/authSlice";
import DashboardHeader from "./DashboardHeader";

import LogoutModal from "../modals/LogoutModal";
import CreateTaskModal from "../dashboard/provider/profile/CreateTaskModal";
import { InstantDeliveryModal } from "../dashboard/modal/InstantDeliveryModal";
import { SidebarContent, SidebarItem } from "./SidebarContent";

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const role = useSelector(selectActiveTab);

  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);
  const [showDeliveryTask, setShowDeliveryTask] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const currentRole: "requester" | "provider" = role;
  const basePath = "/dashboard";

  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const handleRoleSwitch = (newRole: "requester" | "provider") => {
    if (newRole === currentRole) return;
    
    if (pathname === "/dashboard/orders") {
      router.push("/dashboard/jobs");
    } else if (pathname === "/dashboard/jobs") {
      router.push("/dashboard/orders");
    } else if (pathname === "/dashboard/opportunities") {
      router.push("/dashboard/providers");
    } else if (pathname === "/dashboard/providers") {
      router.push("/dashboard/opportunities");
    } else {
      router.push("/dashboard");
    }
    
    dispatch(setActiveTab(newRole));
  };

  const handleCreateTask = () => {
    router.push(
      currentRole === "requester"
        ? `${basePath}/providers`
        : `${basePath}/opportunities`,
    );

    if (currentRole === "requester") {
      setShowCreateTask(true);
      setShowDeliveryTask(false);
    } else {
      setShowCreateTask(false);
      setShowDeliveryTask(true);
    }
  };

  const handleCloseCreateTask = () => setShowCreateTask(false);
  const handleCloseDeliveryTask = () => setShowDeliveryTask(false);
  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleCloseLogout = () => setShowLogoutModal(false);
  const handleMenuToggle = () => setIsSidebarOpen((p) => !p);
  const handleOverlayClick = () => setIsSidebarOpen(false);
  const handleLinkClick = () => setIsSidebarOpen(false);

  const sidebarItems: SidebarItem[] =
    currentRole === "provider"
      ? [
        { icon: StretchHorizontal, label: "Dashboard", path: basePath },
        { icon: SquareCheckBig, label: "My Job", path: `${basePath}/jobs` },
        {
          icon: ShoppingBag,
          label: "Opportunity Board",
          path: `${basePath}/opportunities`,
        },
        {
          icon: MessageSquare,
          label: "Messages",
          path: `${basePath}/messages`,
        },
        { icon: Wallet, label: "Wallet", path: `${basePath}/wallet` },
        { icon: Award, label: "Rewards & Badges", path: `${basePath}/rewards` },
        { icon: Globe, label: "Websites", path: `${basePath}/websites` },
        {
          icon: RefreshCcw,
          label: "Referrals",
          path: `${basePath}/referrals`,
        },
        {
          icon: CreditCard,
          label: "Subscription",
          path: `${basePath}/subscription`,
        },
        { icon: Settings, label: "Settings", path: `${basePath}/settings` },
      ]
      : [
        { icon: StretchHorizontal, label: "Dashboard", path: basePath },
        {
          icon: SquareCheckBig,
          label: "Tasks",
          path: `${basePath}/orders`,
        },
        {
          icon: ShoppingBag,
          label: "Company Directory",
          path: `${basePath}/providers`,
        },
        {
          icon: MessageSquare,
          label: "Messages",
          path: `${basePath}/messages`,
        },
        { icon: Wallet, label: "Wallet", path: `${basePath}/wallet` },
        { icon: Award, label: "Rewards & Badges", path: `${basePath}/rewards` },
        { icon: Globe, label: "Websites", path: `${basePath}/websites` },
        {
          icon: RefreshCcw,
          label: "Referrals",
          path: `${basePath}/referrals`,
        },
        {
          icon: CreditCard,
          label: "Subscription",
          path: `${basePath}/subscription`,
        },
        { icon: Settings, label: "Settings", path: `${basePath}/settings` },
      ];

  const getTargetPathname = (path: string, role: string) => {
    if (role === "provider") {
      if (path === "/dashboard/orders") return "/dashboard/jobs";
      if (path === "/dashboard/providers") return "/dashboard/opportunities";
    } else {
      if (path === "/dashboard/jobs") return "/dashboard/orders";
      if (path === "/dashboard/opportunities") return "/dashboard/providers";
    }
    return path;
  };

  const simulatedPathname = getTargetPathname(pathname, currentRole);

  const activeItem: SidebarItem =
    sidebarItems.find(
      (item) =>
        simulatedPathname === item.path ||
        (item.path !== basePath && simulatedPathname.startsWith(item.path)),
    ) ?? sidebarItems[0];

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] font-inter overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-70 bg-white border-r border-gray-100 flex-col fixed h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarContent
          sidebarItems={sidebarItems}
          activeLabel={activeItem.label}
          onLinkClick={handleLinkClick}
          onLogoutClick={handleLogoutClick}
        />
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-10 transition-opacity"
          onClick={handleOverlayClick}
          aria-label="Close menu overlay"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`xl:hidden fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-100 flex flex-col z-40 shadow-xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <SidebarContent
          sidebarItems={sidebarItems}
          activeLabel={activeItem.label}
          onLinkClick={handleLinkClick}
          onLogoutClick={handleLogoutClick}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-70 xl:ml-65 flex flex-col min-h-screen w-full mx-auto max-w-vw">
        <DashboardHeader
          basePath={basePath}
          onRoleSwitch={handleRoleSwitch}
          onCreateTask={handleCreateTask}
          onMenuToggle={handleMenuToggle}
          isSidebarOpen={isSidebarOpen}
        />

        <main className="flex-1 p-4 pl-6 md:pl-13! lg:p-8 lg:pl-13!">{children}</main>
      </div>

      {/* Modals */}
      <LogoutModal isOpen={showLogoutModal} onClose={handleCloseLogout} />

      {showCreateTask && <CreateTaskModal onClose={handleCloseCreateTask} />}

      {showDeliveryTask && (
        <InstantDeliveryModal onClose={handleCloseDeliveryTask} />
      )}
    </div>
  );
};

export default DashboardLayout;
