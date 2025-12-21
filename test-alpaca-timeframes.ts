import { alpacaClient } from "./lib/alpaca-client"

async function test() {
  console.log("Testing 1Week...")
  try {
    const bars = await alpacaClient.getBars("AAPL", "1Week", 5)
    console.log("1Week Bars:", bars.length)
  } catch (e: any) { console.log("1Week Failed:", e.message) }

  console.log("Testing 1Month...")
  try {
    const bars = await alpacaClient.getBars("AAPL", "1Month", 5)
    console.log("1Month Bars:", bars.length)
  } catch (e: any) { console.log("1Month Failed:", e.message) }

  console.log("Testing 12Month...")
  try {
    const bars = await alpacaClient.getBars("AAPL", "12Month", 5)
    console.log("12Month Bars:", bars.length)
  } catch (e: any) { console.log("12Month Failed:", e.message) }
}

test()
