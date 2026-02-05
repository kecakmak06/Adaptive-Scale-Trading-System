"use client"

import { TradingDashboard } from "@/components/trading-dashboard"
import { SimulatedExchangeProvider } from "@/hooks/use-simulated-exchange"

export default function Home() {
  return (
    <main className="h-screen w-full bg-background">
      <SimulatedExchangeProvider>
        <TradingDashboard />
      </SimulatedExchangeProvider>
    </main>
  )
}
