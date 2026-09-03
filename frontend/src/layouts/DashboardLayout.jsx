import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070d18] text-slate-900 dark:text-[#f1f5f9] selection:bg-sky-500/20 selection:text-sky-500 font-sans antialiased overflow-x-hidden transition-colors duration-150">
      {/* Persistent / Adaptive Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="min-w-0 flex-1 flex flex-col min-h-screen lg:ml-64 transition-[margin] duration-200">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 mx-auto w-full max-w-[1728px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
