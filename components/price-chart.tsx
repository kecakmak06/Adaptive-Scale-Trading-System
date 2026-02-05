"use client"

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Line
} from "recharts"
import React from 'react'

interface ChartData {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface PriceChartProps {
  data: ChartData[]
  isLoading: boolean
  timeframe: string
  currentPrice?: number
  symbol?: string
  exchange?: string
  orders?: any[]
  position?: any
  scalarLevels?: { top: string, bottom: string } | null
}

const Candlestick = (props: any) => {
  const { x, width, payload, yAxis } = props;

  if (!yAxis || !yAxis.scale) return null;

  const yOpen = yAxis.scale(payload.o);
  const yClose = yAxis.scale(payload.c);
  const yHigh = yAxis.scale(payload.h);
  const yLow = yAxis.scale(payload.l);

  const isGreen = payload.c >= payload.o;
  const color = isGreen ? "#22c55e" : "#ef4444";

  return (
    <g>
      <line x1={x + width / 2} y1={yHigh} x2={x + width / 2} y2={yLow} stroke={color} strokeWidth="1" />
      <rect x={x} y={Math.min(yOpen, yClose)} width={width} height={Math.abs(yOpen - yClose)} fill={color} strokeWidth="0" />
    </g>
  );
};

const CustomCandle = (props: any) => {
  return <Candlestick {...props} />
}

export function PriceChart({ data, isLoading, timeframe, currentPrice, symbol = "AAPL", exchange = "NASDAQ", orders = [], position, scalarLevels }: PriceChartProps) {
  const [activeData, setActiveData] = React.useState<ChartData | null>(null);

  // --- SYNC LOGIC ---
  const effectiveData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Copy data to avoid mutation
    const nextData = [...data];
    const lastIdx = nextData.length - 1;
    const lastCandle = { ...nextData[lastIdx] };

    // Only patch if we have a valid current price
    if (currentPrice !== undefined && currentPrice !== 0 && lastCandle) {
      // Update Close to match current price
      lastCandle.c = currentPrice;

      // Update High/Low so the candle remains valid
      if (currentPrice > lastCandle.h) lastCandle.h = currentPrice;
      if (currentPrice < lastCandle.l) lastCandle.l = currentPrice;

      nextData[lastIdx] = lastCandle;
    }

    return nextData;
  }, [data, currentPrice]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        <div className="animate-pulse">Loading chart data...</div>
      </div>
    )
  }

  if (!effectiveData || effectiveData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        No chart data available
      </div>
    )
  }

  // Use the active data (hovered) or the latest data
  const displayData = activeData || effectiveData[effectiveData.length - 1];
  const isUp = displayData.c >= displayData.o;
  const change = displayData.c - displayData.o;
  const changePercent = (change / displayData.o) * 100;

  const formatXAxis = (str: string) => {
    const date = new Date(str)

    // Intraday
    if (["1Min", "5Min", "15Min", "1Hour"].includes(timeframe)) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Historical Granularity
    if (timeframe === "Day") {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) // e.g., Dec 15
    }
    if (timeframe === "Week") {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) // e.g., Dec 15
    }
    if (timeframe === "Month") {
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) // e.g., Dec 2025
    }
    if (timeframe === "Year") {
      return date.toLocaleDateString(undefined, { year: 'numeric' }) // e.g., 2024
    }

    // Fallback
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  // Determine min/max for domain to not squash candles
  let minPrice = Math.min(...effectiveData.map(d => d.l))
  let maxPrice = Math.max(...effectiveData.map(d => d.h))

  // Validate domain
  if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice === maxPrice) {
    if (currentPrice) {
      minPrice = currentPrice * 0.99;
      maxPrice = currentPrice * 1.01;
    } else {
      // Fallback defaults if data is weird
      minPrice = 0;
      maxPrice = 100;
    }
  }

  const domainPadding = (maxPrice - minPrice) * 0.1 || 1; // Ensure non-zero padding

  return (
    <div className="relative w-full h-full">
      {/* Chart Legend Overlay */}
      <div className="absolute top-2 left-2 z-10 flex flex-col text-xs font-mono select-none pointer-events-none bg-background/50 backdrop-blur-sm p-1 rounded">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-base">{symbol}</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-semibold">{timeframe}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{exchange}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-1">
            <span className="text-muted-foreground">O</span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{displayData.o.toFixed(2)}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-muted-foreground">H</span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{displayData.h.toFixed(2)}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-muted-foreground">L</span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{displayData.l.toFixed(2)}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-muted-foreground">C</span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{displayData.c.toFixed(2)}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-muted-foreground">C</span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{change > 0 ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)</span>
          </div>
        </div>
        <div className="flex gap-1 mt-0.5">
          <span className="text-muted-foreground">Vol</span>
          <span className="text-pink-500">{displayData.v.toLocaleString()}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={effectiveData}
          onMouseMove={(state) => {
            if (state.activePayload && state.activePayload.length) {
              setActiveData(state.activePayload[0].payload)
            }
          }}
          onMouseLeave={() => {
            setActiveData(null)
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#2a2e39" opacity={0.5} />
          <XAxis
            dataKey="t"
            tickFormatter={formatXAxis}
            minTickGap={30}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <YAxis
            yAxisId="price"
            domain={[minPrice - domainPadding, maxPrice + domainPadding]}
            orientation="right"
            tickFormatter={(val) => val.toFixed(2)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 12 }}
            width={60}
          />
          {/* Hidden Volume Axis */}
          <YAxis yAxisId="volume" orientation="left" hide domain={[0, Math.max(...effectiveData.map(d => d.v)) * 3]} />

          {/* Volume Bars */}
          <Bar dataKey="v" yAxisId="volume" barSize={4}>
            {effectiveData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.c >= entry.o ? "#26a69a" : "#ef5350"} opacity={0.5} />
            ))}
          </Bar>

          {/* Line for Trend */}
          <Line type="monotone" dataKey="c" stroke="#3b82f6" yAxisId="price" dot={false} strokeWidth={2} />

          {/* Custom Candles */}
          <Bar
            dataKey="c"
            yAxisId="price"
            shape={<CustomCandle />}
            isAnimationActive={false}
          />

          {/* Position Line (if exists) */}
          {position && position.qty !== 0 && (
            <ReferenceLine
              y={parseFloat(position.avg_entry_price)}
              yAxisId="price"
              stroke={position.qty > 0 ? "#22c55e" : "#ef4444"}
              strokeDasharray="0"
              strokeWidth={1}
              label={{
                position: 'left',
                value: `POS ${position.qty}@${parseFloat(position.avg_entry_price).toFixed(2)}`,
                fill: position.qty > 0 ? "#22c55e" : "#ef4444",
                fontSize: 10
              }}
            />
          )}

          {/* Order Lines (Only Open Orders) */}
          {orders.map((order) => {
            // Filter: Don't show canceled/expired... BUT DO SHOW FILLED
            if (["canceled", "expired", "rejected", "suspended", "replaced"].includes(order.status)) {
              return null;
            }

            const isFilled = order.status === 'filled';
            const isLong = order.side === 'buy';
            const price = parseFloat(order.limit_price || order.stop_price || order.filled_avg_price || 0);

            if (!price || isNaN(price)) return null;

            let strokeColor = "#3b82f6"; // Default Blue for Open Orders
            let strokeDash = "5 5";

            if (isFilled) {
              strokeColor = isLong ? "#22c55e" : "#ef4444"; // Green for Buy Fill, Red for Sell Fill
              strokeDash = "0"; // Solid line for fills
            }

            return (
              <ReferenceLine
                key={order.id}
                y={price}
                yAxisId="price"
                stroke={strokeColor}
                strokeDasharray={strokeDash}
                strokeWidth={1}
                label={{
                  position: 'left',
                  value: `${order.side.toUpperCase()} ${order.qty}@${price.toFixed(2)}`,
                  fill: strokeColor,
                  fontSize: 10
                }}
              />
            )
          })}


          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              yAxisId="price"
              stroke="#eab308"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ position: 'right', value: currentPrice.toFixed(2), fill: '#eab308', fontSize: 11, dy: -10 }}
            />
          )}

          {/* Scalar Channel Lines */}
          {scalarLevels && scalarLevels.top && (
            <ReferenceLine
              y={parseFloat(scalarLevels.top)}
              yAxisId="price"
              stroke="#ffffff"
              strokeDasharray="10 5"
              strokeWidth={1}
              opacity={0.5}
              label={{ position: 'insideLeft', value: `TOP ${scalarLevels.top}`, fill: '#ffffff', fontSize: 10 }}
            />
          )}
          {scalarLevels && scalarLevels.bottom && (
            <ReferenceLine
              y={parseFloat(scalarLevels.bottom)}
              yAxisId="price"
              stroke="#ffffff"
              strokeDasharray="10 5"
              strokeWidth={1}
              opacity={0.5}
              label={{ position: 'insideLeft', value: `BOT ${scalarLevels.bottom}`, fill: '#ffffff', fontSize: 10 }}
            />
          )}

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
