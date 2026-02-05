
import { NextRequest, NextResponse } from "next/server"
import { alpacaClient } from "@/lib/alpaca-client"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status") as "open" | "closed" | "all" || "all"
        const limit = Number(searchParams.get("limit")) || 50

        const orders = await alpacaClient.getOrders(status, limit)
        return NextResponse.json(orders)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Basic validation
        if (!body.symbol || !body.qty || !body.side || !body.type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const order = await alpacaClient.submitOrder(body)
        return NextResponse.json(order)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to submit order" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const symbol = searchParams.get("symbol")

        if (symbol) {
            await alpacaClient.cancelOrdersForSymbol(symbol)
            return NextResponse.json({ message: `Canceled all open orders for ${symbol}` })
        }

        // If order_id was passed? (Usually specific route, but we can support query param)
        const orderId = searchParams.get("order_id")
        if (orderId) {
            await alpacaClient.cancelOrder(orderId)
            return NextResponse.json({ message: `Canceled order ${orderId}` })
        }

        return NextResponse.json({ error: "Missing symbol or order_id" }, { status: 400 })

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to cancel orders" }, { status: 500 })
    }
}
