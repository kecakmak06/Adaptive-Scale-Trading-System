
import { NextResponse } from "next/server";
import { alpacaClient } from "@/lib/alpaca-client";

export async function GET() {
    try {
        if (!process.env.NEXT_PUBLIC_ALPACA_API_KEY || !process.env.NEXT_PUBLIC_ALPACA_API_SECRET) {
            console.error("Alpaca credentials missing in environment variables");
            throw new Error("Missing Alpaca credentials");
        }
        const account = await alpacaClient.getAccount();
        return NextResponse.json(account);
    } catch (error: any) {
        console.error("Account API Error:", error.message || error);
        // Log stack trace if available
        if (error.stack) {
            console.error(error.stack);
        }
        return NextResponse.json(
            { error: error.message || "Failed to fetch account data" },
            { status: 500 }
        );
    }
}
