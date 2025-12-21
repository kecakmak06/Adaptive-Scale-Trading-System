
import { alpacaClient } from "./lib/alpaca-client"

async function test() {
    console.log("Testing getBars for AAPL without explicit start...")
    try {
        const bars = await alpacaClient.getBars("AAPL", "1Day", 10)
        console.log("Bars returned:", bars.length)
        if (bars.length > 0) {
            console.log("First:", bars[0].t)
            console.log("Last:", bars[bars.length - 1].t)
        }
    } catch (e: any) {
        console.log("Error:", e.message)
    }
}

test()
