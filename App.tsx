import React, { useState } from 'react';
import { ResumeData, TemplateId } from './types';
import { sampleResumeData, initialEmptyResume } from './data/sampleResume';
import { Header } from './components/Header';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { exportResumeToPdf, triggerPrintDialog } from './utils/pdfExport';
import { PenSquare, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(sampleResumeData);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
  const [accentColor, setAccentColor] = useState<string>('#1e3a8a');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      await exportResumeToPdf('resume-document', resumeData.personalInfo.fullName || 'Resume');
      showToast('PDF downloaded successfully!', 'success');
    } catch (err: unknown) {
      console.error('PDF export error:', err);
      showToast('Failed to generate PDF. You can also try the Print button.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    triggerPrintDialog();
  };

  const handleLoadSample = () => {
    setResumeData(sampleResumeData);
    showToast('Loaded sample resume data', 'success');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all resume fields?')) {
      setResumeData(initialEmptyResume);
      showToast('Cleared all fields', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col font-modern text-slate-800">
      {/* App Header */}
      <Header
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
        accentColor={accentColor}
        onSelectAccentColor={setAccentColor}
        onDownloadPdf={handleDownloadPdf}
        onPrint={handlePrint}
        isDownloading={isDownloading}
        onLoadSample={handleLoadSample}
        onClear={handleClear}
      />

      {/* Mobile Toggle Tabs (Hidden on desktop lg+) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 sticky top-[73px] z-20 no-print">
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'form'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenSquare className="w-3.5 h-3.5" />
            Edit Resume
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'preview'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form Area */}
        <div
          className={`lg:col-span-6 xl:col-span-5 h-[calc(100vh-140px)] min-h-[580px] ${
            mobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ResumeForm
            data={resumeData}
            onChange={setResumeData}
            onDownloadPdf={handleDownloadPdf}
            isDownloading={isDownloading}
          />
        </div>

        {/* Right: Live Resume Preview */}
        <div
          className={`lg:col-span-6 xl:col-span-7 h-[calc(100vh-140px)] min-h-[580px] sticky top-[95px] ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ResumePreview
            data={resumeData}
            template={selectedTemplate}
            accentColor={accentColor}
            onDownloadPdf={handleDownloadPdf}
            onPrint={handlePrint}
            isDownloading={isDownloading}
          />
        </div>
      </main>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
