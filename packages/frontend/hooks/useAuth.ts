"use client";

import { useEffect, useState } from "react";

import { fetchLogout, fetchMe } from "@/lib/api/index";
import { clearLegacyToken } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearLegacyToken();

    fetchMe()
      .then((response) => {
        setUser(response);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const logout = async () => {
    try {
      await fetchLogout();
    } finally {
      clearLegacyToken();
      setUser(null);
    }
  };

  return { user, loading, logout };
}
