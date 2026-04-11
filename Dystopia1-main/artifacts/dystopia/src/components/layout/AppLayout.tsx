import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { 
  Activity, 
  BarChart3, 
  LogOut, 
  Menu, 
  MessageSquare,
  Moon,
  Plus, 
  ShieldAlert, 
  Sun,
  Users, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const navItems = [
    { href: "/consilium", label: "Consilium", icon: Activity },
    { href: "/simulations", label: "Simulations", icon: BarChart3 },
    { href: "/threads", label: "Debate Threads", icon: MessageSquare },
    { href: "/agents", label: "Agent Archetypes", icon: Users },
  ];

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar h-full">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">DYSTOPIA</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Consilium Platform</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="p-4">
          <Button 
            className="w-full justify-start gap-2 shadow-md shadow-primary/20" 
            onClick={() => setLocation("/simulations/new")}
          >
            <Plus className="w-4 h-4" />
            New Simulation
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/consilium" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant={isActive ? "secondary" : "ghost"} 
                  className={`w-full justify-start gap-3 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-accent-border font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 p-2 rounded-md bg-card border border-border">
            <Avatar className="h-8 w-8 rounded-sm">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs rounded-sm">
                {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.fullName || "Analyst"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="font-bold">DYSTOPIA</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <Button 
              className="w-full justify-start gap-2" 
              onClick={() => {
                setLocation("/simulations/new");
                setIsMobileMenuOpen(false);
              }}
            >
              <Plus className="w-4 h-4" />
              New Simulation
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/consilium" && location.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Button 
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"} 
                  className={`w-full justify-start gap-3 h-12 ${isActive ? "bg-sidebar-accent" : ""}`}
                  onClick={() => {
                    setLocation(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button variant="outline" className="w-full justify-center gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <ShieldAlert className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">DYSTOPIA</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

        <div className="flex-1 overflow-auto p-4 md:p-8 z-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
