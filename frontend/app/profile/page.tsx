"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProfile, updateProfile, uploadCV, downloadCV, isAuthenticated, getCurrentUser, getCV } from "@/services/api";
import type { Profile } from "@/services/api";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize profile with current user data if available
  const getInitialProfile = (): Profile => {
    const currentUser = getCurrentUser();
    return {
      user_id: currentUser?.id || 0,
      email: currentUser?.email || "",
      first_name: null,
      last_name: null,
      location: null,
      education: null,
      bio: null,
      linkedin_url: null,
      github_url: null,
      website_url: null,
      has_cv: false
    };
  };
  
  const [profile, setProfile] = useState<Profile | null>(getInitialProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    location: "",
    education: "",
    bio: "",
    linkedin_url: "",
    github_url: "",
    website_url: "",
  });

  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cvInfo, setCvInfo] = useState<{ filename: string } | null>(null);

  useEffect(() => {
    if (searchParams?.get("mode") === "edit") {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Check authentication state and update it reactively
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsUserAuthenticated(authenticated);
      return authenticated;
    };
    
    // Check immediately
    checkAuth();
    
    // Listen for storage changes (when login sets auth_token)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom auth-changed event (fired after login)
    const handleAuthChanged = () => checkAuth();
    window.addEventListener('auth-changed', handleAuthChanged);
    
    // Also check when window gains focus (user might have logged in in another tab)
    const handleFocus = () => checkAuth();
    window.addEventListener('focus', handleFocus);
    
    // Check periodically (every 1 second) to catch login events from same window
    // This is needed because storage events only fire for other windows/tabs
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Ensure email is always set from current user
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.email) {
      setProfile(prev => {
        if (!prev || !prev.email) {
          return {
            ...(prev || getInitialProfile()),
            email: currentUser.email
          };
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      // Only check auth once on mount
      if (hasCheckedAuth) return;
      setHasCheckedAuth(true);
      
      // Always ensure email is set from current user first
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.email) {
        setProfile(prev => ({
          ...(prev || getInitialProfile()),
          email: currentUser.email
        }));
      }
      
      // Don't redirect if not authenticated - just show the form
      // User can fill it out and log in later to save
      if (isAuthenticated()) {
        // Add a small delay after login to ensure token is fully set
        const tokenSetTime = localStorage.getItem('auth_token_set_time');
        const now = Date.now();
        const isRecentLogin = tokenSetTime && (now - parseInt(tokenSetTime)) < 3000;
        
        if (isRecentLogin) {
          // Wait a bit for token to be fully processed
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        try {
          await loadProfile();
        } catch (err: any) {
          // If 401 or any error, just show the form with current user data
          // Don't show error - user can still fill out the form
          console.log('Profile load failed, showing form anyway:', err.message);
          setLoading(false);
        }
      } else {
        // Not authenticated, but still show the form
        setLoading(false);
      }
    };
    checkAuthAndLoad();
  }, [router, hasCheckedAuth]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProfile();
      setProfile(data);
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        location: data.location || "",
        education: data.education || "",
        bio: data.bio || "",
        linkedin_url: data.linkedin_url || "",
        github_url: data.github_url || "",
        website_url: data.website_url || "",
      });
      if (data.has_cv) {
        await loadCvDetails();
      } else {
        setCvInfo(null);
      }
    } catch (err: any) {
      console.log('Profile load error (non-critical):', err.response?.status, err.response?.data?.detail);
      
      // Always initialize profile with current user data so form can show
      // Even on 401, show the form so user can see it (they'll need to log in to save)
      const currentUser = getCurrentUser();
      if (currentUser) {
        setProfile({
          user_id: currentUser.id || 0,
          email: currentUser.email || "",
          first_name: null,
          last_name: null,
          location: null,
          education: null,
          bio: null,
          linkedin_url: null,
          github_url: null,
          website_url: null,
          has_cv: false
        });
      }
      setCvInfo(null);
      
      // Don't show error for 401 - it's expected if session expired
      // User can still fill out the form and log in to save
      if (err.response?.status === 401) {
        // Silently handle 401 - form will show anyway
        setError(null);
      } else {
        // For other errors, show a non-blocking message
        setError("Could not load saved profile data. You can still fill out the form.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Check if user is authenticated
    if (!isAuthenticated()) {
      setError("Please log in to save your profile.");
      setTimeout(() => {
        router.push('/');
      }, 2000);
      return;
    }

    // Validate mandatory fields
    if (!formData.first_name.trim()) {
      setError("First name is required");
      return;
    }
    if (!formData.last_name.trim()) {
      setError("Last name is required");
      return;
    }
    if (!profile?.has_cv) {
      setError("CV upload is required to complete your profile");
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProfile(formData);
      setProfile(updated);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(err.response?.data?.detail || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleCVUpload triggered', e.target.files);
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      setError("No file selected. Please choose a file to upload.");
      return;
    }

    console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size, 'bytes');

    // Check if user is logged in - use state variable that's kept up to date
    // Also do a fresh check in case state hasn't updated yet
    const hasToken = isAuthenticated() || isUserAuthenticated;
    
    if (!hasToken) {
      // Token expired or missing - user needs to log in again
      setError("Your session has expired. Please log in again to upload your CV. Click 'Log in' in the header.");
      // Reset file input
      e.target.value = '';
      return;
    }
    
    // If we have a token, proceed with upload
    console.log('User authenticated, proceeding with CV upload');

    // Validate file type - check both MIME type and file extension
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    console.log('File validation:', {
      mimeType: file.type,
      extension: fileExtension,
      mimeTypeValid: allowedTypes.includes(file.type),
      extensionValid: allowedExtensions.includes(fileExtension)
    });
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError(`Invalid file type. Only PDF, DOCX, and TXT files are allowed. Your file: ${file.name} (${file.type || 'unknown type'})`);
      e.target.value = ''; // Reset file input
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit. Please upload a smaller file.`);
      e.target.value = ''; // Reset file input
      return;
    }

    setError(null);
    setSuccess(null);
    setUploadingCV(true);

    try {
      // Double-check token before upload
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setError("Authentication token missing. Please log in again.");
        setUploadingCV(false);
        return;
      }
      
      console.log('Uploading CV to backend...', {
        tokenPresent: !!token,
        tokenLength: token?.length,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const result = await uploadCV(file);
      console.log('CV upload successful:', result);
      setSuccess("CV uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
      if (result?.filename) {
        setCvInfo({ filename: result.filename });
      } else if (file.name) {
        setCvInfo({ filename: file.name });
      }

      // Update profile to reflect CV upload
      if (isAuthenticated()) {
        try {
          await loadProfile(); // Reload to update has_cv status
        } catch (loadErr) {
          // If reload fails, just update local state
          console.log('Profile reload failed, updating local state');
          setProfile(prev => prev ? { ...prev, has_cv: true } : null);
        }
      } else {
        // If not authenticated, just update local state
        setProfile(prev => prev ? { ...prev, has_cv: true } : null);
      }
    } catch (err: any) {
      console.error('CV upload error:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again to upload your CV.");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || "Invalid file. Please check the file type and try again.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(`Upload failed: ${err.message}`);
      } else {
        setError("Failed to upload CV. Please check your connection and try again.");
      }
      
      // Reset file input on error
      e.target.value = '';
    } finally {
      setUploadingCV(false);
    }
  };

  const handleDownloadCV = async () => {
    try {
      const blob = await downloadCV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to download CV");
    }
  };

  const loadCvDetails = async () => {
    try {
      const cv = await getCV();
      if (cv?.filename) {
        setCvInfo({ filename: cv.filename });
      } else {
        setCvInfo(null);
      }
    } catch (err: any) {
      // 404 just means no CV
      setCvInfo(null);
      if (err.response?.status && err.response.status !== 404) {
        console.warn("Failed to load CV info", err.response?.data || err.message);
      }
    }
  };

  const currentUserData = getCurrentUser();
  const displayFirstName = (profile?.first_name || formData.first_name || "").trim();
  const displayLastName = (profile?.last_name || formData.last_name || "").trim();
  const displayFullName = `${displayFirstName} ${displayLastName}`.trim() || currentUserData?.full_name || currentUserData?.email || "Complete your profile";
  const displayBio = (profile?.bio || formData.bio || "").trim() || "Add a short bio to tell others about yourself.";
  const displayLocation = (profile?.location || formData.location || "").trim() || "Add your location";
  const displayEducation = (profile?.education || formData.education || "").trim() || "Add your education";
  const displayEmail = profile?.email || currentUserData?.email || "Add your email address";
  const initials =
    displayFullName && displayFullName !== "Complete your profile"
      ? displayFullName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part[0]?.toUpperCase())
          .join("") || "👤"
      : "👤";

  const detailRows = [
    { label: "First Name", value: displayFirstName || "Add your first name" },
    { label: "Last Name", value: displayLastName || "Add your last name" },
    { label: "Email", value: displayEmail, isMuted: false },
    { label: "Bio", value: displayBio },
    { label: "Location", value: displayLocation },
    { label: "Education", value: displayEducation },
  ];
  const socialLinks = [
    { label: "LinkedIn", value: profile?.linkedin_url || formData.linkedin_url, placeholder: "Add your LinkedIn URL" },
    { label: "GitHub", value: profile?.github_url || formData.github_url, placeholder: "Add your GitHub URL" },
    { label: "Website", value: profile?.website_url || formData.website_url, placeholder: "Add your website URL" },
  ];


  // Only show loading spinner briefly on initial load, and only if we haven't checked auth yet
  if (loading && !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-600 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#0077b5' }}></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent)]"></div>
      <div className="relative min-h-screen flex items-start justify-center py-16 px-4">
        <div className="relative w-full max-w-xl">
          <div className="absolute -top-6 inset-x-6 h-32 bg-blue-300 dark:bg-blue-900 blur-3xl opacity-40 rounded-full"></div>
          <div className="relative bg-white dark:bg-gray-900/90 rounded-3xl shadow-2xl border border-blue-100/70 dark:border-blue-900/40 p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/40 text-blue-900 dark:text-white flex items-center justify-center text-lg font-semibold uppercase">
                {initials.length <= 2 ? initials : initials.slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                  View profile
                </p>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{displayFullName}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{displayBio}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {displayLocation}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l9-5v6m-9 5l-9-5v-6" />
                    </svg>
                    {displayEducation}
                  </span>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-full border border-blue-600 text-blue-600 dark:text-blue-300 dark:border-blue-500 px-4 py-1 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  Edit profile
                </button>
              )}
            </div>

        {success && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-600 dark:text-green-300">
                {success}
          </div>
        )}
        {error && (
              <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-sm text-yellow-700 dark:text-yellow-300">
                {error}
          </div>
        )}

            {!isEditing && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Personal info</h3>
                  <div className="space-y-2">
                    {detailRows.map((row) => (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                        <span className="text-gray-900 dark:text-gray-100 text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Online presence</h3>
                  <div className="space-y-3">
                    {socialLinks.map((link) => (
                      <div key={link.label} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{link.label}</p>
                          <p className="text-gray-900 dark:text-gray-100 truncate max-w-xs">
                            {link.value || link.placeholder}
                          </p>
                        </div>
                        {link.value && (
                          <a
                            href={link.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:underline"
                          >
                            Visit
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Resume / CV <span className="text-red-500">*</span>
              </h3>
                {profile?.has_cv ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                      {cvInfo?.filename ? (
                        <span className="font-semibold text-green-800 dark:text-green-200">
                          {cvInfo.filename}
                        </span>
                      ) : (
                        "CV on file"
                      )}
                    </div>
                    <label className="flex rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2 justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                      Replace CV
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleCVUpload}
                        className="hidden"
                        disabled={uploadingCV}
                      />
                    </label>
                  </div>
                ) : (
                <label
                  htmlFor="cv-upload-input"
                  className="block px-4 py-6 text-center border-2 border-dashed border-red-200 dark:border-red-700 rounded-2xl hover:border-red-400 dark:hover:border-red-500 transition-colors cursor-pointer bg-red-50/70 dark:bg-red-900/20"
                >
                  <input
                    id="cv-upload-input"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      console.log('File input onChange triggered', e.target.files);
                      handleCVUpload(e);
                    }}
                    className="hidden"
                    disabled={uploadingCV}
                  />
                  <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                    {uploadingCV ? "Uploading..." : "Upload CV to complete profile"}
                  </p>
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                    Accepted: PDF, DOCX, TXT • Max 10MB
                  </p>
                </label>
              )}
            </div>

            {isEditing && (
              <form onSubmit={handleSubmit} className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">
                      Edit profile
                    </p>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal information</h2>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">* Required</span>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="text-sm text-gray-600 dark:text-gray-300">
                        First Name *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="John"
                  />
                </div>
                <div>
                      <label htmlFor="last_name" className="text-sm text-gray-600 dark:text-gray-300">
                        Last Name *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Doe"
                  />
                </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                      <label className="text-sm text-gray-600 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                        value={profile?.email || currentUserData?.email || ""}
                    disabled
                        className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                      <label htmlFor="location" className="text-sm text-gray-600 dark:text-gray-300">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="City, Country"
                  />
                </div>
                  </div>
                  <div>
                    <label htmlFor="education" className="text-sm text-gray-600 dark:text-gray-300">
                      College / Education
                  </label>
                  <input
                    id="education"
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="University Name, Degree, Year"
                  />
                </div>
              <div>
                    <label htmlFor="bio" className="text-sm text-gray-600 dark:text-gray-300">
                  Bio
                </label>
                <textarea
                  id="bio"
                      rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Tell us about yourself..."
                />
              </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                      <label htmlFor="linkedin_url" className="text-sm text-gray-600 dark:text-gray-300">
                    LinkedIn URL
                  </label>
                  <input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                      <label htmlFor="github_url" className="text-sm text-gray-600 dark:text-gray-300">
                    GitHub URL
                  </label>
                  <input
                    id="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                      <label htmlFor="website_url" className="text-sm text-gray-600 dark:text-gray-300">
                    Website URL
                  </label>
                  <input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
            <button
              type="submit"
              disabled={saving || !formData.first_name.trim() || !formData.last_name.trim() || !profile?.has_cv}
                    className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
                    {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
