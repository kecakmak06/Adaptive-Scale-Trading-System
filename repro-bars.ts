import fs from "fs";
import path from "path";

const envLocal = fs.readFileSync(path.resolve(".env.local"), "utf-8");
envLocal.split("\n").forEach(line => {
    const [key, val] = line.split("=");
    if (key && val) process.env[key.trim()] = val.trim();
});

import { alpacaClient } from "./lib/alpaca-client";

async function verify() {
    console.log("Checking 1Min bars...");
    const bars1Min = await alpacaClient.getBars("AAPL", "1Min", 100);
    console.log(`1Min Bars: ${bars1Min.length}`);
    if (bars1Min.length > 0) {
        console.log("First:", bars1Min[0].t, "Last:", bars1Min[bars1Min.length - 1].t);
    }

    console.log("\nChecking 5Min bars...");
    const bars5Min = await alpacaClient.getBars("AAPL", "5Min", 100);
    console.log(`5Min Bars: ${bars5Min.length}`);
    if (bars5Min.length > 0) {
        console.log("First:", bars5Min[0].t, "Last:", bars5Min[bars5Min.length - 1].t);
    }
}

verify().catch(console.error);
