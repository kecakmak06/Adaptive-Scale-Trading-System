"use client"

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
}

const Candlestick = (props: any) => {
  const {
    x,
    y,
    width,
    height,
    openClose: [open, close],
  } = props;
  const isGrowing = close > open;
  const color = isGrowing ? "#26a69a" : "#ef5350"; // TradingView teal/red
  const ratio = Math.abs(height / (open - close));

  return (
    <g stroke={color} fill={color} strokeWidth="1">
      <path
        d={`
          M ${x + width / 2}, ${y}
          L ${x + width / 2}, ${y + height}
        `}
      />
      <rect
        x={x}
        y={isGrowing ? y : y + height - Math.abs(open - close) * ratio}
        width={width}
        height={Math.max(1, Math.abs(open - close) * ratio)}
        fill={color}
        stroke="none"
      />
    </g>
  );
};

// Custom shape wrapper to interface between Recharts data and our SVG logic
const CustomCandle = (props: any) => {
  const { x, width, height, payload, yAxis } = props;

  // Debug log (throttled/once ideally, but for now just log first one)
  if (payload && payload.t === "LOG_CHECK") console.log("CustomCandle props:", props);

  if (!yAxis || !yAxis.scale) {
    if (Math.random() < 0.01) console.warn("CustomCandle: Missing yAxis or scale", props);
    return null;
  }

  const { o, h, l, c } = payload;

  const yHigh = yAxis.scale(h);
  const yLow = yAxis.scale(l);
  const yOpen = yAxis.scale(o);
  const yClose = yAxis.scale(c);

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.abs(yOpen - yClose);

  const isGrowing = c >= o;
  const color = isGrowing ? "#26a69a" : "#ef5350";

  return (
    <g stroke={color} fill={color} strokeWidth="1">
      <line x1={x + width / 2} y1={yHigh} x2={x + width / 2} y2={yLow} />
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={Math.max(1, bodyHeight)}
        stroke="none"
      />
    </g>
  );
};


export function PriceChart({ data, isLoading, timeframe, currentPrice, symbol = "AAPL", exchange = "NASDAQ" }: PriceChartProps) {
  const [activeData, setActiveData] = React.useState<ChartData | null>(null);

  // Reset active data when data changes to the last candle
  React.useEffect(() => {
    if (data && data.length > 0) {
      setActiveData(data[data.length - 1])
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        <div className="animate-pulse">Loading chart data...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        No chart data available
      </div>
    )
  }

  // Use the active data (hovered) or the latest data
  const displayData = activeData || data[data.length - 1];
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
  const minPrice = Math.min(...data.map(d => d.l))
  const maxPrice = Math.max(...data.map(d => d.h))
  const domainPadding = (maxPrice - minPrice) * 0.1

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
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>
              {change > 0 ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex gap-1 mt-0.5">
          <span className="text-muted-foreground">Vol</span>
          <span className="text-pink-500">{displayData.v.toLocaleString()}</span>{/* TradingView often uses pinkish for vol label or muted */}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
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
          <YAxis yAxisId="volume" orientation="left" hide domain={[0, Math.max(...data.map(d => d.v)) * 3]} />

          {/* Tooltip removed (replaced by Legend) */}


          {/* Volume Bars - colored by up/down */}
          <Bar dataKey="v" yAxisId="volume" barSize={4}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.c >= entry.o ? "#26a69a" : "#ef5350"} opacity={0.5} />
            ))}
          </Bar>

          {/* We use a Bar to render the custom Candle shape. 
            We pass the 'h' (high) as the value just to give it a range, 
            but the shape helper uses payload o/h/l/c. 
            Actually, best way to render a custom shape that relies on multiple keys 
            is to use a custom shape on a component that receives the data.
        */}

          {/* Diagnostic Line to verify data/axis - should show a blue line */}
          <Line type="monotone" dataKey="c" stroke="#3b82f6" yAxisId="price" dot={false} strokeWidth={2} />

          <Bar
            dataKey="c"
            yAxisId="price"
            shape={(props: any) => {
              // Diagnostic shape
              return <CustomCandle {...props} />
            }}
            isAnimationActive={false}
          />

          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              yAxisId="price"
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ position: 'right', value: currentPrice.toFixed(2), fill: '#ef4444', fontSize: 11, dy: -10 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
