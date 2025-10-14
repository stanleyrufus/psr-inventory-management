import React, { createContext, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (username, password) => {
    try {
      // ✅ Add await here
      const res = await axios.post("http://localhost:5000/users/login", { username, password });

      // Backend returns { user: {...}, token: "..." }
      const { user: userData, token } = res.data;

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);

      return true;
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message); // Show backend errors
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
