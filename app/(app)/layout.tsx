import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-border border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <span className="text-muted-foreground text-xs">
            {session.email ?? "Signed in"}
          </span>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
