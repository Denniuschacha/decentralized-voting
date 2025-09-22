"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RainbowKitCustomConnectButton } from "../../components/scaffold-eth/RainbowKitCustomConnectButton";
import { useScaffoldReadContract } from "../../hooks/scaffold-eth/useScaffoldReadContract";
import { useScaffoldWriteContract } from "../../hooks/scaffold-eth/useScaffoldWriteContract";
import { useAccount } from "wagmi";

const RegistrationPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    region: "",
    nationalId: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if registration is active on-chain
  const { data: registrationActive, isLoading: regStatusLoading } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "registrationActive",
  });

  // Write hook for on-chain registration
  const { writeContractAsync: registerVoterAsync, isMining } = useScaffoldWriteContract({
    contractName: "YourContract",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!form.nationalId.trim()) {
      setError("National ID is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // 1. Store names, region, and password in PostgreSQL
      await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          region: form.region,
          wallet: address,
          nationalId: form.nationalId,
          password: form.password,
        }),
      });
      // 2. Store National ID and region on-chain
      await registerVoterAsync({
        functionName: "registerVoter",
        args: [form.nationalId, form.region],
      });
      setSuccess("Registration successful! Redirecting to dashboard...");
      setForm({ firstName: "", lastName: "", region: "", nationalId: "", password: "", confirmPassword: "" });
      // Redirect to dashboard after successful registration
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
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
            <span className="text-2xl font-bold text-[#ff9d5c]">Voter Registration</span>
            <RainbowKitCustomConnectButton />
          </div>
          <p className="text-gray-400 mb-6">
            Register to vote securely. Your National ID and region will be stored on-chain.
          </p>
          {regStatusLoading ? (
            <div className="text-gray-300">Checking registration status...</div>
          ) : registrationActive ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Region</label>
                <input
                  type="text"
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
                  placeholder="e.g., Kericho, Trans Nzoia, Nakuru"
                  required
                />
              </div>
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
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
                  required
                />
              </div>
              {!isConnected && <div className="text-yellow-400 text-sm">Please connect your wallet to register.</div>}
              {error && <div className="text-red-400 text-sm">{error}</div>}
              {success && <div className="text-green-400 text-sm">{success}</div>}
              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                disabled={loading || isMining || !isConnected}
              >
                {loading || isMining ? "Registering..." : "Register"}
              </button>
            </form>
          ) : (
            <div className="text-yellow-400 font-semibold">
              Registration is currently closed. Please check back later.
            </div>
          )}
        </div>
      </div>
      {/* Right: Image */}
      <div className="hidden md:block w-1/2 relative">
        <Image
          src="/login-register.jpg"
          alt="Registration background"
          fill
          className="object-cover rounded-l-xl opacity-90"
          priority
        />
      </div>
    </div>
  );
};

export default RegistrationPage;
