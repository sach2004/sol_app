"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar({ activeTab, setActiveTab }) {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { id: "airdrop", label: "Airdrop", href: "/" },
        { id: "token", label: "Token Launch", href: "/tokenlauncher" },
        { id: "dex", label: "DEX", href: "/dex" },
    ];

    const handleTabClick = (tab) => {
        if (tab.href === "#") {
            setActiveTab?.(tab.id);
        } else {
            router.push(tab.href);
            setActiveTab?.(tab.id);
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
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    currentActiveTab === tab.id
                                        ? "bg-purple-600 text-white shadow-lg"
                                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center">
                        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !rounded-lg !font-medium !text-sm !py-2 !px-4 !transition-all !duration-200" />
                    </div>
                </div>
            </div>
        </nav>
    );
}