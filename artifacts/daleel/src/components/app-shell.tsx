import React from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/components/app-provider";
import { 
  LayoutDashboard, FileText, UploadCloud, Scale, 
  Bell, Settings, ShieldAlert, LogOut, Menu, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { t, language } = useTranslation();
  const { setLanguage } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const [currentPath] = useLocation();

  const isAdmin = user?.publicMetadata?.role === 'admin';

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/contracts", label: t("nav.contracts"), icon: FileText },
    { href: "/contracts/upload", label: t("nav.upload"), icon: UploadCloud },
    { href: "/contracts/compare", label: t("nav.compare"), icon: Scale },
    { href: "/reminders", label: t("nav.reminders"), icon: Bell },
  ];

  const bottomNavItems = [
    { href: "/settings", label: t("nav.settings"), icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: t("nav.admin"), icon: ShieldAlert }] : []),
  ];

  const handleLogout = () => {
    signOut({ redirectUrl: "/" });
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-teal-900 selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-slate-900 dark:bg-slate-950 border-e border-slate-800 text-slate-300 shrink-0 shadow-2xl z-20">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-600/20">
              د
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">
              دليل
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavItem 
                key={item.href} 
                {...item} 
                active={currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))} 
              />
            ))}
          </div>
        </div>

        <div className="p-4 space-y-1 border-t border-slate-800 bg-slate-900/50">
          {bottomNavItems.map((item) => (
            <NavItem 
              key={item.href} 
              {...item} 
              active={currentPath.startsWith(item.href)} 
            />
          ))}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-4/5 max-w-sm flex-col bg-slate-900 border-e border-slate-800 flex h-full shadow-2xl animate-in slide-in-from-left rtl:slide-in-from-right">
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl">
                  د
                </div>
                <span className="font-bold text-xl text-white">دليل</span>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
              {navItems.map((item) => (
                <NavItem 
                  key={item.href} 
                  {...item} 
                  active={currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))} 
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </div>

            <div className="p-4 space-y-1 border-t border-slate-800">
              {bottomNavItems.map((item) => (
                <NavItem 
                  key={item.href} 
                  {...item} 
                  active={currentPath.startsWith(item.href)} 
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all text-sm font-medium"
              >
                <LogOut className="w-5 h-5" />
                {t("nav.logout")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <div className="font-bold text-lg">دليل</div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 z-0">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active, onClick }: any) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
        active 
          ? 'bg-teal-600/10 text-teal-400 border border-teal-500/20 shadow-inner' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-teal-400' : 'opacity-80'}`} />
      {label}
    </Link>
  );
}
