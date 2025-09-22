"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RainbowKitCustomConnectButton } from "../../components/scaffold-eth/RainbowKitCustomConnectButton";
import { useAccount } from "wagmi";

const LoginPage = () => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [form, setForm] = useState({
    nationalId: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [voterInfo, setVoterInfo] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // No longer need on-chain check for login - we'll use the API instead

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    setVoterInfo(null);
    try {
      // Login using API with password verification
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: form.nationalId,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
      } else {
        setVoterInfo(data.voter);
        setSuccess("Login successful! Welcome, voter. Redirecting to dashboard...");
        // Redirect to dashboard after successful login
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-900">
      {/* Left: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 py-12">
        <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <span className="text-2xl font-bold text-[#ff9d5c]">Voter Login</span>
            <RainbowKitCustomConnectButton />
          </div>
          <p className="text-gray-400 mb-6">Login securely to access your voting dashboard.</p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-gray-300 mb-1">National ID</label>
              <input
                type="text"
                name="nationalId"
                value={form.nationalId}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
                required
              />
            </div>
            {!isConnected && <div className="text-yellow-400 text-sm">Please connect your wallet to login.</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {success && <div className="text-green-400 text-sm">{success}</div>}
            <button
              type="submit"
              className="w-full py-2 mt-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
              disabled={loading || !isConnected}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          {voterInfo && (
            <div className="mt-6 p-4 bg-gray-700 rounded text-gray-200">
              <div>
                <span className="font-semibold">Name:</span> {voterInfo.firstName} {voterInfo.lastName}
              </div>
              <div>
                <span className="font-semibold">Wallet:</span> {voterInfo.wallet}
              </div>
              <div>
                <span className="font-semibold">Region:</span> {voterInfo.region}
              </div>
              <div>
                <span className="font-semibold">National ID:</span> {voterInfo.nationalId}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Right: Image */}
      <div className="hidden md:block w-1/2 relative">
        <Image
          src="/login-register.jpg"
          alt="Login background"
          fill
          className="object-cover rounded-l-xl opacity-90"
          priority
        />
      </div>
    </div>
  );
};

export default LoginPage;
