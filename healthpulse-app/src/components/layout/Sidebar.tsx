import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  FlaskConical,
  MessageSquare,
  UserCircle,
  LogOut,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/hooks/use-auth-store";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/appointments", icon: Calendar, label: "Appointments" },
  { to: "/labs", icon: FlaskConical, label: "Lab Results" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/profile", icon: UserCircle, label: "Profile" },
];

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 p-6">
        <HeartPulse className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">HealthPulse</h1>
          <p className="text-xs text-muted-foreground">Patient Portal</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
