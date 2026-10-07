import { Search, Bell, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title: string;
  subtitle: string;
  onMenuClick?: () => void;
  userAvatar?: string;
}

const Header = ({ title, subtitle, onMenuClick, userAvatar }: HeaderProps) => (
  <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
    <div>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden shrink-0 border-gray-200"
        >
          <Menu size={20} />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-sora text-gray-900">
          {title}
        </h1>
      </div>
      <p className="text-gray-500 mt-1 font-inter">{subtitle}</p>
    </div>

    <div className="flex items-center gap-4">
      <div className="relative hidden md:block">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search something..."
          className="pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white w-72 outline-none focus:ring-2 focus:ring-brand-indigo/10 focus:border-brand-indigo transition-all font-inter text-sm"
        />
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-3 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Bell size={20} />
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-orange border-2 border-white" />
      </motion.button>

      <div className="flex items-center gap-3 ml-2">
        <Avatar className="w-11 h-11 border-2 border-white shadow-md">
          <AvatarImage src={userAvatar} />
          <AvatarFallback>TM</AvatarFallback>
        </Avatar>
      </div>
    </div>
  </header>
);

export default Header;
