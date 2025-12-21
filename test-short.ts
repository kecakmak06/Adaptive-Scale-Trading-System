import { alpacaClient } from "./lib/alpaca-client";

async function testShort() {
    try {
        console.log("Submitting query with side='sell' (lowercase)...");
        // Use a symbol we surely don't own or have enough of
        const order = await alpacaClient.submitOrder({
            symbol: "SNAP",
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

testShort();
