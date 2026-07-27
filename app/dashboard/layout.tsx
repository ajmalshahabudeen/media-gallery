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
    <div className="flex min-h-screen bg-muted/10">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col justify-between p-4 hidden md:flex shrink-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="rounded-md bg-primary p-2 text-primary-foreground">
              <ImageIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-none">Media Gallery</h2>
              <span className="text-xs text-muted-foreground">Next.js + Docker</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={item.active ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Icon className="size-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="border-t pt-4 flex flex-col gap-3">
          {!isPending && session?.user && (
            <div className="flex items-center gap-3 px-2">
              <Avatar className="size-9">
                <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate text-left">
                <span className="text-sm font-medium truncate">
                  {session.user.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </span>
              </div>
            </div>
          )}

          <Button variant="destructive" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2">
            <LogOut className="size-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="border-b bg-card p-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            <span className="font-semibold">Media Gallery</span>
          </div>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant={item.active ? "secondary" : "ghost"} size="sm">
                  {item.name}
                </Button>
              </Link>
            ))}
            <Button variant="destructive" size="xs" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
