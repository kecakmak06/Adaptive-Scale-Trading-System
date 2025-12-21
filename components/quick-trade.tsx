"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface QuickTradeProps {
  symbol: string
  currentPrice: number
  onOrderCreated?: (order: any) => void
}

export function QuickTrade({ symbol, currentPrice, onOrderCreated }: QuickTradeProps) {
  const [quantity, setQuantity] = useState("10")
  const [orderType, setOrderType] = useState<"market" | "limit" | "scalar">("market")
  const [limitPrice, setLimitPrice] = useState(currentPrice.toString())
  const [scalarRange, setScalarRange] = useState({ lower: (currentPrice * 0.9).toFixed(2), upper: (currentPrice * 1.1).toFixed(2) })
  const [position, setPosition] = useState<{ qty: number } | null>(null)
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true)

  const { toast } = useToast()

  // Check Market Status
  useEffect(() => {
    async function checkMarketStatus() {
      try {
        const res = await fetch("/api/alpaca/market-status")
        if (res.ok) {
          const data = await res.json()
          setIsMarketOpen(data.isOpen)
        }
      } catch (e) {
        console.error("Failed to check market status", e)
      }
    }
    checkMarketStatus()
  }, [])

  // Initial limit price update when price changes, mostly for UX
  useEffect(() => {
    if (Math.abs(Number(limitPrice) - currentPrice) / currentPrice > 0.5) {
      setLimitPrice(currentPrice.toFixed(2))
    }
  }, [currentPrice])


  // Check if we hold this position to show "Buy to Cover" vs "Buy" logic
  useEffect(() => {
    async function checkPosition() {
      try {
        const res = await fetch("/api/alpaca/positions")
        if (res.ok) {
          const positions = await res.json()
          const pos = positions.find((p: any) => p.symbol === symbol)
          if (pos) {
            setPosition({ qty: Number(pos.qty) })
          } else {
            setPosition(null)
          }
        }
      } catch (e) { }
    }
    checkPosition()
  }, [symbol, onOrderCreated]) // Re-check on success

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/alpaca/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          quantity: Number(quantity),
          side: side.toLowerCase(),
          orderType: orderType === "scalar" ? "market" : orderType,
          limitPrice: orderType === "limit" ? Number(limitPrice) : undefined,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: "Order Submitted",
          description: `${side.toUpperCase()} order for ${quantity} ${symbol} submitted.`,
          variant: "default",
        })
        if (onOrderCreated) onOrderCreated(data)
      } else {
        const errorMsg = data.error || "Failed to submit order"
        // Show the actual error message for debugging purposes, instead of generic text
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error("Order error:", error)
      toast({
        title: "Order Failed",
        description: error.message || "Could not place order.",
        variant: "destructive",
      })
    }
  }

  // Derived wording
  const currentQty = position?.qty || 0
  const isShortPosition = currentQty < 0
  const isLongPosition = currentQty > 0

  let buyButtonText = "BUY"
  let sellButtonText = "SELL"

  if (isShortPosition) {
    buyButtonText = "BUY TO COVER"
  }
  if (currentQty === 0) {
    sellButtonText = "SHORT SELL"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Trade {symbol}</h3>
        {currentQty !== 0 && (
          <span className={`text-xs font-mono px-2 py-1 rounded ${currentQty > 0 ? "bg-green-500/20 text-green-500" : "bg-purple-500/20 text-purple-500"}`}>
            {currentQty > 0 ? `LONG: ${currentQty}` : `SHORT: ${currentQty}`}
          </span>
        )}
      </div>

      <div className="flex space-x-1 bg-secondary/30 p-1 rounded-lg">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${side === "buy" ? "bg-green-500 text-white shadow-sm" : "hover:bg-secondary/50 text-muted-foreground"}`}
        >
          {buyButtonText}
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${side === "sell" ? "bg-red-500 text-white shadow-sm" : "hover:bg-secondary/50 text-muted-foreground"}`}
        >
          {sellButtonText}
        </button>
      </div>

      <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit" | "scalar")}>
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
          <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
          {/* Scalar removed or kept? Keeping it as it was there before but maybe less used now. */}
          <TabsTrigger value="scalar" className="text-xs">Scalar</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="quantity" className="text-xs">Quantity</Label>
            </div>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="font-mono h-9 bg-secondary"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Market Price</span>
            <span className="font-mono font-semibold text-foreground">${currentPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Est. Total</span>
            <span className="font-mono font-semibold">${(currentPrice * Number(quantity)).toFixed(2)}</span>
          </div>
        </TabsContent>

        <TabsContent value="limit" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="limit-quantity" className="text-xs">Quantity</Label>
            <Input
              id="limit-quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="font-mono h-9 bg-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limit-price" className="text-xs">Limit Price</Label>
            <Input
              id="limit-price"
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="font-mono h-9 bg-secondary"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Est. Total</span>
            <span className="font-mono font-semibold">${(Number(limitPrice) * Number(quantity)).toFixed(2)}</span>
          </div>
        </TabsContent>
      </Tabs>

      <Button
        onClick={handleSubmit}
        className={`w-full font-bold h-11 text-white ${side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
      >
        {side === "buy" ? buyButtonText : sellButtonText}
      </Button>

      {!isMarketOpen && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-bold">Market Closed</AlertTitle>
          <AlertDescription className="text-xs">
            Order will be queued for aftermarket/next open.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
