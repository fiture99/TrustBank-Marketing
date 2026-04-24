import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  KanbanSquare, 
  CalendarClock, 
  BarChart3, 
  Bell, 
  Inbox as InboxIcon, 
  Settings,
  LogOut
} from "lucide-react";
import { useGetCurrentUser, useListInboxAlerts } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser();
  const { data: alerts } = useListInboxAlerts();
  
  const unreadCount = alerts?.filter(a => !a.read).length || 0;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Skeleton className="h-12 w-12 rounded-full" /></div>;
  }

  if (!user && location !== "/login") {
    window.location.href = "/login";
    return null;
  }

  if (location === "/login") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, group: "Marketing" },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone, group: "Marketing" },
    { name: "Leads", href: "/leads", icon: Users, group: "Sales" },
    { name: "Pipeline", href: "/pipeline", icon: KanbanSquare, group: "Sales" },
    { name: "Follow-ups", href: "/follow-ups", icon: CalendarClock, group: "Sales" },
    { name: "Team Activity", href: "/team", icon: BarChart3, group: "Sales" },
    { name: "Notifications", href: "/notifications", icon: Bell, group: "System" },
    { name: "Inbox", href: "/inbox", icon: InboxIcon, group: "System", badge: unreadCount > 0 ? unreadCount : null },
    { name: "Settings", href: "/settings", icon: Settings, group: "System" },
  ];

  const groups = Array.from(new Set(navItems.map(item => item.group)));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xl">
              TB
            </div>
            <span className="font-bold text-lg tracking-tight">Trust Bank</span>
          </div>
        </div>
        
        {user && (
          <div className="px-4 mb-6">
            <Link href="/settings">
              <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent cursor-pointer">
                <div 
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-medium"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-sidebar-accent-foreground">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">{user.role}</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          {groups.map(group => (
            <div key={group}>
              <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h4>
              <div className="space-y-1">
                {navItems.filter(item => item.group === group).map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <Link key={item.name} href={item.href}>
                      <div className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}>
                        <div className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </div>
                        {item.badge !== undefined && item.badge !== null && (
                          <span className={cn(
                            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                            isActive ? "bg-sidebar-primary-foreground text-sidebar-primary" : "bg-primary text-primary-foreground"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
