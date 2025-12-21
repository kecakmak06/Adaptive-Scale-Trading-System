
import { NextRequest, NextResponse } from "next/server";
import { alpacaClient } from "@/lib/alpaca-client";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const timeframe = searchParams.get("timeframe") || "1Day";
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!symbol) {
        return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    try {
        const bars = await alpacaClient.getBars(symbol, timeframe, limit);
        return NextResponse.json(bars);
    } catch (error: any) {
        console.error("Bars API Error:", error.message || error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch market data" },
            { status: 500 }
        );
    }
}
