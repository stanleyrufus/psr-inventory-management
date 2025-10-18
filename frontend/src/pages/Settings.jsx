import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p className="text-gray-700 mb-6">
        Manage your account information and preferences.
      </p>

      <div className="bg-white p-4 rounded shadow w-full md:w-1/2">
        <h2 className="font-semibold text-lg mb-2">Account Information</h2>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
      </div>
    </div>
  );
}
