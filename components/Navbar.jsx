"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar({ activeTab, setActiveTab, isLoading, setIsLoading }) {
    const router = useRouter();
    const pathname = usePathname();
    const [navigatingTo, setNavigatingTo] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const tabs = [
        { id: "airdrop", label: "Airdrop", href: "/" },
        { id: "token", label: "Token Launch", href: "/tokenlauncher" },
        { id: "dex", label: "DEX", href: "/dex" },
    ];

    const handleTabClick = async (tab) => {
        if (getCurrentTab() === tab.id || isLoading) return;

        try {
            setNavigatingTo(tab.id);
            setIsLoading?.(true);

            if (tab.href === "#") {
                setActiveTab?.(tab.id);
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
                router.push(tab.href);
                setActiveTab?.(tab.id);
            }
        } catch (error) {
            console.error("Navigation error:", error);
        } finally {
            setTimeout(() => {
                setIsLoading?.(false);
                setNavigatingTo(null);
            }, 500);
        }
    };

    const getCurrentTab = () => {
        if (activeTab) return activeTab;

        const currentTab = tabs.find(tab => tab.href === pathname);
        return currentTab ? currentTab.id : "airdrop";
    };

    const currentActiveTab = getCurrentTab();

    return (
        <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <span className="text-white font-bold text-xl">SolSuite</span>
                    </div>

                    <div className="flex space-x-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab)}
                                disabled={isLoading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                                    currentActiveTab === tab.id
                                        ? "bg-purple-600 text-white shadow-lg"
                                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                                } ${isLoading ? "cursor-not-allowed opacity-50" : ""}
                                ${navigatingTo === tab.id ? "opacity-75" : ""}`}
                            >
                                <span className={navigatingTo === tab.id ? "opacity-0" : ""}>
                                    {tab.label}
                                </span>
                                {navigatingTo === tab.id && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center">
                        {mounted ? (
                            <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !rounded-lg !font-medium !text-sm !py-2 !px-4 !transition-all !duration-200" />
                        ) : (
                            <div className="w-32 h-8 bg-gradient-to-r from-purple-600/50 to-pink-600/50 rounded-lg animate-pulse" />
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}