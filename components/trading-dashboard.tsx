"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity, Clock, Search } from "lucide-react"
import { PriceChart } from "./price-chart"
import { OrderBook } from "./order-book"
import { PositionsPanel } from "./positions-panel"
import { QuickTrade } from "./quick-trade"
import { AccountSummary } from "./account-summary"
import { OrdersList } from "./orders-list"

const watchlistData = [
  { symbol: "AAPL", change: 0.5, price: 150.00, changePercent: 0.33 },
  { symbol: "GOOGL", change: -0.2, price: 2800.00, changePercent: -0.01 },
  { symbol: "MSFT", change: 1.2, price: 300.00, changePercent: 0.4 },
  { symbol: "AMZN", change: -0.5, price: 3400.00, changePercent: -0.01 },
  { symbol: "TSLA", change: 2.1, price: 700.00, changePercent: 0.3 },
]

export function TradingDashboard() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL")
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Day")
  const [searchQuery, setSearchQuery] = useState("")
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  const [currentSnapshot, setCurrentSnapshot] = useState<any>(null)
  const [assetInfo, setAssetInfo] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Lifted state for optimal responsiveness
  const [positions, setPositions] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [isLoadingPositions, setIsLoadingPositions] = useState(true)
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [ordersFilter, setOrdersFilter] = useState("all")

  // Fetch Positions
  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/alpaca/positions")
      if (res.ok) {
        const data = await res.json()
        setPositions(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingPositions(false)
    }
  }

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/alpaca/orders?status=${ordersFilter}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchPositions()
    const interval = setInterval(fetchPositions, 2000) // Poll frequently
    return () => clearInterval(interval)
  }, [refreshKey])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 2000) // Poll frequently
    return () => clearInterval(interval)
  }, [refreshKey, ordersFilter])

  const refreshData = () => {
    fetchPositions()
    fetchOrders()
    setRefreshKey(prev => prev + 1)
  }

  // Handlers for optimistic updates
  const handleOrderCreated = async (newOrder: any) => {
    // Optimistic add
    setOrders(prev => [newOrder, ...prev])

    // Rapid re-fetch sequence to catch fills
    setTimeout(refreshData, 500)
    setTimeout(refreshData, 1000)
    setTimeout(refreshData, 2000)
  }

  const handleCancelOrder = async (orderId: string) => {
    // Optimistic remove
    const prevOrders = [...orders]
    setOrders(prev => prev.filter(o => o.id !== orderId))

    try {
      const res = await fetch(`/api/alpaca/orders/${orderId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to cancel")
    } catch (e) {
      console.error("Failed to cancel", e)
      // Rollback
      setOrders(prevOrders)
    }
  }

  const handleClosePosition = async (symbol: string) => {
    // Optimistic remove
    const prevPositions = [...positions]
    setPositions(prev => prev.filter(p => p.symbol !== symbol))

    try {
      const res = await fetch(`/api/alpaca/positions/${symbol}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to close position")
      }
    } catch (e: any) {
      console.error("Failed to close position", e)
      alert(`Error: ${e.message}`)
      // Rollback
      setPositions(prevPositions)
    }
  }

  // Fetch Snapshot
  useEffect(() => {
    async function fetchSnapshot() {
      if (!selectedSymbol) return
      try {
        const res = await fetch(`/api/alpaca/snapshot?symbol=${selectedSymbol}`)
        if (res.ok) {
          const data = await res.json()
          setCurrentSnapshot(data.snapshot)
          setAssetInfo(data.asset)
        }
      } catch (error) {
        console.error("Failed to fetch snapshot", error)
      }
    }
    fetchSnapshot()
    const intervalId = setInterval(fetchSnapshot, 5000)
    return () => clearInterval(intervalId)
  }, [selectedSymbol])

  // Fetch Chart Data
  useEffect(() => {
    async function fetchChartData() {
      if (!selectedSymbol) return
      setIsLoadingChart(true)
      try {
        let apiTimeframe = selectedTimeframe
        if (selectedTimeframe === "Day") apiTimeframe = "1Day"
        if (selectedTimeframe === "Week") apiTimeframe = "1Week"
        if (selectedTimeframe === "Month") apiTimeframe = "1Month"
        if (selectedTimeframe === "Year") apiTimeframe = "12Month"

        const res = await fetch(`/api/alpaca/bars?symbol=${selectedSymbol}&timeframe=${apiTimeframe}&limit=100`)
        if (res.ok) {
          const data = await res.json()
          setChartData(data)
        }
      } catch (error) {
        console.error("Failed to fetch chart data", error)
      } finally {
        setIsLoadingChart(false)
      }
    }
    fetchChartData()
  }, [selectedSymbol, selectedTimeframe])



  return (
    <div className="h-full w-full flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold font-mono">SCALPX</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              className="pl-9 w-64 h-9 bg-secondary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Clock className="h-3 w-3 mr-1" />
            LIVE MARKET
          </Badge>
        </div>
      </header>

      {/* Account Summary Strip */}
      <div className="border-b border-border bg-background/50 p-4">
        <AccountSummary />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Watchlist */}
        <aside className="w-64 border-r border-border bg-card p-3 overflow-y-auto hidden md:block">
          <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Watchlist</h2>
          <div className="space-y-1">
            {watchlistData.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => setSelectedSymbol(stock.symbol)}
                className={`w-full p-2.5 rounded-md text-left transition-colors ${selectedSymbol === stock.symbol ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary"
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold font-mono">{stock.symbol}</span>
                  {stock.change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">${(stock.price || 0).toFixed(2)}</span>
                  <span className={`text-xs font-mono ${(stock.change || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {(stock.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Center - Chart & Order Book */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Price Header */}
          <div className="border-b border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-mono">{selectedSymbol}</h2>
                {assetInfo && <div className="text-xs text-muted-foreground">{assetInfo.Name || assetInfo.name} ({assetInfo.Exchange || assetInfo.exchange})</div>}
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-3xl font-mono font-semibold">
                    ${currentSnapshot?.PrevDailyBar?.ClosePrice?.toFixed(2) || currentSnapshot?.DailyBar?.ClosePrice?.toFixed(2) || "0.00"}
                  </span>
                  <Badge className={`bg-primary/10 border-primary/20 ${(currentSnapshot?.DailyBar?.ClosePrice - currentSnapshot?.PrevDailyBar?.ClosePrice) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                    {(currentSnapshot?.DailyBar?.ClosePrice - currentSnapshot?.PrevDailyBar?.ClosePrice) >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {currentSnapshot?.PrevDailyBar?.ClosePrice ? (((currentSnapshot.DailyBar.ClosePrice - currentSnapshot.PrevDailyBar.ClosePrice) / currentSnapshot.PrevDailyBar.ClosePrice) * 100).toFixed(2) : "0.00"}%
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {["1Min", "5Min", "15Min", "1Hour", "Day", "Week", "Month", "Year"].map(tf => (
                  <Button
                    key={tf}
                    variant={selectedTimeframe === tf ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeframe(tf)}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 bg-background p-4 min-h-[400px]">
            <PriceChart
              data={chartData}
              isLoading={isLoadingChart}
              timeframe={selectedTimeframe}
              currentPrice={currentSnapshot?.DailyBar?.ClosePrice || currentSnapshot?.LatestTrade?.Price}
              symbol={selectedSymbol}
              exchange="NASDAQ"
            />
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-border bg-card min-h-[300px]">
            <Tabs defaultValue="positions" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 px-4">
                <TabsTrigger
                  value="positions"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Positions
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Orders
                </TabsTrigger>
              </TabsList>
              <TabsContent value="positions" className="m-0 p-4">
                <PositionsPanel
                  positions={positions}
                  isLoading={isLoadingPositions}
                  onClosePosition={handleClosePosition}
                />
              </TabsContent>

              <TabsContent value="orders" className="m-0 p-4">
                <OrdersList
                  orders={orders}
                  isLoading={isLoadingOrders}
                  onCancelOrder={handleCancelOrder}
                  filter={ordersFilter}
                  setFilter={setOrdersFilter}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Order Entry & Order Book */}
        <aside className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <QuickTrade
              symbol={selectedSymbol}
              currentPrice={currentSnapshot?.PrevDailyBar?.ClosePrice || 0}
              onOrderCreated={handleOrderCreated}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <OrderBook />
          </div>
        </aside>
      </div >
    </div >
  )
}
