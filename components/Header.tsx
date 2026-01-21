
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            CleanBoost <span className="text-blue-600 font-medium">AI</span>
          </h1>
        </div>
        
        <nav className="hidden sm:flex items-center gap-6">
          <span className="text-sm font-medium text-slate-600 cursor-pointer hover:text-blue-600 transition-colors">시스템 매뉴얼</span>
          <span className="text-sm font-medium text-slate-600 cursor-pointer hover:text-blue-600 transition-colors">문의하기</span>
          <div className="w-px h-4 bg-slate-200"></div>
          <span className="text-sm font-semibold text-blue-600">Premium Plan</span>
        </nav>
      </div>
    </header>
  );
};
