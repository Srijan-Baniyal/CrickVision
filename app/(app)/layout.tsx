import { Suspense } from "react";
import { AppHeaderEmail } from "@/components/app/AppHeaderEmail";
import { AppSidebar } from "@/components/app/AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function AppChromeFallback() {
  return (
    <div
      aria-hidden
      className="flex h-12 items-center border-border border-b bg-background/80 px-4 backdrop-blur"
    />
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<div aria-hidden className="w-64 shrink-0" />}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-border border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Suspense fallback={<AppChromeFallback />}>
            <AppHeaderEmail />
          </Suspense>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
