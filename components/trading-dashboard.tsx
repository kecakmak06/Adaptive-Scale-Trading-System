"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity, Clock, Search, Wallet, RotateCcw, Info } from "lucide-react"
import { PriceChart } from "./price-chart"
import { PositionsPanel } from "./positions-panel"
import { QuickTrade } from "./quick-trade"
import { AccountSummary } from "./account-summary"
import { OrdersList } from "./orders-list"
import { HistoryList } from "./history-list"
import { ScalarTrading } from "./scalar-trading"
import { WelcomeModal } from "./welcome-modal"
import { useSimulatedExchange } from "@/hooks/use-simulated-exchange"

const WATCHLIST_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]


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
  const [isMarketOpen, setIsMarketOpen] = useState(true)
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false)

  // Simulation Hook
  const { account, positions: simPositions, orders: simOrders, history, placeOrder, cancelOrder, resetAccount, clearHistory, processTick } = useSimulatedExchange()

  // Adapters for UI
  const positions = simPositions.map(p => ({
    symbol: p.symbol,
    qty: p.qty.toString(),
    avg_entry_price: p.avgEntryPrice.toString(),
    current_price: p.currentPrice.toString(),
    unrealized_pl: p.unrealizedPl.toString(),
    unrealized_plpc: p.avgEntryPrice && p.qty ? (p.unrealizedPl / (p.qty * p.avgEntryPrice)).toString() : '0',
    market_value: (p.qty * p.currentPrice).toString(),
    side: p.qty >= 0 ? 'long' : 'short' as 'long' | 'short'
  }));

  const orders = simOrders.map(o => ({
    id: o.id,
    client_order_id: o.clientOrderId || '',
    created_at: new Date(o.createdAt).toISOString(),
    submitted_at: new Date(o.createdAt).toISOString(),
    updated_at: new Date(o.createdAt).toISOString(),
    filled_at: o.status === 'filled' ? new Date().toISOString() : "2024-01-01T00:00:00Z", // Dummy date for non-filled if type is strict
    expired_at: "",
    canceled_at: "",
    failed_at: "",
    replaced_at: "",
    replaced_by: null,
    asset_id: "",
    symbol: o.symbol,
    qty: o.qty.toString(),
    filled_qty: o.status === 'filled' ? o.qty.toString() : '0',
    type: o.type,
    side: o.side,
    time_in_force: 'day',
    limit_price: o.limitPrice ? o.limitPrice.toString() : null,
    filled_avg_price: o.filledAvgPrice ? o.filledAvgPrice.toString() : null,
    status: o.status,
    extended_hours: false,
    legs: null,
    trail_percent: null,
    trail_price: null,
    hwm: null,
    asset_class: 'us_equity',
    notional: null,
    order_class: 'simple',
    order_type: o.type,
    stop_price: null
  }));

  const isLoadingPositions = false;
  const isLoadingOrders = false;

  // Tick Processor
  useEffect(() => {
    if (currentSnapshot?.LatestTrade?.Price && selectedSymbol) {
      processTick(selectedSymbol, currentSnapshot.LatestTrade.Price);
    } else if (currentSnapshot?.DailyBar?.ClosePrice && selectedSymbol) {
      // Fallback to close price if no trade
      processTick(selectedSymbol, currentSnapshot.DailyBar.ClosePrice);
    }
  }, [currentSnapshot, selectedSymbol]);

  // Derived State for UI compatibility
  const [watchlist, setWatchlist] = useState<any[]>([])

  const [ordersFilter, setOrdersFilter] = useState("all")
  const [scalarLevels, setScalarLevels] = useState<{ top: string, bottom: string } | null>(null)

  // Fetch Watchlist (Keep using API for Data)
  const fetchWatchlist = async () => {
    try {
      const symbols = WATCHLIST_SYMBOLS.join(",")
      const res = await fetch(`/api/alpaca/snapshots?symbols=${symbols}`)
      if (res.ok) {
        const data = await res.json() // Map of symbol -> snapshot

        const formattedWatchlist = WATCHLIST_SYMBOLS.map(sym => {
          const snap = data[sym]
          if (!snap) return { symbol: sym, price: 0, change: 0, changePercent: 0 }

          const price = snap.DailyBar?.ClosePrice || snap.LatestTrade?.Price || 0
          const prevPrice = snap.PrevDailyBar?.ClosePrice || price
          const change = price - prevPrice
          const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0

          // Sync with Simulation Exchange to allow market orders to fill instantly
          processTick(sym, price);

          return {
            symbol: sym,
            price,
            change,
            changePercent
          }
        })
        setWatchlist(formattedWatchlist)
      }
    } catch (e) {
      console.error("Failed to fetch watchlist", e)
    }
  }

  useEffect(() => {
    fetchWatchlist()
    const interval = setInterval(fetchWatchlist, 5000)
    return () => clearInterval(interval)
  }, [])

  // Handlers for Simulation
  const handleOrderCreated = async (newOrder: any) => {
    // ScalarTrading calls this, but sim logic is instantaneous.
    // We just need to ensure the UI refreshes (which it does via hook state)
  }

  const handleCancelOrder = async (orderId: string) => {
    cancelOrder(orderId);
  }

  const handleClosePosition = async (position: any) => {
    // 1. Cancel ONLY exit orders (take profits) for this symbol.
    // We leave the entry grid (scalar_ entries) alone as requested.
    const exitOrders = simOrders.filter(o =>
      o.symbol === position.symbol &&
      o.status === 'open' &&
      o.clientOrderId?.startsWith('scalar_exit_')
    );

    for (const order of exitOrders) {
      cancelOrder(order.id);
    }

    // 2. Create a MARKET SELL order for the full qty
    try {
      placeOrder({
        symbol: position.symbol,
        qty: Math.abs(parseFloat(position.qty)),
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market'
      })
    } catch (e) {
      console.error("Failed to close position", e)
    }
  }

  const handleResetWallet = () => {
    const amount = prompt("Enter new starting balance:", "100000");
    if (amount) {
      resetAccount(parseFloat(amount));
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

  // Fetch Market Status
  useEffect(() => {
    async function fetchMarketStatus() {
      try {
        const res = await fetch("/api/alpaca/market-status")
        if (res.ok) {
          const data = await res.json()
          setIsMarketOpen(data.isOpen)
        }
      } catch (e) {
        console.error("Failed to fetch market status", e)
      }
    }
    fetchMarketStatus()
    const intervalId = setInterval(fetchMarketStatus, 60000) // Poll every minute
    return () => clearInterval(intervalId)
  }, [])

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


  const resolvedPrice = currentSnapshot?.LatestTrade?.Price ||
    currentSnapshot?.DailyBar?.ClosePrice ||
    currentSnapshot?.PrevDailyBar?.ClosePrice ||
    0;

  // Auto-show welcome modal on first visit
  useEffect(() => {
    const hasSeen = localStorage.getItem("sc_has_seen_welcome")
    if (!hasSeen) {
      setIsWelcomeOpen(true)
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/scaletradex-logo.png" alt="ScaleTradeX Logo" className="h-8 w-auto invert dark:invert-0" />
            <h1 className="text-xl font-extrabold tracking-tight">ScaleTradeX</h1>
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
          <Badge
            variant="outline"
            className={isMarketOpen
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
            }
          >
            <Clock className="h-3 w-3 mr-1" />
            {isMarketOpen ? "LIVE MARKET" : "MARKET CLOSED"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsWelcomeOpen(true)}
            title="Help & Tutorial"
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Account Summary Strip */}
      <div className="border-b border-border bg-background/50 p-4 relative">
        <AccountSummary account={account} />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          onClick={handleResetWallet}
          title="Reset Wallet"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Watchlist */}
        <aside className="w-64 border-r border-border bg-card p-3 overflow-y-auto hidden md:block">
          <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Watchlist</h2>
          <div className="space-y-1">
            {watchlist.map((stock) => (
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

                {(() => {
                  const prevClose = currentSnapshot?.PrevDailyBar?.ClosePrice || resolvedPrice;
                  const change = resolvedPrice - prevClose;
                  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

                  return (
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-3xl font-mono font-semibold">
                        ${resolvedPrice.toFixed(2)}
                      </span>
                      <Badge className={`bg-primary/10 border-primary/20 ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {changePercent.toFixed(2)}%
                      </Badge>
                    </div>
                  );
                })()}
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
              currentPrice={resolvedPrice}
              symbol={selectedSymbol}
              exchange="NASDAQ"
              orders={orders.filter(o =>
                o.symbol === selectedSymbol &&
                !["canceled", "expired", "rejected", "suspended", "replaced", "filled"].includes(o.status)
              )}
              position={positions.find(p => p.symbol === selectedSymbol)}
              scalarLevels={scalarLevels}
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
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  History
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
                  orders={orders.filter(o => {
                    if (ordersFilter === 'all') return true;
                    if (ordersFilter === 'open') return ['new', 'accepted', 'calculated', 'partially_filled', 'open'].includes(o.status);
                    if (ordersFilter === 'closed') return ['filled', 'canceled', 'expired', 'rejected'].includes(o.status);
                    return true;
                  })}
                  isLoading={isLoadingOrders}
                  onCancelOrder={handleCancelOrder}
                  filter={ordersFilter}
                  setFilter={setOrdersFilter}
                />
              </TabsContent>

              <TabsContent value="history" className="m-0 p-4">
                <HistoryList
                  activities={history.filter(h => h.pnl !== undefined)}
                  isLoading={false}
                  onClear={() => {
                    clearHistory()
                  }}
                />
              </TabsContent>


            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Order Entry & Order Book */}
        <aside className="w-80 border-l border-border bg-card flex flex-col">
          <div className="border-b border-border bg-card">
            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="w-full grid grid-cols-2 rounded-none h-11 p-0 bg-transparent">
                <TabsTrigger
                  value="quick"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-secondary/50 h-full"
                >
                  Quick
                </TabsTrigger>
                <TabsTrigger
                  value="scalar"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-secondary/50 h-full"
                >
                  Scale
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="p-4 m-0">
                <QuickTrade
                  symbol={selectedSymbol}
                  currentPrice={resolvedPrice || 0}
                  onOrderCreated={handleOrderCreated}
                />
              </TabsContent>

              <TabsContent value="scalar" className="p-4 m-0 animate-in fade-in-50">
                <ScalarTrading
                  symbol={selectedSymbol}
                  currentPrice={resolvedPrice || 0}
                  orders={orders}
                  positions={positions}
                  onOrderCreated={handleOrderCreated}
                  onLevelsChange={setScalarLevels}
                  onHistoryUpdate={() => { }}
                />
              </TabsContent>
            </Tabs>
          </div>


        </aside>
      </div >
      <WelcomeModal open={isWelcomeOpen} onOpenChange={setIsWelcomeOpen} />
    </div >
  )
}
