"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile, uploadCV, downloadCV, isAuthenticated, getCurrentUser } from "@/services/api";
import type { Profile } from "@/services/api";

export default function ProfilePage() {
  const router = useRouter();
  
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

  // Show form even if profile is null (for new users)
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
  
  // Always show form if we have a profile (even if it's just initialized)
  if (!profile) {
    // This shouldn't happen, but if it does, initialize it
    const currentUser = getCurrentUser();
    if (currentUser) {
      setProfile(getInitialProfile());
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Profile</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Note:</strong> {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          {/* Personal Information Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name - Mandatory */}
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="John"
                  />
                </div>

                {/* Last Name - Mandatory */}
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Doe"
                  />
                </div>

                {/* Email - Read-only */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profile?.email || getCurrentUser()?.email || ""}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    placeholder="Your email address"
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="City, Country"
                  />
                </div>

                {/* Education - Optional */}
                <div className="md:col-span-2">
                  <label htmlFor="education" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    College/Education
                  </label>
                  <input
                    id="education"
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="University Name, Degree, Year"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* Social Links - Optional */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div>
                  <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GitHub URL
                  </label>
                  <input
                    id="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://github.com/..."
                  />
                </div>

                <div>
                  <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website URL
                  </label>
                  <input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* CV Upload Section - Mandatory */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Resume/CV <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              CV upload is required to complete your profile
            </p>
            
            {profile?.has_cv ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ You have an uploaded CV
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleDownloadCV}
                    className="px-4 py-2 border-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    Download CV
                  </button>
                  <label className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
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
              </div>
            ) : (
              <div>
                <label 
                  htmlFor="cv-upload-input"
                  className="block w-full px-6 py-4 border-2 border-dashed border-red-300 dark:border-red-600 rounded-lg text-center cursor-pointer hover:border-red-500 dark:hover:border-red-400 transition-colors bg-red-50 dark:bg-red-900/10"
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
                  <div className="space-y-2 pointer-events-none">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {uploadingCV ? "Uploading..." : "Click to upload your CV (PDF, DOCX, or TXT) - Required"}
                    </p>
                    {!isUserAuthenticated ? (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        ⚠️ Please log in to upload your CV
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        ✓ Ready to upload
                      </p>
                    )}
                  </div>
                </label>
              </div>
            )}
          </section>

          {/* Save Button - At the end */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving || !formData.first_name.trim() || !formData.last_name.trim() || !profile?.has_cv}
              className="px-8 py-3 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: (saving || !formData.first_name.trim() || !formData.last_name.trim() || !profile?.has_cv) ? '#94a3b8' : '#0077b5' }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
