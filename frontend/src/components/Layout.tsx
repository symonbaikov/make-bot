import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Activity,
  PlusCircle,
  LogOut,
  User,
  FileText,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { PageTransition } from './ui/PageTransition';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Панель управління', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Платежі', href: '/payments', icon: CreditCard },
    { name: 'Журнал активності', href: '/actions', icon: Activity },
    { name: 'Звіти', href: '/reports', icon: FileText },
    { name: 'Чат з ІІ', href: '/ai-chat', icon: MessageSquare },
    { name: 'Створити сесію', href: '/sessions/create', icon: PlusCircle },
    { name: 'Налаштування', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background text-white overflow-hidden relative">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-float" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] animate-float"
          style={{ animationDelay: '-3s' }}
        />
      </div>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-y-0 left-0 w-64 bg-glass backdrop-blur-xl border-r border-glass-border z-20"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 border-b border-glass-border">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Make Bot
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group overflow-hidden ${
                    active
                      ? 'text-white bg-primary/20 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${active ? 'text-primary' : ''}`}
                  />
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-glass-border bg-black/20">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Вийти
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="pl-64 relative z-10">
        <main className="p-8 min-h-screen">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
