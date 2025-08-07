"use client";

import Navbar from "./Navbar";

export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Navbar />

            <main className="flex-1 flex items-center justify-center px-4 py-12 min-h-[calc(100vh-4rem)]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-gray-700 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-purple-600 border-r-pink-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            </main>
        </div>
    );
}