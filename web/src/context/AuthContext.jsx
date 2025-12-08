"use client"
import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, logout } from "../services/api/auth";
import { getUserFromStorage, saveUserToStorage, removeUserFromStorage } from "../services/api/auth/authService";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/authData";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      if (getAuthToken()) {
        const profile = await getProfile();
        setUser(profile);
        saveUserToStorage(profile);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
      logoutUser();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (storedUser) {
      setUser(storedUser);
      setLoading(false);
    } else {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoutUser = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout API failed", error);
    }
    removeUserFromStorage();
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logoutUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
