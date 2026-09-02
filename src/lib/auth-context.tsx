"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import { UserRole } from "@/types";

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  property_id: string | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [isLoading, setIsLoading] = useState(true);

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
            email: currentSession.user.email || null,
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
      syncAuthState(session);
    });

    // Listen ke perubahan sesi autentikasi Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      syncAuthState(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.session) {
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
