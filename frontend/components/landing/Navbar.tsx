"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LogOut } from "lucide-react";
import logo from "@/public/backlyst-logo.png";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store/store";
import { useLogoutMutation } from "@/redux/features/api/auth/authApi";
import LogoutModal from "@/components/ui/LogoutModal";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "How Its Work", href: "/how-it-works" },
  { label: "Contact", href: "/contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      setShowLogoutModal(false);
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-100">
      <div className="max-w-330 mx-auto h-20 flex items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-base font-inter text-gray-900 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-base font-semibold font-inter text-gray-900 hover:text-primary transition-colors"
              >
                Dashboard
              </Link>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                </span>

                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-5 py-3 text-base font-semibold font-inter text-primary"
              >
                Log In
              </Link>

              <Link
                href="/auth/register"
                className="bg-primary hover:bg-brand-indigo-600 text-white px-5 py-3 rounded-2xl font-semibold font-inter transition-all"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-6 py-6 flex flex-col gap-6">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-base font-inter text-gray-900 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-base font-semibold font-inter text-primary"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {user.name}
                    </span>

                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200"
                      aria-label="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-base font-semibold font-inter text-primary"
                    onClick={() => setOpen(false)}
                  >
                    Log In
                  </Link>

                  <Link
                    href="/auth/register"
                    className="bg-primary text-white py-3 rounded-xl text-center font-semibold font-inter"
                    onClick={() => setOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        userName={user?.name || ""}
      />
    </nav>
  );
};

export default Navbar;