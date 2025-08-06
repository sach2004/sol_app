import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppWalletProvider from "./providers/WalletProvider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Solana Token Launcher",
    description: "Create your own SPL tokens on Solana blockchain",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        <AppWalletProvider>
            {children}
        </AppWalletProvider>
        </body>
        </html>
    );
}