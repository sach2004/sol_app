"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Navbar from "../../components/Navbar";
import LoadingScreen from "../../components/LoadingScreen";

export default function Home() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [mounted, setMounted] = useState(false);
    const [sol, setSol] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [activeTab, setActiveTab] = useState("airdrop");
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        setTimeout(() => setPageLoading(false), 300);
    }, []);

    if (!mounted || pageLoading) return <LoadingScreen />;

    async function requestSol() {
        setMessage({ type: "", text: "" });

        if (!wallet.publicKey) {
            setMessage({ type: "error", text: "Connect your wallet first." });
            return;
        }

        if (!sol || isNaN(sol) || sol <= 0) {
            setMessage({ type: "error", text: "Enter a valid SOL amount." });
            return;
        }

        try {
            setLoading(true);
            await connection.requestAirdrop(wallet.publicKey, sol * LAMPORTS_PER_SOL);
            setMessage({ type: "success", text: `Airdropped ${sol} SOL successfully.` });
            setSol(0);
        } catch (e) {
            setMessage({ type: "error", text: "Airdrop failed. Try again." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isLoading={pageLoading}
                setIsLoading={setPageLoading}
            />

            <main className="flex-1 flex items-center justify-center px-4 py-12 min-h-[calc(100vh-4rem)]">
                {activeTab === "airdrop" && (
                    <div className="w-full max-w-md">
                        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold mb-2">Request SOL Airdrop</h2>
                                <p className="text-gray-400 text-sm">
                                    Get test SOL tokens for development and testing
                                </p>
                            </div>

                            {wallet.connected ? (
                                <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-green-400 text-sm font-medium">Wallet Connected</span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1 font-mono">
                                        {wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-8)}
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span className="text-yellow-400 text-sm font-medium">Connect Wallet First</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        SOL Amount
                                    </label>
                                    <div className="relative">
                                        <input
                                            onChange={(e) => setSol(Number(e.target.value))}
                                            value={sol || ""}
                                            type="number"
                                            placeholder="0.0"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            disabled={loading}
                                            min="0"
                                            step="0.1"
                                        />
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <span className="text-gray-400 text-sm font-medium">SOL</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={requestSol}
                                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                                        loading
                                            ? "bg-purple-600/50 cursor-not-allowed"
                                            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25"
                                    }`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Airdropping...</span>
                                        </div>
                                    ) : (
                                        "Request Airdrop"
                                    )}
                                </button>
                            </div>

                            {message.text && (
                                <div className={`mt-4 p-3 rounded-lg border ${
                                    message.type === "error"
                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                        : "bg-green-500/10 border-green-500/20 text-green-400"
                                }`}>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            message.type === "error" ? "bg-red-500" : "bg-green-500"
                                        }`}></div>
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-gray-800">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Network</div>
                                        <div className="text-sm font-medium">Devnet</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Max Request</div>
                                        <div className="text-sm font-medium">5 SOL</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-gray-500 text-xs">
                                This faucet provides test SOL tokens for development purposes only
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === "token" && (
                    <div className="w-full max-w-2xl text-center">
                        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-12 shadow-2xl">
                            <div className="text-6xl mb-6">🚀</div>
                            <h2 className="text-3xl font-bold mb-4">Launch Your Token</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Create and deploy your own SPL token on Solana
                            </p>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <p className="text-blue-400 text-sm">Coming Soon...</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "dex" && (
                    <div className="w-full max-w-2xl text-center">
                        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-12 shadow-2xl">
                            <div className="text-6xl mb-6">🔄</div>
                            <h2 className="text-3xl font-bold mb-4">Decentralized Exchange</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Swap tokens directly on Solana with best rates
                            </p>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <p className="text-blue-400 text-sm">Coming Soon...</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}