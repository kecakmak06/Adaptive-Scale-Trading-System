import { alpacaClient } from "./lib/alpaca-client";

async function testShortAAPL() {
    try {
        console.log("Submitting sell queries for AAPL...");

        // 1. Check if we have long position
        const positions = await alpacaClient.getPositions();
        const aaplPos = positions.find((p: any) => p.symbol === 'AAPL');
        console.log("Current AAPL Position:", aaplPos);

        // 2. Try to sell/short
        const order = await alpacaClient.submitOrder({
            symbol: "AAPL",
            qty: 1,
            side: "sell",
            type: "market"
        });
        console.log("Success:", order);
    } catch (e: any) {
        console.log("Error Status:", e?.response?.status);
        console.log("Error Data:", JSON.stringify(e?.response?.data));
        console.log("Error Message:", e?.message);
    }
}

testShortAAPL();
