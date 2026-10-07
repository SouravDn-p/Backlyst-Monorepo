"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  const getPages = () => {
    const pages: (number | string)[] = [];

    const maxVisible = 8;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 3);
      const end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pages = getPages();

  return (
    <div className={`flex justify-center mt-6 ${className || ""}`}>
      <div className="flex items-center gap-2 w-full max-w-full bg-white rounded-lg px-2 sm:px-4 py-2 justify-between">
        {/* Previous Button */}
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className={`p-1.5 hover:bg-gray-100 border border-[#e9eaeb] flex gap-2 rounded-lg px-3 justify-center items-center ${
            currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <ChevronLeft className="w-5 h-5 text-[#535862]" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className="flex gap-1 overflow-x-auto">
          {pages.map((item, i) => (
            <button
              key={i}
              onClick={() => onPageChange(item as number)}
              className={`px-3 py-1.5 text-sm font-medium rounded whitespace-nowrap ${
                item === currentPage
                  ? "bg-[#f9f5ff] text-primary"
                  : "text-[#414651] hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className={`p-1.5 hover:bg-gray-100 border border-[#e9eaeb] flex gap-2 rounded-lg px-3 justify-center items-center ${
            currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-5 h-5 text-[#535862]" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
