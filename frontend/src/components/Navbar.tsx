'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Receipt,
  UploadCloud,
  Bot,
  Sparkles,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';

interface NavbarProps {
  onOpenAnalyst?: () => void;
  txnCount?: number;
  reviewCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAnalyst, txnCount = 181, reviewCount = 5 }) => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/pnl', label: 'P&L & Variances', icon: BarChart3 },
    { href: '/transactions', label: 'Transactions & Review', icon: Receipt },
    { href: '/upload', label: 'CSV Ingestion', icon: UploadCloud },
    { href: '/analyst', label: 'AI Analyst', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#24343A] bg-[#071015]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C89B5D] to-[#E5C58E] flex items-center justify-center shadow-lg shadow-[#C89B5D]/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-[#071015]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#F4EFE5]">
                FINZ AI
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#16242B] text-[#F0D6A3] border border-[#24343A] shadow-sm'
                      : 'text-[#A8AAA3] hover:text-[#F4EFE5] hover:bg-[#111D24]/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C89B5D]' : 'text-[#6F7C80]'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Area */}
        <div className="flex items-center gap-3">
          {/* Status Badges */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111D24] border border-[#24343A] text-[#F4EFE5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55C99A] animate-pulse" />
              <span>{txnCount} Ledger Txns</span>
            </span>
            {reviewCount > 0 && (
              <Link
                href="/transactions?filter=review"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16242B] border border-[#E3A83B]/50 text-[#E3A83B] hover:border-[#E3A83B] transition-colors"
              >
                <span>{reviewCount} In Review</span>
              </Link>
            )}
          </div>

          {/* Quick AI Analyst Trigger Drawer Button */}
          {onOpenAnalyst && (
            <button
              onClick={onOpenAnalyst}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C89B5D] to-[#E5C58E] hover:from-[#E5C58E] hover:to-[#C89B5D] text-[#071015] text-xs font-bold shadow-md shadow-[#C89B5D]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#071015]" />
              <span>Ask Analyst</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
