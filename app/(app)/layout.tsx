import { getCurrentContext } from "@/lib/data";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { UserMenu } from "@/components/app/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, organization } = await getCurrentContext();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <p className="text-base font-semibold text-foreground">StockFlow</p>
          <p className="mt-0.5 truncate text-xs text-muted">{organization.name}</p>
        </div>
        <div className="flex-1 p-3">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="md:hidden">
            <SidebarNav />
          </div>
          <div className="md:ml-auto md:self-end">
            <UserMenu email={profile.email} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
