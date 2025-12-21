
import { NextRequest, NextResponse } from "next/server";
import { alpacaClient } from "@/lib/alpaca-client";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");

    if (!symbol) {
        return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    try {
        const [snapshot, asset] = await Promise.all([
            alpacaClient.getSnapshot(symbol),
            alpacaClient.getAsset(symbol)
        ]);

        return NextResponse.json({
            snapshot,
            asset
        });
    } catch (error: any) {
        console.error("Snapshot API Error:", error.message || error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch market data" },
            { status: 500 }
        );
    }
}
