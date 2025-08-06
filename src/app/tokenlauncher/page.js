"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import {
    TOKEN_2022_PROGRAM_ID,
    createMintToInstruction,
    createAssociatedTokenAccountInstruction,
    getMintLen,
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    TYPE_SIZE,
    LENGTH_SIZE,
    ExtensionType,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";
import Navbar from "../../../components/Navbar";

export default function TokenLauncher() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState("token");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [initialSupply, setInitialSupply] = useState("");

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    async function createToken() {
        setMessage({ type: "", text: "" });

        if (!wallet.connected || !wallet.publicKey) {
            setMessage({ type: "error", text: "Connect your wallet first." });
            return;
        }

        if (!name || !symbol) {
            setMessage({ type: "error", text: "Please enter name and symbol." });
            return;
        }

        const supplyValue = initialSupply ? parseInt(initialSupply) : 1000000;
        if (supplyValue < 0 || supplyValue > 1000000000) {
            setMessage({ type: "error", text: "Initial supply must be between 0 and 1,000,000,000" });
            return;
        }

        try {
            setIsLoading(true);

            const balance = await connection.getBalance(wallet.publicKey);
            console.log(`Wallet balance: ${balance / 1e9} SOL`);

            if (balance < 0.01 * 1e9) { // Less than 0.01 SOL
                setMessage({ type: "error", text: "Insufficient SOL balance. Need at least 0.01 SOL for transaction fees." });
                return;
            }

            const mintKeypair = Keypair.generate();
            const metadata = {
                mint: mintKeypair.publicKey,
                name: name,
                symbol: symbol.padEnd(8),
                uri: imageUrl || "https://cdn.100xdevs.com/metadata.json",
                additionalMetadata: [],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            const lamports = await connection.getMinimumBalanceForRentExemption(
                mintLen + metadataLen
            );

            console.log(`Required lamports for mint: ${lamports}`);
            console.log(`Mint keypair: ${mintKeypair.publicKey.toBase58()}`);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(
                    mintKeypair.publicKey,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    9,
                    wallet.publicKey,
                    null,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                })
            );

            transaction.feePayer = wallet.publicKey;
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.partialSign(mintKeypair);

            console.log("Sending first transaction...");
            const signature1 = await wallet.sendTransaction(transaction, connection);
            console.log(`Transaction 1 signature: ${signature1}`);

            await connection.confirmTransaction({
                signature: signature1,
                blockhash,
                lastValidBlockHeight
            });

            console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);

            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            console.log(`Associated token address: ${associatedToken.toBase58()}`);

            const transaction2 = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                )
            );

            console.log("Sending second transaction...");
            const signature2 = await wallet.sendTransaction(transaction2, connection);
            console.log(`Transaction 2 signature: ${signature2}`);

            await connection.confirmTransaction(signature2);

            const transaction3 = new Transaction().add(
                createMintToInstruction(
                    mintKeypair.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    BigInt(supplyValue) * BigInt(Math.pow(10, 9)),
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            );

            console.log("Sending third transaction...");
            const signature3 = await wallet.sendTransaction(transaction3, connection);
            console.log(`Transaction 3 signature: ${signature3}`);

            await connection.confirmTransaction(signature3);

            console.log("Minted!");
            setMessage({
                type: "success",
                text: `Token "${name}" created successfully! Mint: ${mintKeypair.publicKey.toBase58()}`,
            });

            setName("");
            setSymbol("");
            setImageUrl("");
            setInitialSupply("");
        } catch (err) {
            console.error("Error creating token:", err);

            let errorMessage = "Token creation failed. Try again.";

            if (err.message?.includes("insufficient funds")) {
                errorMessage = "Insufficient SOL balance. Please add more SOL to your wallet.";
            } else if (err.message?.includes("blockhash not found")) {
                errorMessage = "Network issue. Please try again in a moment.";
            } else if (err.message?.includes("Transaction simulation failed")) {
                errorMessage = "Transaction failed. Check your inputs and try again.";
            } else if (err.code === 4001) {
                errorMessage = "Transaction was rejected by user.";
            }

            setMessage({ type: "error", text: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 flex items-center justify-center px-4 py-12 min-h-[calc(100vh-4rem)]">
                <div className="w-full max-w-md">
                    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="text-4xl mb-4">🚀</div>
                            <h2 className="text-2xl font-bold mb-2">Solana Token Launchpad</h2>
                            <p className="text-gray-400 text-sm">
                                Create SPL Token-2022 with metadata
                            </p>
                        </div>

                        {wallet.connected ? (
                            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-green-400 text-sm font-medium">
                    Wallet Connected
                  </span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1 font-mono">
                                    {wallet.publicKey?.toString().slice(0, 8)}...
                                    {wallet.publicKey?.toString().slice(-8)}
                                </p>
                            </div>
                        ) : (
                            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="text-yellow-400 text-sm font-medium">
                    Connect Wallet First
                  </span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                            />

                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                type="text"
                                placeholder="Symbol"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                disabled={isLoading}
                            />

                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                type="text"
                                placeholder="Image URL"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                disabled={isLoading}
                            />

                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                type="number"
                                placeholder="Initial Supply (max 1 billion)"
                                value={initialSupply}
                                onChange={(e) => setInitialSupply(e.target.value)}
                                min="0"
                                max="1000000000"
                                disabled={isLoading}
                            />

                            <button
                                onClick={createToken}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                                    isLoading
                                        ? "bg-purple-600/50 cursor-not-allowed"
                                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25"
                                }`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Creating Token...</span>
                                    </div>
                                ) : (
                                    "Create a token"
                                )}
                            </button>
                        </div>

                        {message.text && (
                            <div
                                className={`mt-4 p-3 rounded-lg border ${
                                    message.type === "error"
                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                        : "bg-green-500/10 border-green-500/20 text-green-400"
                                }`}
                            >
                                <div className="flex items-center space-x-2">
                                    <div
                                        className={`w-2 h-2 rounded-full ${
                                            message.type === "error" ? "bg-red-500" : "bg-green-500"
                                        }`}
                                    ></div>
                                    <span className="text-sm font-medium break-all">
                    {message.text}
                  </span>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                                        Network
                                    </div>
                                    <div className="text-sm font-medium">Devnet</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                                        Token Standard
                                    </div>
                                    <div className="text-sm font-medium">SPL 2022</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-xs">
                            Create tokens with metadata using Token-2022 program
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}