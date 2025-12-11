import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, logout } from "../services/api/auth";
import { getUserFromStorage, saveUserToStorage, removeUserFromStorage } from "../services/api/auth/authService";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../utils/authData";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // <-- Add loading

  const fetchProfile = async () => {
    try {
      if(getAuthToken()){
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
      fetchProfile(); // fallback if no local user
    }
  }, []);

  const navigate = useNavigate()
  const logoutUser = async () => {
    try {
      await logout();
      navigate("/");
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
