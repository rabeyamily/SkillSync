// API service for backend communication
import axios from "axios";
import {
  UploadResumeResponse,
  TextInputResponse,
  AnalyzeGapRequest,
} from "@/utils/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

// Auth interfaces
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  auth_provider: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Profile {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  education: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  has_cv: boolean;
}

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Always set Authorization header, even for FormData requests
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Request interceptor: Added Authorization header", {
        url: config.url,
        hasToken: !!token,
        tokenLength: token.length,
        isFormData: config.data instanceof FormData,
      });
    } else {
      console.warn("Request interceptor: No token found in localStorage", {
        url: config.url,
      });
    }
  }
  // Remove Content-Type for FormData - let axios set it with boundary
  // This must happen AFTER setting Authorization to ensure it's not removed
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    console.log(
      "Request interceptor: Removed Content-Type for FormData, kept Authorization:",
      {
        hasAuth: !!config.headers.Authorization,
      }
    );
  }
  return config;
});

// Handle 401 errors (unauthorized) - clear token but keep user data
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log full error for debugging
    console.log("API Error Interceptor:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    });

    if (error.response?.status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const requestUrl = error.config?.url || "";

      // Don't clear token if:
      // 1. We're on the profile page (might be a timing issue after login)
      // 2. The request was to a profile endpoint (might be a fresh login)
      // 3. The token was just set (within last 5 seconds)
      // 4. This is a login/signup request (we don't have a token yet)
      const tokenSetTime = localStorage.getItem("auth_token_set_time");
      const now = Date.now();
      const isRecentLogin = tokenSetTime && now - parseInt(tokenSetTime) < 5000;
      const isAuthRequest =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/signup");

      if (
        currentPath === "/profile" ||
        requestUrl.includes("/profile") ||
        isRecentLogin ||
        isAuthRequest
      ) {
        // Don't clear token for profile page, recent logins, or auth requests
        console.log(
          "401 on profile/recent login/auth request - not clearing token"
        );
        return Promise.reject(error);
      }

      // Clear token but keep user data so UI can still show user info
      // User can log in again to refresh token
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_token_set_time");
      // Don't remove user data - keep it so profile page can still show email
      // localStorage.removeItem('user');

      // Only redirect if we're not already on the home page or login page
      if (
        currentPath !== "/" &&
        currentPath !== "/login" &&
        !currentPath.includes("/auth")
      ) {
        // Don't redirect immediately - let the component handle it
        // This prevents infinite redirect loops
      }
    }
    return Promise.reject(error);
  }
);

// Authentication helpers
export const signup = async (
  email: string,
  password: string,
  fullName?: string
) => {
  try {
    const payload: any = { email, password };
    if (fullName) {
      payload.full_name = fullName;
    }
    const response = await apiClient.post("/api/auth/signup", payload);
    // Signup now returns a message and requires verification
    return response.data;
  } catch (error: any) {
    console.error("Signup error:", error);
    console.error("Signup error response:", error.response?.data);
    console.error("Signup error status:", error.response?.status);
    // Re-throw to let the component handle it
    throw error;
  }
};

export const verifyEmail = async (email: string, code: string) => {
  try {
    const response = await apiClient.post("/api/auth/verify-email", {
      email,
      code,
    });
    const { access_token, user } = response.data;

    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", access_token);
      localStorage.setItem("auth_token_set_time", Date.now().toString());
      localStorage.setItem("user", JSON.stringify(user));
    }

    return { token: access_token, user };
  } catch (error: any) {
    console.error("Email verification error:", error);
    throw error;
  }
};

export const resendVerificationCode = async (email: string) => {
  try {
    const response = await apiClient.post("/api/auth/resend-verification", {
      email,
    });
    return response.data;
  } catch (error: any) {
    console.error("Resend verification error:", error);
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post("/api/auth/login", {
      email,
      password,
    });
    const { access_token, user } = response.data;

    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", access_token);
      localStorage.setItem("auth_token_set_time", Date.now().toString());
      localStorage.setItem("user", JSON.stringify(user));
    }

    return { token: access_token, user };
  } catch (error: any) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_token_set_time");
    localStorage.removeItem("user");
    localStorage.removeItem("guest_mode");
  }
};

export const getCurrentUser = () => {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
};

export const isAuthenticated = () => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("auth_token");
  }
  return false;
};

// Google OAuth helper
export const googleAuth = async (idToken: string) => {
  const response = await apiClient.post("/api/auth/google", {
    id_token: idToken,
  });
  const { access_token, user } = response.data;

  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", access_token);
    localStorage.setItem("auth_token_set_time", Date.now().toString());
    localStorage.setItem("user", JSON.stringify(user));
  }

  return { token: access_token, user };
};

// Profile functions
export const getProfile = async (): Promise<Profile> => {
  const response = await apiClient.get<Profile>("/api/profile/");
  return response.data;
};

export const updateProfile = async (
  profileData: Partial<Profile>
): Promise<Profile> => {
  const response = await apiClient.put<Profile>("/api/profile/", profileData);
  return response.data;
};

export const uploadCV = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);

  // The request interceptor will add the Authorization header
  // Don't set Content-Type - let axios set it with boundary for multipart/form-data
  const response = await apiClient.post("/api/profile/cv", formData);

  return response.data;
};

export const getCV = async (): Promise<any> => {
  const response = await apiClient.get("/api/profile/cv");
  return response.data;
};

export const downloadCV = async (): Promise<Blob> => {
  const response = await apiClient.get("/api/profile/cv/download", {
    responseType: "blob",
  });
  return response.data;
};

// File upload helper
export const uploadFile = async (
  file: File,
  sourceType: "resume" | "job_description"
): Promise<UploadResumeResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source_type", sourceType);

  const response = await apiClient.post<UploadResumeResponse>(
    "/api/upload/upload-resume",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

// Text input helper
export const submitText = async (
  text: string,
  sourceType: "resume" | "job_description"
): Promise<TextInputResponse> => {
  const response = await apiClient.post<TextInputResponse>("/api/text/text", {
    text,
    source_type: sourceType,
  });

  return response.data;
};

// Helper to parse blob error responses
const parseBlobError = async (blob: Blob): Promise<string> => {
  try {
    const text = await blob.text();
    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      return json.detail || json.message || text;
    } catch {
      // If not JSON, return the text
      return text || "Unknown error occurred";
    }
  } catch {
    return "Failed to parse error response";
  }
};

// PDF Report generation helper
export const generatePDFReport = async (
  request: AnalyzeGapRequest
): Promise<Blob> => {
  try {
    const response = await apiClient.post("/api/report/generate-pdf", request, {
      responseType: "blob",
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors, we'll handle them
    });

    // Check if response is an error (non-2xx status or wrong content type)
    const contentType = response.headers["content-type"] || "";
    if (response.status >= 400 || !contentType.includes("application/pdf")) {
      // Likely an error response, try to parse it
      const errorMessage = await parseBlobError(response.data);
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error: any) {
    // If axios error with blob response, parse it
    if (error.response && error.response.data instanceof Blob) {
      const errorMessage = await parseBlobError(error.response.data);
      throw new Error(errorMessage);
    }
    // If it's already an Error with a message, rethrow it
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(error.message || "Failed to generate PDF");
  }
};

// PDF Report generation from IDs helper
export const generatePDFReportFromIds = async (
  resumeId: string,
  jdId: string,
  technicalWeight?: number,
  softSkillsWeight?: number
): Promise<Blob> => {
  try {
    const response = await apiClient.post(
      `/api/report/generate-pdf-from-ids?resume_id=${resumeId}&jd_id=${jdId}${
        technicalWeight !== undefined
          ? `&technical_weight=${technicalWeight}`
          : ""
      }${
        softSkillsWeight !== undefined
          ? `&soft_skills_weight=${softSkillsWeight}`
          : ""
      }`,
      {},
      {
        responseType: "blob",
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors, we'll handle them
      }
    );

    // Check if response is an error (non-2xx status or wrong content type)
    const contentType = response.headers["content-type"] || "";
    if (response.status >= 400 || !contentType.includes("application/pdf")) {
      // Likely an error response, try to parse it
      const errorMessage = await parseBlobError(response.data);
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error: any) {
    // If axios error with blob response, parse it
    if (error.response && error.response.data instanceof Blob) {
      const errorMessage = await parseBlobError(error.response.data);
      throw new Error(errorMessage);
    }
    // If it's already an Error with a message, rethrow it
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(error.message || "Failed to generate PDF");
  }
};

export default apiClient;
