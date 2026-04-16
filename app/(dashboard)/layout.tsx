import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex bg-[#020817] text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 min-w-0 overflow-y-auto bg-background px-8 py-6 pt-4 md:pt-8">
          <AuthGuard>
            <div className="max-w-7xl">{children}</div>
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}
