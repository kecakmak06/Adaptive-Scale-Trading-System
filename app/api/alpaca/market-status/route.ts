
import { NextResponse } from "next/server";
import { alpacaClient } from "@/lib/alpaca-client";

export async function GET() {
    try {
        const isOpen = await alpacaClient.getMarketStatus();
        return NextResponse.json({ isOpen });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to fetch market status" },
            { status: 500 }
        );
    }
}
