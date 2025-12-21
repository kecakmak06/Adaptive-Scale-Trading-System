import { NextResponse } from "next/server"
import { alpacaClient } from "@/lib/alpaca-client"

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params
    try {
        await alpacaClient.closePosition(symbol)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error(`Error closing position for ${symbol}:`, error);
        // Extract inner message if available (Alpaca errors often have a message property)
        const errorMessage = error?.response?.data?.message || error.message || "Failed to close position";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
