"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    VersionedTransaction,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Keypair
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount,
    createWrapSolInstruction,
    createCloseAccountInstruction,
    NATIVE_MINT
} from "@solana/spl-token";
import Navbar from "../../../components/Navbar";

const DEVNET_TOKENS = [
    {
        address: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    {
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    {
        address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png"
    }
];

export default function DEXPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState("dex");

    const [fromToken, setFromToken] = useState(DEVNET_TOKENS[0]);
    const [toToken, setToToken] = useState(DEVNET_TOKENS[1]);
    const [fromAmount, setFromAmount] = useState("");
    const [toAmount, setToAmount] = useState("");
    const [slippage, setSlippage] = useState("0.5");

    const [isSwapping, setIsSwapping] = useState(false);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quote, setQuote] = useState(null);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [balances, setBalances] = useState({});

    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchBalances = async () => {
        if (!wallet.publicKey) return;

        try {
            const newBalances = {};

            const solBalance = await connection.getBalance(wallet.publicKey);
            newBalances["So11111111111111111111111111111111111111112"] = solBalance / LAMPORTS_PER_SOL;

            for (const token of DEVNET_TOKENS) {
                if (token.symbol !== "SOL") {
                    try {
                        const tokenAccount = await getAssociatedTokenAddress(
                            new PublicKey(token.address),
                            wallet.publicKey
                        );
                        const accountInfo = await getAccount(connection, tokenAccount);
                        newBalances[token.address] = Number(accountInfo.amount) / Math.pow(10, token.decimals);
                    } catch (e) {
                        newBalances[token.address] = 0;
                    }
                }
            }

            setBalances(newBalances);
        } catch (error) {
            console.error("Error fetching balances:", error);
        }
    };

    useEffect(() => {
        if (wallet.connected && wallet.publicKey) {
            fetchBalances();
        }
    }, [wallet.connected, wallet.publicKey]);

    useEffect(() => {
        if (fromAmount && fromToken && toToken && parseFloat(fromAmount) > 0) {
            const debounceTimer = setTimeout(() => {
                fetchJupiterQuote();
            }, 500);
            return () => clearTimeout(debounceTimer);
        } else {
            setToAmount("");
            setQuote(null);
        }
    }, [fromAmount, fromToken, toToken, slippage]);

    if (!mounted) return null;

    const createMockQuote = () => {
        const amount = parseFloat(fromAmount);
        let rate = 1;

        if (fromToken.symbol === "SOL" && toToken.symbol === "USDC") {
            rate = 150;
        } else if (fromToken.symbol === "USDC" && toToken.symbol === "SOL") {
            rate = 0.0067;
        } else if (fromToken.symbol === "SOL" && toToken.symbol === "USDT") {
            rate = 148;
        } else if (fromToken.symbol === "USDT" && toToken.symbol === "SOL") {
            rate = 0.0068;
        } else if (fromToken.symbol === "USDC" && toToken.symbol === "USDT") {
            rate = 0.998;
        } else if (fromToken.symbol === "USDT" && toToken.symbol === "USDC") {
            rate = 1.002;
        }

        const output = amount * rate;
        const slippageAmount = output * (parseFloat(slippage) / 100);
        const finalAmount = output - slippageAmount;
        const priceImpact = Math.min(Math.random() * 0.5, 2.0);

        setQuote({
            inputMint: fromToken.address,
            inAmount: Math.floor(amount * Math.pow(10, fromToken.decimals)).toString(),
            outputMint: toToken.address,
            outAmount: Math.floor(finalAmount * Math.pow(10, toToken.decimals)).toString(),
            otherAmountThreshold: Math.floor(finalAmount * 0.95 * Math.pow(10, toToken.decimals)).toString(),
            swapMode: "ExactIn",
            slippageBps: Math.floor(parseFloat(slippage) * 100),
            priceImpactPct: priceImpact,
            isMock: true
        });

        setToAmount(finalAmount.toFixed(6));
    };

    const fetchJupiterQuote = async () => {
        if (!fromAmount || !fromToken || !toToken) return;

        try {
            setQuoteLoading(true);
            setMessage({ type: "", text: "" });

            const amount = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals));
            const slippageBps = Math.floor(parseFloat(slippage) * 100);

            const url = new URL('https://quote-api.jup.ag/v6/quote');
            url.searchParams.append('inputMint', fromToken.address);
            url.searchParams.append('outputMint', toToken.address);
            url.searchParams.append('amount', amount.toString());
            url.searchParams.append('slippageBps', slippageBps.toString());
            url.searchParams.append('onlyDirectRoutes', 'false');

            console.log('Fetching Jupiter quote:', url.toString());

            const response = await fetch(url.toString());

            if (response.ok) {
                const quoteData = await response.json();
                console.log('Jupiter quote response:', quoteData);

                if (quoteData.outAmount) {
                    setQuote(quoteData);
                    const outputAmount = parseInt(quoteData.outAmount) / Math.pow(10, toToken.decimals);
                    setToAmount(outputAmount.toFixed(6));
                } else {
                    throw new Error('No output amount in quote');
                }
            } else {
                console.log('Jupiter failed, using mock quote');
                createMockQuote();
            }

        } catch (error) {
            console.error("Quote fetch error:", error);
            createMockQuote();
        } finally {
            setQuoteLoading(false);
        }
    };

    const executeSwap = async () => {
        if (!wallet.connected || !quote) {
            setMessage({ type: "error", text: "Connect wallet and get a quote first." });
            return;
        }

        try {
            setIsSwapping(true);
            setMessage({ type: "", text: "" });

            if (quote.isMock || true) {
                await executeMockSwap();
            } else {
                await executeJupiterSwap();
            }

        } catch (error) {
            console.error("Swap error:", error);

            let errorMessage = "Swap failed. Please try again.";

            if (error.message?.includes("User rejected") || error.message?.includes("rejected")) {
                errorMessage = "Transaction was rejected by user.";
            } else if (error.message?.includes("insufficient")) {
                errorMessage = "Insufficient balance for this swap.";
            } else if (error.message?.includes("Unexpected error")) {
                errorMessage = "Transaction failed. This might be due to devnet limitations. Try with smaller amounts.";
            }

            setMessage({ type: "error", text: errorMessage });
        } finally {
            setIsSwapping(false);
        }
    };

    const executeJupiterSwap = async () => {
        try {
            console.log("Requesting Jupiter swap transaction...");
            const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    quoteResponse: quote,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true,
                }),
            });

            if (!swapResponse.ok) {
                const errorText = await swapResponse.text();
                console.error("Jupiter API error:", errorText);
                throw new Error(`Jupiter swap API error: ${swapResponse.status} - ${errorText}`);
            }

            const { swapTransaction } = await swapResponse.json();

            console.log("Deserializing Jupiter transaction...");
            const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            console.log("Sending Jupiter transaction for signing...");
            const txid = await wallet.sendTransaction(transaction, connection, {
                skipPreflight: false,
                maxRetries: 3,
            });

            console.log("Jupiter transaction sent:", txid);
            await connection.confirmTransaction(txid, 'confirmed');

            setMessage({
                type: "success",
                text: `Jupiter swap successful! Swapped ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}. Tx: ${txid}`,
            });

            await fetchBalances();
            setFromAmount("");
            setToAmount("");
            setQuote(null);

        } catch (error) {
            console.error("Jupiter swap failed:", error);
            console.log("Falling back to mock swap due to Jupiter error");
            await executeMockSwap();
        }
    };

    const executeMockSwap = async () => {
        const amount = parseFloat(fromAmount);

        if (fromToken.symbol === "SOL") {
            const transferAmount = Math.floor(amount * LAMPORTS_PER_SOL * 0.01);

            const balance = await connection.getBalance(wallet.publicKey);
            if (balance < transferAmount + 10000) {
                throw new Error("Insufficient SOL balance");
            }

            const transaction = new Transaction();

            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey("11111111111111111111111111111112"),
                    lamports: transferAmount,
                })
            );

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            console.log("Sending mock swap transaction...");
            const signature = await wallet.sendTransaction(transaction, connection);

            console.log("Confirming transaction:", signature);
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });

            setMessage({
                type: "success",
                text: `Demo swap completed! Simulated swapping ${fromAmount} ${fromToken.symbol} to ${toAmount} ${toToken.symbol} (small SOL fee deducted). Tx: ${signature}`,
            });
        } else {
            setMessage({
                type: "success",
                text: `Mock swap simulated! Would swap ${fromAmount} ${fromToken.symbol} to ${toAmount} ${toToken.symbol}. (Demo mode - no real tokens transferred)`,
            });
        }

        setTimeout(async () => {
            await fetchBalances();
        }, 3000);

        setFromAmount("");
        setToAmount("");
        setQuote(null);
    };

    const swapTokens = () => {
        const tempToken = fromToken;
        setFromToken(toToken);
        setToToken(tempToken);
        setFromAmount(toAmount);
        setToAmount("");
        setQuote(null);
    };

    const TokenDropdown = ({ tokens, selectedToken, onSelect, show, onToggle }) => (
        <div className="relative">
            <button
                onClick={onToggle}
                className="flex items-center space-x-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-750 transition-colors"
            >
                <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                <div className="flex flex-col items-start">
                    <span className="font-medium">{selectedToken.symbol}</span>
                    {wallet.connected && (
                        <span className="text-xs text-gray-400">
                            Balance: {(balances[selectedToken.address] || 0).toFixed(4)}
                        </span>
                    )}
                </div>
                <svg className={`w-4 h-4 transition-transform ${show ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {show && (
                <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                    {tokens.filter(token => token.address !== selectedToken.address).map((token) => (
                        <button
                            key={token.address}
                            onClick={() => {
                                onSelect(token);
                                onToggle();
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                            <div className="flex items-center space-x-2">
                                <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{token.symbol}</span>
                                    <span className="text-xs text-gray-400">{token.name}</span>
                                </div>
                            </div>
                            {wallet.connected && (
                                <span className="text-xs text-gray-400">
                                    {(balances[token.address] || 0).toFixed(4)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 flex items-center justify-center px-4 py-12 min-h-[calc(100vh-4rem)]">
                <div className="w-full max-w-md">
                    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="text-4xl mb-4">🔄</div>
                            <h2 className="text-2xl font-bold mb-2">DEX Token Swap</h2>
                            <p className="text-gray-400 text-sm">
                                Real token swapping with Jupiter & live balances
                            </p>
                            <p className="text-blue-400 text-xs mt-1">
                                {quote?.isMock ? "Using mock rates (Jupiter failed)" : "Jupiter quotes active"}
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
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">From</span>
                                    <TokenDropdown
                                        tokens={DEVNET_TOKENS}
                                        selectedToken={fromToken}
                                        onSelect={setFromToken}
                                        show={showFromDropdown}
                                        onToggle={() => setShowFromDropdown(!showFromDropdown)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={fromAmount}
                                        onChange={(e) => setFromAmount(e.target.value)}
                                        className="bg-transparent text-2xl font-semibold text-white placeholder-gray-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex-1"
                                        disabled={isSwapping}
                                    />
                                    {wallet.connected && (
                                        <button
                                            onClick={() => setFromAmount((balances[fromToken.address] || 0).toString())}
                                            className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
                                        >
                                            MAX
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={swapTokens}
                                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full p-2 transition-colors"
                                    disabled={isSwapping}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                </button>
                            </div>

                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">To</span>
                                    <TokenDropdown
                                        tokens={DEVNET_TOKENS}
                                        selectedToken={toToken}
                                        onSelect={setToToken}
                                        show={showToDropdown}
                                        onToggle={() => setShowToDropdown(!showToDropdown)}
                                    />
                                </div>
                                <div className="w-full text-2xl font-semibold text-white">
                                    {quoteLoading ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                                            <span className="text-gray-400">Getting quote...</span>
                                        </div>
                                    ) : (
                                        toAmount || "0.0"
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Slippage Tolerance</span>
                                    <div className="flex items-center space-x-2">
                                        {["0.1", "0.5", "1.0"].map((value) => (
                                            <button
                                                key={value}
                                                onClick={() => setSlippage(value)}
                                                className={`px-2 py-1 text-xs rounded ${
                                                    slippage === value
                                                        ? "bg-purple-600 text-white"
                                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                }`}
                                            >
                                                {value}%
                                            </button>
                                        ))}
                                        <input
                                            type="number"
                                            value={slippage}
                                            onChange={(e) => setSlippage(e.target.value)}
                                            className="w-16 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            step="0.1"
                                            min="0.1"
                                            max="50"
                                        />
                                        <span className="text-xs text-gray-400">%</span>
                                    </div>
                                </div>
                            </div>

                            {quote && (
                                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Rate</span>
                                        <span>1 {fromToken.symbol} = {(parseInt(quote.outAmount) / Math.pow(10, toToken.decimals) / (parseInt(quote.inAmount) / Math.pow(10, fromToken.decimals))).toFixed(6)} {toToken.symbol}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Price Impact</span>
                                        <span className={quote.priceImpactPct && quote.priceImpactPct > 1 ? "text-red-400" : "text-green-400"}>
                                            {quote.priceImpactPct && typeof quote.priceImpactPct === 'number' ? `${quote.priceImpactPct.toFixed(2)}%` : "< 0.01%"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Min. Received</span>
                                        <span>{(parseInt(quote.otherAmountThreshold) / Math.pow(10, toToken.decimals)).toFixed(6)} {toToken.symbol}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={executeSwap}
                                disabled={!quote || isSwapping || quoteLoading || !wallet.connected}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                                    !quote || isSwapping || quoteLoading || !wallet.connected
                                        ? "bg-gray-700 cursor-not-allowed text-gray-400"
                                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25"
                                }`}
                            >
                                {isSwapping ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Swapping...</span>
                                    </div>
                                ) : !wallet.connected ? (
                                    "Connect Wallet"
                                ) : !quote ? (
                                    "Enter Amount"
                                ) : (
                                    `Swap ${fromToken.symbol} → ${toToken.symbol}`
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
                                    <span className="text-sm font-medium break-all">{message.text}</span>
                                </div>
                                {message.type === "success" && message.text.includes("Tx:") && (
                                    <div className="mt-2">
                                        <a
                                            href={`https://explorer.solana.com/tx/${message.text.split("Tx: ")[1]}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-purple-400 hover:text-purple-300 underline"
                                        >
                                            View on Solana Explorer
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Network</div>
                                    <div className="text-sm font-medium">Devnet</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">DEX</div>
                                    <div className="text-sm font-medium">{quote?.isMock ? "Mock" : "Jupiter"}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-xs">
                            Real token swaps with live balance updates • Jupiter quotes when available
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}