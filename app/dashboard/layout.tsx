"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  User,
  Settings as SettingsIcon,
  LogOut,
  Image as ImageIcon,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

import { NetworkScanner } from "@/components/NetworkScanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const navItems = [
    {
      name: "Gallery",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: User,
      active: pathname === "/dashboard/profile",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: SettingsIcon,
      active: pathname === "/dashboard/settings",
    },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {/* Modern Sidebar using @components/ui/sidebar.tsx */}
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2 text-primary-foreground shrink-0 shadow-sm">
                <ImageIcon className="size-5" />
              </div>
              <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                <h2 className="font-bold text-base leading-tight truncate">Media Gallery</h2>
                <span className="text-xs text-muted-foreground truncate">Next.js + Docker</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={item.active}
                      tooltip={item.name}
                      render={
                        <Link href={item.href} className="flex items-center gap-3 w-full">
                          <Icon className="size-4 shrink-0" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border flex flex-col gap-3">
            {!isPending && session?.user && (
              <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                <Avatar className="size-9 shrink-0 border border-border">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                  <AvatarFallback className="text-xs font-bold">{getInitials(session.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold truncate leading-tight">
                    {session.user.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              title="Sign Out"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar with Sidebar Trigger */}
          <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-muted" />
              <div className="flex items-center gap-2 md:hidden">
                <ImageIcon className="size-5 text-primary" />
                <span className="font-bold text-sm">Media Gallery</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NetworkScanner />
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                Port 38479
              </span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
