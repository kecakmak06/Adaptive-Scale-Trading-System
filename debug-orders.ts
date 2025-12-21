import { alpacaClient } from "./lib/alpaca-client";

async function listOpenOrders() {
    try {
        console.log("Fetching OPEN orders...");
        const orders = await alpacaClient.getOrders("open");

        if (orders.length === 0) {
            console.log("No open orders found.");
        } else {
            console.log(`Found ${orders.length} open orders:`);
            orders.forEach(o => {
                console.log(`- [${o.id}] ${o.side} ${o.symbol} (Qty: ${o.qty}) - Status: ${o.status}`);
            });
        }
    } catch (e: any) {
        console.error("Error fetching orders:", e);
    }
}

listOpenOrders();
