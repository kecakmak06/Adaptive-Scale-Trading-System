
import { NextResponse } from "next/server";
import { alpacaClient } from "@/lib/alpaca-client";

export async function GET() {
    try {
        const account = await alpacaClient.getAccount();
        return NextResponse.json(account);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch account data" },
            { status: 500 }
        );
    }
}
