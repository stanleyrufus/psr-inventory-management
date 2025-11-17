// frontend/src/context/AuthContext.jsx

import React, { createContext, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${BASE}/api/users/login`, {
        username,
        password,
      });

      // unified extraction
      const userData = res.data.user;
      const token = res.data.token;

      if (!userData || !token) {
        throw new Error("Invalid login response");
      }

      // ensure permissions array always exists
      const normalizedUser = {
        ...userData,
        permissions: Array.isArray(userData.permissions)
          ? userData.permissions
          : [],
      };

      setUser(normalizedUser);

      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.setItem("token", token);

      return true;
    } catch (err) {
      console.error("Login error:", err);
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
