// Profile quick-view overlay inspired by LinkedIn popover
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  getProfile,
  isAuthenticated,
  getCurrentUser,
  logout,
} from "@/services/api";
import type { Profile } from "@/services/api";

type ProfileOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
};

const buildInitialProfile = (): Profile | null => {
  const user = getCurrentUser();
  if (!user) return null;
  return {
    user_id: user.id,
    email: user.email,
    first_name: user.full_name?.split(" ")[0] || null,
    last_name:
      user.full_name?.split(" ").slice(1).join(" ").trim() || null,
    location: null,
    education: null,
    bio: null,
    linkedin_url: null,
    github_url: null,
    website_url: null,
    has_cv: false,
  };
};

export default function ProfileOverlay({
  isOpen,
  onClose,
  anchorRect,
}: ProfileOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(
    buildInitialProfile()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated()) {
        setError("Please log in to view your profile.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
            "Unable to load profile right now."
        );
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      // Always refresh when opened to show latest changes
      fetchProfile();
    }
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    onClose();
  };

  // Close when clicking outside the card
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      const cardElement = cardRef.current;
      if (
        cardElement &&
        !cardElement.contains(event.target as Node) &&
        !(event.target as Element).closest(".user-button-anchor")
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !anchorRect) return null;

  const currentUser = getCurrentUser();
  const safeProfile = profile || buildInitialProfile();
  const firstName = safeProfile?.first_name || "";
  const lastName = safeProfile?.last_name || "";
  const fullName =
    `${firstName} ${lastName}`.trim() ||
    currentUser?.full_name ||
    currentUser?.email ||
    "Complete your profile";
  const jobLine =
    (safeProfile?.bio && safeProfile.bio.trim()) ||
    safeProfile?.education ||
    safeProfile?.location ||
    "Add a short bio to tell others about yourself.";

  const personalDetails = [
    { label: "Email", value: safeProfile?.email || currentUser?.email },
    { label: "Location", value: safeProfile?.location },
    { label: "Education", value: safeProfile?.education },
    { label: "LinkedIn", value: safeProfile?.linkedin_url },
    { label: "GitHub", value: safeProfile?.github_url },
    { label: "Website", value: safeProfile?.website_url },
  ].filter((item) => item.value && String(item.value).trim().length > 0);

  const initials =
    fullName && fullName !== "Complete your profile"
      ? fullName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part[0]?.toUpperCase())
          .join("") || "👤"
      : "👤";

  const cardWidth = 320;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : cardWidth;
  const viewportScrollX = typeof window !== "undefined" ? window.scrollX : 0;
  const viewportScrollY = typeof window !== "undefined" ? window.scrollY : 0;
  const rawLeft = anchorRect.left + viewportScrollX - cardWidth / 2 + anchorRect.width / 2;
  const boundedLeft = Math.min(
    Math.max(rawLeft, viewportScrollX + 12),
    viewportScrollX + viewportWidth - cardWidth - 12
  );
  const top = anchorRect.bottom + viewportScrollY + 10;

  const overlayContent = (
    <div
      className="z-[9999] fixed"
      style={{ top, left: boundedLeft, width: cardWidth }}
    >
      <div
        ref={cardRef}
        className="rounded-3xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/40 flex items-center justify-center text-blue-900 dark:text-white font-semibold uppercase">
              {initials.length <= 2 ? initials : initials.slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {jobLine}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label="Close profile overlay"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex justify-center">
                <Link
                  href="/profile?mode=edit"
                  className="min-w-[120px] inline-flex items-center justify-center rounded-full border border-blue-600 text-blue-600 dark:text-blue-300 dark:border-blue-400 py-1.5 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors px-2"
                  onClick={onClose}
                >
                  Edit profile
                </Link>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading profile...
            </div>
          ) : (
            <>
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">
                  Personal info
                </p>
                <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  {personalDetails.length > 0 ? (
                    personalDetails.map((item) => (
                      <div key={item.label} className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                        <span className="text-right break-all">{item.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Add more details from your profile to show them here.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 py-2 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(overlayContent, document.body) : null;
}

