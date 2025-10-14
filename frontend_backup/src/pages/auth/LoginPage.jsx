// src/pages/auth/LoginPage.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@psr.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await login({ email, password });
    if (!res.success) setError(res.message || "Login failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-psr-primary">PSR Inventory</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="mb-3 text-red-600">{error}</div>}

          <button type="submit" className="w-full bg-psr-primary text-white py-2 rounded">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
