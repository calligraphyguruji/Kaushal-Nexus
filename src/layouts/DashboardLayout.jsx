import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-w-0 lg:ml-64">

        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}