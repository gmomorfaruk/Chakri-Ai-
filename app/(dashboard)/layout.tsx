import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen bg-background text-foreground">
      <Sidebar />
      <div className="ml-56 flex flex-col h-screen">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 py-6 pt-20 bg-background">
          <AuthGuard>
            <div className="max-w-7xl">
              {children}
            </div>
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}
