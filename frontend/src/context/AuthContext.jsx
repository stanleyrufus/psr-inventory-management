import React, { createContext, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${BASE}/api/users/login`, { username, password });

      const userData = res.data.user || res.data.data?.user;
      const token = res.data.token || res.data.data?.token;

      if (!userData || !token) throw new Error("Invalid login response structure");

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);

      return true;
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Invalid credentials");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
