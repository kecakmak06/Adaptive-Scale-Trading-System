import { NextRequest, NextResponse } from "next/server"
import { alpacaClient } from "@/lib/alpaca-client"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        // Default to FILL which is trade history
        const types = searchParams.get("activity_types") || "FILL"

        // Split by comma if multiple
        const typeArg = types.includes(",") ? types.split(",") : types

        const limit = parseInt(searchParams.get("limit") || "50", 10)

        const activities = await alpacaClient.getAccountActivities(typeArg, limit)
        return NextResponse.json(activities)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch activities" }, { status: 500 })
    }
}
