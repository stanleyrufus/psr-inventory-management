// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("psr_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // simple demo login - replace with real API later
  const login = async ({ email, password }) => {
    // demo credentials: admin@psr.com / admin
    if (email === "admin@psr.com" && password === "admin") {
      const u = { email: "admin@psr.com", name: "Admin" };
      setUser(u);
      localStorage.setItem("psr_user", JSON.stringify(u));
      navigate("/", { replace: true });
      return { success: true };
    }
    return { success: false, message: "Invalid credentials" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("psr_user");
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
