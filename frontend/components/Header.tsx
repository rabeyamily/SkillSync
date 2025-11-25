"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Logo from "./Logo";
import LoginModal from "./LoginModal";
import ProfileOverlay from "./ProfileOverlay";
import { getCurrentUser, logout, isAuthenticated, User } from "@/services/api";

interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

const navigationItems: NavigationItem[] = [
  { 
    label: "Home", 
    href: "/",
    icon: <HomeIcon className="h-5 w-5" />
  },
  { label: "About", href: "/about" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileOverlayOpen, setProfileOverlayOpen] = useState(false);
  const [profileOverlayAnchor, setProfileOverlayAnchor] = useState<DOMRect | null>(null);
  const userButtonRef = useRef<HTMLButtonElement | null>(null);

  // Check authentication state on mount and when it changes
  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    };
    
    // Check immediately
    checkAuth();
    
    // Listen for auth changes
    const handleAuthChanged = () => checkAuth();
    window.addEventListener('auth-changed', handleAuthChanged);
    
    // Listen for storage changes (login from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Refresh user state when modal closes (after successful login)
  useEffect(() => {
    if (!loginModalOpen) {
      // Small delay to ensure token is set before checking
      const timer = setTimeout(() => {
        if (isAuthenticated()) {
          setUser(getCurrentUser());
        } else {
          setUser(null);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loginModalOpen]);

  const handleLogout = () => {
    logout();
    setUser(null);
    setProfileOverlayOpen(false);
    router.push('/');
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
      <nav className="mx-auto flex max-w-[95%] items-center justify-between px-1 sm:px-2 py-2 lg:px-3">
        {/* Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center"
          >
            <Logo />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                }`}
                aria-label={item.label}
              >
                {item.icon || item.label}
              </Link>
            );
          })}
          
          {/* Auth Section */}
          {user ? (
            <div className="relative">
              <button
                ref={userButtonRef}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setProfileOverlayAnchor(rect);
                  setProfileOverlayOpen((prev) => !prev);
                }}
                className="user-button-anchor flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-transparent rounded-full hover:border-blue-100 dark:hover:border-blue-400/40 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden lg:inline">{user.full_name || user.email}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-black dark:text-blue-400 dark:hover:text-black active:text-black dark:active:text-black transition-colors no-underline"
            >
              {/* User icon */}
              <svg 
                className="w-4 h-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
              <span>Log in</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-blue-600 hover:text-blue-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-gray-800"
          aria-controls="mobile-menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          {mobileMenuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  }`}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            })}
            {/* Auth in Mobile Menu */}
            {user ? (
              <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (userButtonRef.current) {
                      const rect = userButtonRef.current.getBoundingClientRect();
                      setProfileOverlayAnchor(rect);
                      setProfileOverlayOpen(true);
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-gray-900 dark:text-white mb-2"
                >
                  View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="mx-3 mt-2 px-3 py-2 text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          // Update user state immediately after successful login
          setUser(getCurrentUser());
          // Dispatch custom event to notify other components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth-changed'));
          }
        }}
      />
      <ProfileOverlay
        isOpen={profileOverlayOpen}
        onClose={() => setProfileOverlayOpen(false)}
        anchorRect={profileOverlayAnchor}
      />
    </header>
  );
}

