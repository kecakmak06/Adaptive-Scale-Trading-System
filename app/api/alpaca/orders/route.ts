
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
