"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

interface Position {
  symbol: string
  qty: string
  avg_entry_price: string
  current_price: string
  unrealized_pl: string
  unrealized_plpc: string
  market_value: string
  side: "long" | "short"
}

interface PositionsPanelProps {
  positions: Position[]
  isLoading?: boolean
  onClosePosition: (position: Position) => Promise<void>
}

export function PositionsPanel({ positions, isLoading, onClosePosition }: PositionsPanelProps) {
  if (isLoading && positions.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">Loading positions...</div>
  }

  return (
    <div className="overflow-x-auto">
      {positions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">No open positions</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2 pl-2">
                Symbol
              </th>
              <th className="text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2">
                Side
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2">
                Qty
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2">
                Avg Price
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2">
                Mark
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2">
                Mkt Value
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2">
                P&L
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2 pr-2">
                P&L %
              </th>
              <th className="text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide pb-2 pr-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const qty = Number(position.qty)
              const avgPrice = Number(position.avg_entry_price)
              const currentPrice = Number(position.current_price)
              const pnl = Number(position.unrealized_pl)
              const pnlPercent = Number(position.unrealized_plpc) * 100
              const marketValue = Number(position.market_value)
              const isLong = qty > 0
              const side = isLong ? "LONG" : "SHORT"

              return (
                <tr key={position.symbol} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 pl-2 font-semibold font-mono">{position.symbol}</td>
                  <td className="py-3 text-center">
                    <Badge variant="outline" className={`text-[10px] h-5 ${isLong ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-purple-400 border-purple-400/30 bg-purple-400/10"}`}>
                      {side}
                    </Badge>
                  </td>
                  <td className="py-3 text-right font-mono">
                    {Math.abs(qty)}
                  </td>
                  <td className="py-3 text-right font-mono text-muted-foreground">${avgPrice.toFixed(2)}</td>
                  <td className="py-3 text-right font-mono">${currentPrice.toFixed(2)}</td>
                  <td className="py-3 text-right font-mono text-foreground font-medium">${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td
                    className={`py-3 text-right font-mono font-semibold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </td>
                  <td className={`py-3 text-right font-mono pr-2 ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {pnl >= 0 ? "+" : ""}
                    {pnlPercent.toFixed(2)}%
                  </td>
                  <td className="py-3 text-right pr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => onClosePosition(position)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
