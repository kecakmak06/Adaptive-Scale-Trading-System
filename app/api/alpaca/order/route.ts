
import { NextRequest, NextResponse } from "next/server"
import { alpacaClient } from "@/lib/alpaca-client"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { symbol, quantity, side, orderType, limitPrice } = body

        // Map scalar to market for now, or handle appropriately
        // Supported types: market, limit

        if (!symbol || !quantity || !side) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const type = orderType === 'limit' ? 'limit' : 'market';

        const order = await alpacaClient.submitOrder({
            symbol,
            qty: Number(quantity),
            side: side.toLowerCase() as "buy" | "sell",
            type: type,
            limitPrice: type === 'limit' ? Number(limitPrice) : undefined
        });

        return NextResponse.json(order)
    } catch (error: any) {
        console.error("Order submission error:", error)
        if (error.response) {
            console.error("Alpaca Error Data:", JSON.stringify(error.response.data))
        }
        const status = error.response?.status || 500
        const message = error.response?.data?.message || error.message || "Failed to submit order"
        return NextResponse.json({ error: message }, { status })
    }
}
