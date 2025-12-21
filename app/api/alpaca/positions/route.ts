
import { NextResponse } from "next/server"
import { alpacaClient } from "@/lib/alpaca-client"

export async function GET() {
    try {
        const positions = await alpacaClient.getPositions()
        return NextResponse.json(positions)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch positions" }, { status: 500 })
    }
}
