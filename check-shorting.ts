import { alpacaClient } from "./lib/alpaca-client";

async function checkAccount() {
    try {
        const account = await alpacaClient.getAccount();
        console.log("Account Status:", account.status);
        console.log("Currency:", account.currency);
        console.log("Buying Power:", account.buying_power);
        console.log("Shorting Enabled?:", (account as any).shorting_enabled); // Check raw field if possible or infer
        console.log("Account Type (usually inferred):", (account as any).pattern_day_trader ? "PDT" : "Normal");

        // Also check an asset
        const asset = await alpacaClient.getAsset("AAPL");
        console.log("AAPL Shortable?:", asset.shortable);
        console.log("AAPL Easy to Borrow?:", asset.easy_to_borrow);
    } catch (e) {
        console.error(e);
    }
}

checkAccount();
