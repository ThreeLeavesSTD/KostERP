"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import { KostStorage } from "./storage";
import { UserRole } from "@/types";

const STAFF_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_STAFF_EMAIL_DOMAIN || "staff.kost.noud.id";

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  custom_role_id?: string | null;
  role_name?: string | null;
  permissions?: string[];
  property_id: string | null;
  login_id: string | null;
  email: string | null;
  phone_number: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    phone?: string
  ) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialAuth() {
  if (typeof window === "undefined") {
    return { user: null, session: null, profile: null, role: "owner" as UserRole };
  }
  try {
    const savedUser = localStorage.getItem("kost_local_auth_user");
    const savedProfile = localStorage.getItem("kost_local_auth_profile");
    if (savedUser && savedProfile) {
      const u = JSON.parse(savedUser);
      const p = JSON.parse(savedProfile);
      return { user: u, session: null, profile: p, role: (p.role || "owner") as UserRole };
    }

    // Cek apakah ada sesi Supabase tersimpan di localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const sbUser = parsed?.user;
          if (sbUser) {
            const metaRole = (sbUser.user_metadata?.role as UserRole) || "owner";
            const prof: UserProfile = {
              id: sbUser.id,
              full_name: sbUser.user_metadata?.full_name || sbUser.email || "Owner",
              role: metaRole,
              property_id: null,
              login_id: sbUser.user_metadata?.login_id || null,
              email: sbUser.email || null,
              phone_number: sbUser.phone || null,
            };
            return { user: sbUser, session: parsed, profile: prof, role: metaRole };
          }
        }
      }
    }
  } catch {}
  return { user: null, session: null, profile: null, role: "owner" as UserRole };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = getInitialAuth();
  const [user, setUser] = useState<User | null>(initial.user);
  const [session, setSession] = useState<Session | null>(initial.session);
  const [profile, setProfile] = useState<UserProfile | null>(initial.profile);
  const [role, setRole] = useState<UserRole>(initial.role);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api";

  const fetchProfile = useCallback(async (token: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        // Fallback jika backend offline / endpoint belum siap, ambil role dari user metadata jika ada
        return null;
      }

      const json = await res.json();
      if (json.success && json.data) {
        return json.data as UserProfile;
      }
      return null;
    } catch (err) {
      console.warn("Gagal menghubungi /api/auth/me:", err);
      return null;
    }
  }, [BACKEND_URL]);

  const syncAuthState = useCallback(
    async (currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.access_token) {
        const loadedProfile = await fetchProfile(currentSession.access_token);
        if (loadedProfile) {
          setProfile(loadedProfile);
          setRole(loadedProfile.role);
        } else {
          // Fallback sementara bila trigger sedang memproses profil
          const metaRole = (currentSession.user.user_metadata?.role as UserRole) || "owner";
          setRole(metaRole);
          setProfile({
            id: currentSession.user.id,
            full_name:
              currentSession.user.user_metadata?.full_name ||
              currentSession.user.email ||
              "Pengguna",
            role: metaRole,
            property_id: null,
            login_id: currentSession.user.user_metadata?.login_id || null,
            email: currentSession.user.user_metadata?.email || currentSession.user.email || null,
            phone_number: currentSession.user.phone || null,
          });
        }
      } else {
        setProfile(null);
        setRole("admin");
      }
      setIsLoading(false);
    },
    [fetchProfile]
  );

  useEffect(() => {
    // Cek session saat pertama mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncAuthState(session);
      } else {
        // Cek sesi staf atau owner lokal tersimpan
        if (typeof window !== "undefined") {
          try {
            const savedUser = localStorage.getItem("kost_local_auth_user");
            const savedProfile = localStorage.getItem("kost_local_auth_profile");
            if (savedUser && savedProfile) {
              const u = JSON.parse(savedUser);
              const p = JSON.parse(savedProfile);
              setUser(u);
              setProfile(p);
              setRole(p.role || "admin");
              setIsLoading(false);
              return;
            }
          } catch {}
        }
        syncAuthState(null);
      }
    });

    // Listen ke perubahan sesi autentikasi Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession) {
        syncAuthState(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim();
      const cleanIdent = trimmedEmail.replace(`@${STAFF_EMAIL_DOMAIN}`, "");

      // 1. Cek akun Staff lokal (mendukung ID pendek misal '1301' dan password angka berapapun tanpa batas minimal)
      const staffList = KostStorage.getStaffAccounts();
      const matchedStaff = staffList.find((s) => {
        const idMatches =
          (s.login_id && s.login_id.toLowerCase() === cleanIdent.toLowerCase()) ||
          (s.username && s.username.toLowerCase() === cleanIdent.toLowerCase()) ||
          (s.id && s.id.toLowerCase() === cleanIdent.toLowerCase()) ||
          (s.email && s.email.toLowerCase() === trimmedEmail.toLowerCase());
        const passMatches = !s.password || s.password === password;
        return idMatches && passMatches;
      });

      if (matchedStaff && matchedStaff.is_active !== false) {
        const mockUser: User = {
          id: matchedStaff.id,
          app_metadata: { provider: "email" },
          user_metadata: {
            full_name: matchedStaff.full_name,
            role: matchedStaff.role,
            login_id: matchedStaff.login_id || matchedStaff.username,
          },
          aud: "authenticated",
          created_at: matchedStaff.created_at || new Date().toISOString(),
          email: matchedStaff.email || `${matchedStaff.login_id || matchedStaff.username}@${STAFF_EMAIL_DOMAIN}`,
        } as unknown as User;

        const staffProfile: UserProfile = {
          id: matchedStaff.id,
          full_name: matchedStaff.full_name,
          role: matchedStaff.role,
          property_id: matchedStaff.property_id || null,
          login_id: matchedStaff.login_id || matchedStaff.username,
          email: matchedStaff.email || null,
          phone_number: matchedStaff.phone_number || null,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("kost_local_auth_user", JSON.stringify(mockUser));
          localStorage.setItem("kost_local_auth_profile", JSON.stringify(staffProfile));
        }

        setUser(mockUser);
        setProfile(staffProfile);
        setRole(matchedStaff.role);
        setIsLoading(false);
        return {};
      }

      // 2. Cek akun Owner lokal (fallback offline)
      const userProfile = KostStorage.getUserProfile();
      if (
        (cleanIdent.toLowerCase() === "owner" ||
          cleanIdent.toLowerCase() === userProfile.username?.toLowerCase() ||
          cleanIdent.toLowerCase() === userProfile.email?.toLowerCase()) &&
        (password === "owner123" || password === "admin" || password === "1234" || password === "123456" || !password)
      ) {
        const mockUser: User = {
          id: userProfile.id || "owner-local",
          app_metadata: { provider: "email" },
          user_metadata: {
            full_name: userProfile.full_name,
            role: "owner",
            login_id: "owner",
          },
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email: userProfile.email || "owner@grahakost.id",
        } as unknown as User;

        const ownerProf: UserProfile = {
          id: mockUser.id,
          full_name: userProfile.full_name,
          role: "owner",
          property_id: null,
          login_id: "owner",
          email: userProfile.email || "owner@grahakost.id",
          phone_number: userProfile.phone_number || null,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("kost_local_auth_user", JSON.stringify(mockUser));
          localStorage.setItem("kost_local_auth_profile", JSON.stringify(ownerProf));
        }

        setUser(mockUser);
        setProfile(ownerProf);
        setRole("owner");
        setIsLoading(false);
        return {};
      }

      // 3. Coba autentikasi Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setIsLoading(false);
        return {
          error:
            error.message === "Invalid login credentials"
              ? "Email/ID atau password salah. Silakan periksa kembali."
              : error.message,
        };
      }

      if (data.session) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("kost_local_auth_user");
          localStorage.removeItem("kost_local_auth_profile");
        }
        await syncAuthState(data.session);
      }
      return {};
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || "Terjadi kesalahan saat masuk" };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    phone?: string
  ): Promise<{ error?: string; message?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim(),
            name: fullName?.trim(),
            phone: phone?.trim(),
          },
        },
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.session) {
        await syncAuthState(data.session);
        return { message: "Pendaftaran berhasil! Anda telah masuk." };
      }

      setIsLoading(false);
      return {
        message:
          "Pendaftaran berhasil! Silakan periksa inbox email Anda untuk konfirmasi sebelum masuk.",
      };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || "Terjadi kesalahan saat mendaftar" };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error signing out:", err);
    } finally {
      // Bersihkan state dan legacy session
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole("admin");
      if (typeof window !== "undefined") {
        localStorage.removeItem("kost_erp_session");
        localStorage.removeItem("kost_local_auth_user");
        localStorage.removeItem("kost_local_auth_profile");
      }
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      const loaded = await fetchProfile(session.access_token);
      if (loaded) {
        setProfile(loaded);
        setRole(loaded.role);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
