"use client";

// Removed unused imports
import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";

// Removed unused useAccount import

// Removed unused imports

// import contract hooks here (placeholder)
// import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";

// Removed unused candidates array

// Removed unused learnLinks array

const Home: NextPage = () => {
  // Removed unused slideshow logic

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[60vh] overflow-hidden pb-0">
        {/* Hero Top Content */}
        <div className="relative z-10 flex flex-col items-center pt-[20px] md:pt-[100px] pb-12 w-full">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Now everyone can vote</span>
            <span className="block text-4xl md:text-6xl font-bold mb-4 text-[#ff9d5c]">
              Participate in Decentralized Elections
            </span>
          </h1>
          <p className="text-center text-lg max-w-xl mb-6">
            Evolve democracy with blockchain-powered, transparent, and secure voting. Join, vote, and make your voice
            count in the presidential, senatorial, and gubernatorial elections.
          </p>
          <Link
            href="/voting"
            className="bg-white text-black font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-gray-200 transition"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* Home Image Section */}
      <section className="w-full flex flex-col items-center justify-center py-12 bg-black">
        <div className="max-w-6xl w-full px-4">
          <div className="flex justify-center">
            <Image src="/home.png" alt="Home" width={800} height={600} className="rounded-lg shadow-lg" priority />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
