
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function debug() {
    try {
        const { alpacaClient } = await import("./lib/alpaca-client");
        console.log("Testing getSnapshots...");
        const symbols = ["AAPL", "GOOGL", "MSFT"];
        const snapshots = await alpacaClient.getSnapshots(symbols);
        console.log("Type of snapshots:", typeof snapshots);
        console.log("Is Array:", Array.isArray(snapshots));
        // console.log("Full response:", JSON.stringify(snapshots, null, 2));
        if (Array.isArray(snapshots)) {
            console.log("First element:", snapshots[0]);
        } else {
            console.log("Keys:", Object.keys(snapshots));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

debug();
