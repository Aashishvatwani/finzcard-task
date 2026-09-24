'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AnalystDrawer } from '@/components/AnalystDrawer';
import { uploadTransactionsCSV, seedSampleDataset } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(25);
    setStatusMessage(null);

    try {
      setProgress(50);
      const res = await uploadTransactionsCSV(file);
      setProgress(100);
      setStatusMessage({
        type: 'success',
        text: res.message || 'File uploaded, classified, and P&L re-aggregated successfully!'
      });
      setTimeout(() => {
        router.push('/pnl');
      }, 1500);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to parse and ingest CSV file.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSeedSample = async () => {
    setUploading(true);
    setProgress(35);
    setStatusMessage(null);

    try {
      setProgress(75);
      const res = await seedSampleDataset();
      setProgress(100);
      setStatusMessage({
        type: 'success',
        text: `Successfully seeded official sample dataset with ${res.count} transactions!`
      });
      setTimeout(() => {
        router.push('/pnl');
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to seed sample dataset.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#F4EFE5] flex flex-col font-sans">
      <Navbar onOpenAnalyst={() => setIsAnalystOpen(true)} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4EFE5] tracking-tight">
            Ingest Bank & POS Transactions
          </h1>
          <p className="text-xs sm:text-sm text-[#A8AAA3] max-w-lg mx-auto">
            Upload raw CSV exports from Toast, DoorDash, QuickBooks, or banks.
            The fuzzy normalizer detects variable headers and applies deterministic accounting rules.
          </p>
        </div>

        {/* 1-Click Sample Ingestion Callout */}
        <div className="p-5 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16242B] border border-[#24343A] flex items-center justify-center text-[#C89B5D] flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4EFE5]">Quick Demo: 1-Click Official Dataset</h3>
              <p className="text-xs text-[#A8AAA3]">
                Load the verified 181-transaction restaurant dataset (Q1 2026: Toast POS, Sysco, Gusto, CapEx oven, tax remittances).
              </p>
            </div>
          </div>
          <button
            onClick={handleSeedSample}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C89B5D] to-[#E5C58E] hover:from-[#E5C58E] hover:to-[#C89B5D] disabled:opacity-50 text-[#071015] font-bold text-xs transition-all shadow-md shadow-[#C89B5D]/20 flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#071015]" />
            <span>Load 181 Transactions</span>
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-[#24343A] hover:border-[#C89B5D]/60 rounded-3xl p-10 flex flex-col items-center justify-center text-center bg-[#0C171D]/80 backdrop-blur-md hover:bg-[#111D24]/80 transition-all cursor-pointer group shadow-xl"
          onClick={() => document.getElementById('csvFileInput')?.click()}
        >
          <input
            id="csvFileInput"
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={(e) => e.target.files && setFile(e.target.files[0])}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-[#16242B] border border-[#24343A] flex items-center justify-center text-[#C89B5D] group-hover:scale-110 transition-transform mb-4 shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-[#F4EFE5] mb-1">
            {file ? file.name : 'Drag & drop bank/POS CSV here, or click to browse'}
          </h3>
          <p className="text-xs text-[#A8AAA3] max-w-sm mb-4">
            Supports standard CSV/TSV with columns like Date, Description, Amount (or Debit/Credit), and Counterparty.
          </p>

          {file && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16242B] text-[#E5C58E] border border-[#24343A] text-xs font-mono mb-4">
              <FileCheck className="w-4 h-4 text-[#C89B5D]" />
              <span>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={!file || uploading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C89B5D] to-[#E5C58E] hover:from-[#E5C58E] hover:to-[#C89B5D] disabled:opacity-40 text-[#071015] font-bold text-xs transition-all shadow-md shadow-[#C89B5D]/20 flex items-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#071015] border-t-transparent rounded-full animate-spin" />
                <span>Processing & Classifying...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-[#071015]" />
                <span>Ingest & Run Financial Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[#A8AAA3]">
              <span>Running deterministic classification & anomaly checks...</span>
              <span className="font-mono text-[#F4EFE5]">{progress}%</span>
            </div>
            <div className="w-full bg-[#16242B] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#C89B5D] h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in ${
              statusMessage.type === 'success'
                ? 'bg-[#16242B] border-[#55C99A]/50 text-[#55C99A]'
                : 'bg-[#16242B] border-[#E66A63]/50 text-[#E66A63]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <div className="flex-1 font-medium">{statusMessage.text}</div>
          </div>
        )}
      </main>

      <AnalystDrawer
        isOpen={isAnalystOpen}
        onClose={() => setIsAnalystOpen(false)}
        onSelectTransaction={() => {}}
      />
    </div>
  );
}
