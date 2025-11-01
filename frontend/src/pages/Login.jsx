import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const navigate = useNavigate();

  const bgImages = [
  "/images/filler.jpg",
  "/images/capper.jpg",
  "/images/inserter.jpg",
];


  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % bgImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [bgImages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (success) navigate("/dashboard");
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden font-['Rajdhani'] text-gray-200">
      {/* Flying background images */}
<AnimatePresence mode="wait">
  <motion.div
    key={currentImage}
    className="absolute inset-0 bg-cover bg-center"
    style={{
      backgroundImage: `url(${bgImages[currentImage]})`,
    }}
    initial={{ opacity: 0, scale: 1.05, x: 40 }}
    animate={{
      opacity: 1,
      scale: 1.1,
      x: -40,
      transition: { duration: 3, ease: "easeInOut" },
    }}
    exit={{ opacity: 0, scale: 1.05, x: 40, transition: { duration: 2 } }}
  />
</AnimatePresence>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-gray-900/70 to-gray-950/85 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative z-10 bg-gray-900/85 backdrop-blur-lg border border-gray-700/40 shadow-2xl rounded-xl p-8 w-[24rem] text-center">


{/* ✅ Compact PSR Logo container (balanced fit) */}
<div className="flex justify-center mb-6 relative">
  {/* Subtle glow */}
  <motion.div
    className="absolute top-5 w-120%] max-w-[320px] h-[110px] rounded-lg bg-blue-500/20 blur-2xl"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 1 }}
  />

  {/* Logo container */}
  <div className="relative w-[80%] max-w-[320px] h-[160px] flex justify-center items-center overflow-hidden">
    <motion.img
      src="/images/psr-logo.png"
  alt="PSR Automation Logo"
  className="block w-full h-full object-cover rounded-md shadow-[0_0_18px_rgba(59,130,246,0.5)]"
/>

  </div>
</div>

        {/* Title */}
        <motion.h1
          className="text-base md:text-lg font-medium text-blue-400 tracking-wide leading-snug mb-5"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          PSR Inventory & Purchase Order Management Portal
        </motion.h1>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-[90%] px-3 py-2 rounded-md bg-gray-800/80 border border-gray-600 focus:ring-2 focus:ring-blue-400 outline-none placeholder-gray-400 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-[90%] px-3 py-2 rounded-md bg-gray-800/80 border border-gray-600 focus:ring-2 focus:ring-blue-400 outline-none placeholder-gray-400 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-[90%] py-2 rounded-md text-white font-semibold shadow-lg transition-all duration-300 ${
              loading
                ? "bg-blue-700/60 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <span className="flex justify-center items-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </motion.form>

        {/* Footer */}
        <motion.div
          className="mt-6 border-t border-gray-600/60 pt-3 text-[11px] tracking-wide text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          © {new Date().getFullYear()} PSR Automation Inc • Bottling • Capping • Labeling • Filling
        </motion.div>
      </div>
    </div>
  );
}
