"use client"

export function OrderBook() {
  // Mock order book data
  const asks = [
    { price: 178.52, size: 450, total: 450 },
    { price: 178.51, size: 320, total: 770 },
    { price: 178.5, size: 890, total: 1660 },
    { price: 178.49, size: 1200, total: 2860 },
    { price: 178.48, size: 650, total: 3510 },
  ]

  const bids = [
    { price: 178.45, size: 780, total: 780 },
    { price: 178.44, size: 920, total: 1700 },
    { price: 178.43, size: 540, total: 2240 },
    { price: 178.42, size: 1100, total: 3340 },
    { price: 178.41, size: 430, total: 3770 },
  ]

  return (
    <div>
      <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Order Book</h3>

      {/* Asks */}
      <div className="space-y-0.5 mb-4">
        {asks.reverse().map((ask, i) => (
          <div key={i} className="flex items-center justify-between text-xs font-mono relative">
            <div className="absolute inset-0 bg-destructive/5" style={{ width: `${(ask.size / 1200) * 100}%` }} />
            <span className="text-destructive relative z-10">{ask.price.toFixed(2)}</span>
            <span className="text-muted-foreground relative z-10">{ask.size}</span>
            <span className="text-muted-foreground text-[10px] relative z-10">{ask.total}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="py-2 mb-4 border-y border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Spread</span>
          <span className="font-mono font-semibold">0.03</span>
        </div>
      </div>

      {/* Bids */}
      <div className="space-y-0.5">
        {bids.map((bid, i) => (
          <div key={i} className="flex items-center justify-between text-xs font-mono relative">
            <div className="absolute inset-0 bg-primary/5" style={{ width: `${(bid.size / 1200) * 100}%` }} />
            <span className="text-primary relative z-10">{bid.price.toFixed(2)}</span>
            <span className="text-muted-foreground relative z-10">{bid.size}</span>
            <span className="text-muted-foreground text-[10px] relative z-10">{bid.total}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase">
          <div>Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>
      </div>
    </div>
  )
}
