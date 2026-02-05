import { NextRequest, NextResponse } from "next/server";
import { alpacaClient } from "@/lib/alpaca-client";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
        return NextResponse.json({ error: "Symbols are required (comma separated)" }, { status: 400 });
    }

    const symbols = symbolsParam.split(",").map(s => s.trim());

    try {
        if (!process.env.NEXT_PUBLIC_ALPACA_API_KEY || !process.env.NEXT_PUBLIC_ALPACA_API_SECRET) {
            console.error("Alpaca credentials missing in environment variables");
            throw new Error("Missing Alpaca credentials");
        }

        const snapshots = await alpacaClient.getSnapshots(symbols);

        return NextResponse.json(snapshots);
    } catch (error: any) {
        console.error("Snapshots API Error:", error.message || error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch market data" },
            { status: 500 }
        );
    }
}
