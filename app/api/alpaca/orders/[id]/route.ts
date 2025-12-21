
import { NextRequest, NextResponse } from "next/server"
import { alpacaClient } from "@/lib/alpaca-client"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await alpacaClient.cancelOrder(id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to cancel order" }, { status: 500 })
    }
}
