"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { RefreshCw, Info, Trash2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSimulatedExchange } from "@/hooks/use-simulated-exchange"

interface ScalarTradingProps {
    symbol: string
    currentPrice: number
    orders: any[]
    positions: any[]
    onOrderCreated?: (order: any) => void
    onLevelsChange?: (levels: { top: string, bottom: string }) => void
    onHistoryUpdate?: () => void
}

export function ScalarTrading({
    symbol,
    currentPrice,
    orders: initialOrders,
    positions,
    onOrderCreated,
    onLevelsChange,
    onHistoryUpdate
}: ScalarTradingProps) {
    const { toast } = useToast()
    const { placeOrder, cancelOrder, account, orders: exchangeOrders } = useSimulatedExchange()

    // UI State
    const [action, setAction] = useState<"buy" | "sell">("buy")
    const [maxPosition, setMaxPosition] = useState("100")
    const [initialSize, setInitialSize] = useState("10")
    const [subsequentSize, setSubsequentSize] = useState("5")
    const [startingPrice, setStartingPrice] = useState(currentPrice?.toString() || "")
    const [priceIncrement, setPriceIncrement] = useState("0.10")
    const [orderType, setOrderType] = useState("LMT")
    const [createProfitOrder, setCreateProfitOrder] = useState(true)
    const [profitOffset, setProfitOffset] = useState("0.5")
    const [restoreSize, setRestoreSize] = useState(false)
    const [closeOnChannelBreak, setCloseOnChannelBreak] = useState(false)
    const [cumulativeProfit, setCumulativeProfit] = useState(0)
    const [profitGivebackCapPercent, setProfitGivebackCapPercent] = useState("20")
    const [tradingPaused, setTradingPaused] = useState(false)
    const [enableChannelShift, setEnableChannelShift] = useState(false)
    const [channelShiftFactor, setChannelShiftFactor] = useState("0.5")
    const [topPrice, setTopPrice] = useState("")
    const [bottomPrice, setBottomPrice] = useState("")

    // INTERNAL TRACKING STATE
    // We use a Ref for the monitoring loop to prevent race conditions and closures on stale state
    const [activeLevels, setActiveLevels] = useState<any>({})
    const levelsRef = useRef<any>({})
    const isInitialMount = useRef(true)

    // Sync Ref with State (UI reads state, Loop reads Ref)
    useEffect(() => {
        levelsRef.current = activeLevels
    }, [activeLevels])

    // Sync levels with parent/chart
    useEffect(() => {
        if (onLevelsChange) {
            onLevelsChange({ top: topPrice, bottom: bottomPrice })
        }
    }, [topPrice, bottomPrice, onLevelsChange])

    // Load persisted data
    useEffect(() => {
        const savedProfit = localStorage.getItem(`scalar_profit_${symbol}`)
        if (savedProfit) setCumulativeProfit(parseFloat(savedProfit))

        const savedLevels = localStorage.getItem(`scalar_levels_${symbol}`)
        if (savedLevels) {
            try {
                const parsed = JSON.parse(savedLevels)
                setActiveLevels(parsed)
                levelsRef.current = parsed
            } catch (e) {
                console.error("Failed to parse saved levels", e)
            }
        }
    }, [symbol])

    // Save persistence
    useEffect(() => {
        localStorage.setItem(`scalar_profit_${symbol}`, cumulativeProfit.toString())
    }, [cumulativeProfit, symbol])

    useEffect(() => {
        if (Object.keys(activeLevels).length > 0) {
            localStorage.setItem(`scalar_levels_${symbol}`, JSON.stringify(activeLevels))
        } else {
            localStorage.removeItem(`scalar_levels_${symbol}`)
        }
    }, [activeLevels, symbol])

    // Bootstrap orphaned positions
    useEffect(() => {
        if (!isInitialMount.current) return
        if (Object.keys(activeLevels).length === 0) {
            const pos = positions?.find(p => p.symbol === symbol && parseFloat(p.qty) !== 0)
            if (pos) {
                const qty = Math.abs(parseFloat(pos.qty))
                const side = parseFloat(pos.qty) > 0 ? "buy" : "sell"
                const avgEntry = parseFloat(pos.avg_entry_price)
                const bootstrapId = `bootstrap_${Date.now()}`

                const newLevel = {
                    [bootstrapId]: {
                        originalParams: { symbol, qty, side, limitPrice: avgEntry, clientOrderId: bootstrapId },
                        status: 'open',
                        qty,
                        profitOffset: profitOffset,
                        isBootstrap: true
                    }
                }
                setActiveLevels(newLevel)
                levelsRef.current = newLevel
                toast({ title: "Position Synced", description: `Found ${qty} shares. Manager active.` })
            }
        }
        isInitialMount.current = false
    }, [symbol, positions, activeLevels, profitOffset, toast])

    // MONITORING LOOP
    useEffect(() => {
        const checkLogic = async () => {
            if (tradingPaused) return

            const currentLevels = { ...levelsRef.current }

            // RISK RULE: Channel Break (Mandatory Emergency Stop)
            const top = parseFloat(topPrice)
            const bot = parseFloat(bottomPrice)
            if (top && bot && (currentPrice > top || currentPrice < bot)) {
                handleCancelAll()
                // Market Close Position
                const pos = positions?.find(p => p.symbol === symbol)
                if (pos && Math.abs(parseFloat(pos.qty)) > 0.0001) {
                    try {
                        placeOrder({
                            symbol,
                            qty: Math.abs(parseFloat(pos.qty)),
                            side: parseFloat(pos.qty) > 0 ? 'sell' : 'buy',
                            type: 'market',
                            clientOrderId: `emergency_exit_${Date.now()}`
                        })
                    } catch (e) {
                        console.error("Emergency exit failed", e)
                    }
                }
                setTradingPaused(true)
                toast({
                    title: "CHANNEL BREAK",
                    description: `Price ${currentPrice.toFixed(2)} escaped [${bot}, ${top}]. Locked.`,
                    variant: "destructive"
                })
                return
            }

            let hasUpdates = false
            const placedExitsSummary: string[] = []

            for (const [id, level] of Object.entries(currentLevels) as [string, any][]) {
                // CASE 1: Entry -> Filled (Need to place exit)
                if (level.status === 'open') {
                    const order = exchangeOrders.find(o => o.id === id)

                    // Handle Bootstrap levels (no order in exchange)
                    const isBootstrap = level.isBootstrap || id.startsWith('bootstrap_')
                    const filled = isBootstrap || (order && order.status === 'filled')
                    const canceled = !isBootstrap && order && ['canceled', 'rejected', 'expired'].includes(order.status)

                    if (filled) {
                        const entryPrice = isBootstrap ? (level.originalParams.limitPrice || currentPrice) : (order?.filledAvgPrice || level.originalParams.limitPrice || 0)
                        const offset = parseFloat(level.profitOffset || profitOffset) || 0.5
                        const isLong = level.originalParams.side === 'buy'
                        let exitPrice = isLong ? entryPrice + offset : entryPrice - offset
                        exitPrice = Number(exitPrice.toFixed(2))

                        if (createProfitOrder) {
                            try {
                                const exitOrder = placeOrder({
                                    symbol,
                                    qty: level.qty,
                                    side: isLong ? 'sell' : 'buy',
                                    type: 'limit',
                                    limitPrice: exitPrice,
                                    clientOrderId: `scalar_exit_${id}_${Date.now()}`,
                                    extendedHours: true
                                })

                                placedExitsSummary.push(`${isLong ? 'Sell' : 'Buy'} Limit @ ${exitPrice}`)
                                currentLevels[id] = {
                                    ...level,
                                    status: 'tp_pending',
                                    exitOrderId: exitOrder.id,
                                    exitPrice
                                }
                                hasUpdates = true
                            } catch (err) {
                                console.error("Exit placement error", err)
                            }
                        } else {
                            // No profit order requested, just mark as filled/done
                            currentLevels[id] = { ...level, status: 'tp_filled', logged: true }
                            hasUpdates = true
                        }
                    } else if (canceled) {
                        delete currentLevels[id]
                        hasUpdates = true
                    }
                }
                // CASE 2: Exit -> Filled (Need to log history)
                else if (level.status === 'tp_pending' && level.exitOrderId) {
                    const exitOrder = exchangeOrders.find(o => o.id === level.exitOrderId)

                    if (exitOrder) {
                        if (exitOrder.status === 'filled' && !level.logged) {
                            const entryPrice = level.originalParams.limitPrice || currentPrice
                            const actualExitPrice = exitOrder.filledAvgPrice || level.exitPrice
                            const qty = exitOrder.qty
                            const isLong = level.originalParams.side === 'buy'
                            const pnl = isLong ? (actualExitPrice - entryPrice) * qty : (entryPrice - actualExitPrice) * qty

                            const logEntry = {
                                id: crypto.randomUUID(),
                                childId: exitOrder.id,
                                symbol,
                                side: isLong ? 'sell' : 'buy',
                                qty,
                                entryPrice,
                                exitPrice: actualExitPrice,
                                pnl,
                                timestamp: Date.now()
                            }

                            const existingLogs = JSON.parse(localStorage.getItem("sc_closed_positions_log") || "[]")
                            localStorage.setItem("sc_closed_positions_log", JSON.stringify([logEntry, ...existingLogs]))
                            if (onHistoryUpdate) onHistoryUpdate()
                            if (pnl > 0) setCumulativeProfit(prev => prev + pnl)

                            toast({
                                title: "Trade Logged",
                                description: `Closed ${qty} ${symbol} for $${pnl.toFixed(2)}`,
                                variant: pnl >= 0 ? "default" : "destructive",
                            })

                            currentLevels[id] = { ...level, logged: true, status: 'tp_filled' }
                            hasUpdates = true

                            if (restoreSize) {
                                try {
                                    const restored = await restoreLevel(level.originalParams)
                                    // Replace old level with new one
                                    delete currentLevels[id]
                                    currentLevels[restored.id] = { originalParams: level.originalParams, status: 'open', qty: level.qty, profitOffset: level.profitOffset }
                                } catch (e) {
                                    console.error("Restore failed", e)
                                }
                            }
                        } else if (['canceled', 'rejected', 'expired'].includes(exitOrder.status)) {
                            delete currentLevels[id]
                            hasUpdates = true
                        }
                    }
                }
            }

            if (placedExitsSummary.length > 0) {
                if (placedExitsSummary.length === 1) {
                    toast({ title: "Exit Order Placed", description: placedExitsSummary[0] })
                } else {
                    toast({ title: "Batch Exits Placed", description: `Submitted ${placedExitsSummary.length} exit orders for ${symbol}.` })
                }
            }

            if (hasUpdates) setActiveLevels(currentLevels)

            // TRIGGER SHIFT: If profit was realized and we are now flat (no active trades/positions)
            if (enableChannelShift && !tradingPaused) {
                const hasOpenPositions = positions?.some(p => p.symbol === symbol && Math.abs(parseFloat(p.qty)) > 0.0001)
                const hasPendingExits = Object.values(currentLevels).some((l: any) => l.status === 'tp_pending')

                if (!hasOpenPositions && !hasPendingExits && cumulativeProfit > 1) {
                    attemptChannelShift()
                }
            }
        }

        const interval = setInterval(checkLogic, 2000)
        return () => clearInterval(interval)
    }, [exchangeOrders, symbol, toast, onHistoryUpdate, restoreSize, profitOffset, enableChannelShift, tradingPaused, currentPrice, positions])

    const restoreLevel = async (params: any) => {
        const newParams = {
            ...params,
            clientOrderId: `scalar_restore_${Date.now()}`,
            extendedHours: true
        }
        const data = placeOrder(newParams)
        toast({ title: "Order Restored", description: `Re-submitted order at $${newParams.limitPrice || newParams.stopPrice}` })
        if (onOrderCreated) onOrderCreated(data)
        return data
    }

    const handleCancelAll = async () => {
        // Use a consistent snapshot for canceling
        const currentTracking = { ...levelsRef.current }

        // 1. Cancel exchange orders
        const openOrders = exchangeOrders.filter(o => o.symbol === symbol && o.status === 'open')
        for (const o of openOrders) {
            try {
                cancelOrder(o.id)
            } catch (e) {
                console.error("Cancel fail", o.id)
            }
        }

        // 2. Clear our tracking state
        setActiveLevels({})
        levelsRef.current = {}
        localStorage.removeItem(`scalar_levels_${symbol}`)

        toast({ title: "Chaos Controlled", description: "All orders canceled and tracking reset." })
    }

    const handleTransmit = async (overrideStart?: string, overrideTop?: string, overrideBottom?: string, baseLevels?: any) => {
        // Use provided levels, or the current ref, to avoid stale closure state
        const initialLevels = baseLevels !== undefined ? { ...baseLevels } : { ...levelsRef.current }

        const start = parseFloat(overrideStart !== undefined ? overrideStart : startingPrice)
        const inc = parseFloat(priceIncrement)
        const maxPos = parseFloat(maxPosition)
        const initSize = parseFloat(initialSize)
        const subSize = parseFloat(subsequentSize)
        const profOffset = parseFloat(profitOffset)

        if (!start || !maxPos || !initSize || !subSize) {
            toast({ title: "Params Missing", variant: "destructive" })
            return
        }

        let currentQty = 0
        let step = 0
        const ordersToSubmit = []
        let totalCost = 0

        while (currentQty < maxPos) {
            let size = step === 0 ? initSize : subSize
            if (currentQty + size > maxPos) size = maxPos - currentQty
            size = Math.floor(size)
            if (size < 1) break

            const rawPrice = action === "buy" ? start - (step * inc) : start + (step * inc)
            const price = Number(rawPrice.toFixed(2))

            const effectiveTop = overrideTop !== undefined ? overrideTop : topPrice
            if (effectiveTop && price > parseFloat(effectiveTop)) break
            const effectiveBottom = overrideBottom !== undefined ? overrideBottom : bottomPrice
            if (effectiveBottom && price < parseFloat(effectiveBottom)) break

            totalCost += price * size
            const payload = {
                symbol,
                qty: size,
                side: action,
                type: orderType === "MKT" && step === 0 ? "market" : "limit",
                timeInForce: "day",
                clientOrderId: `scalar_${symbol}_${Date.now()}_${step}`,
                limitPrice: price,
                extendedHours: true,
                profitOffset: profOffset
            }

            ordersToSubmit.push(payload)
            currentQty += size
            step++
            if (step > 100) break
        }

        if (account && account.buyingPower < totalCost) {
            alert(`Insufficient BP: Need $${totalCost.toFixed(2)}, have $${account.buyingPower.toFixed(2)}`)
            return
        }

        let count = 0
        const newLevels: any = initialLevels
        for (const order of ordersToSubmit) {
            try {
                const data = placeOrder(order)
                newLevels[data.id] = { originalParams: order, status: 'open', qty: order.qty, profitOffset: order.profitOffset }
                count++
                await new Promise(r => setTimeout(r, 10))
            } catch (err: any) {
                console.error("Order fail", err)
            }
        }

        setActiveLevels(newLevels)
        if (onOrderCreated) onOrderCreated({ count })
        toast({ title: "Orders Placed", description: `Submitted ${count} orders for ${symbol}.` })
    }


    const attemptChannelShift = async () => {
        const offset = parseFloat(profitOffset || "0.5")
        const factor = parseFloat(channelShiftFactor || "0.5")
        const maxPos = parseFloat(maxPosition || "0")
        const cap = parseFloat(profitGivebackCapPercent || "20") / 100

        // Target shift based on parameters
        let drift = action === 'buy' ? (offset * factor) : -(offset * factor)

        // Ensure we don't 'give back' more than the allowable portion of cumulative profit
        const allowable = cumulativeProfit * cap
        const fullRisk = Math.abs(drift) * maxPos

        if (fullRisk > allowable) {
            // Proportional reduction: shift less if we haven't earned enough profit to justify full shift
            const reductionFactor = allowable / fullRisk
            drift = drift * reductionFactor
        }

        // Only shift if it's meaningful (at least 1 cent)
        if (Math.abs(drift) >= 0.01) {
            const currentTop = parseFloat(topPrice || (currentPrice + 10).toString())
            const currentBot = parseFloat(bottomPrice || (currentPrice - 10).toString())
            const currentStart = parseFloat(startingPrice || currentPrice.toString())

            const newTop = (currentTop + drift).toFixed(2)
            const newBottom = (currentBot + drift).toFixed(2)
            const newStart = (currentStart + drift).toFixed(2)

            toast({
                title: "ADAPTIVE SHIFT",
                description: `Moving channel ${drift > 0 ? 'UP' : 'DOWN'} by $${Math.abs(drift).toFixed(2)} using profit.`
            })

            // 1. Update UI Inputs (Crucial for user visibility)
            setTopPrice(newTop)
            setBottomPrice(newBottom)
            setStartingPrice(newStart)

            // 2. Clear profit bucket for this shift cycle
            setCumulativeProfit(0)

            // 3. Clear existing grid before redeploying
            await handleCancelAll()

            // 4. Redeploy grid at new location
            await handleTransmit(newStart, newTop, newBottom, {})
        }
    }

    // UI Render
    return (
        <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
                <RadioGroup value={action} onValueChange={(v) => setAction(v as "buy" | "sell")} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="buy" id="b1" className="text-green-500 border-green-500" />
                        <Label htmlFor="b1" className="font-bold cursor-pointer">Buy</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sell" id="s1" className="text-red-500 border-red-500" />
                        <Label htmlFor="s1" className="font-bold cursor-pointer">Sell</Label>
                    </div>
                </RadioGroup>
                <Badge variant="outline" className="text-[10px] gap-1 h-5">
                    <RefreshCw className="h-3 w-3" /> Robust Sim
                </Badge>
            </div>

            <Separator />

            <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground border-b border-border/50 pb-1">Scale Config</h4>
                <div className="grid grid-cols-[1fr_80px] gap-2 items-center">
                    <Label className="text-[11px] text-muted-foreground">Max Position</Label>
                    <Input type="number" className="h-6 text-right px-2 py-0 text-xs font-mono" value={maxPosition} onChange={(e) => setMaxPosition(e.target.value)} />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2 items-center">
                    <Label className="text-[11px] text-muted-foreground">Start Size</Label>
                    <Input type="number" className="h-6 text-right px-2 py-0 text-xs font-mono" value={initialSize} onChange={(e) => setInitialSize(e.target.value)} />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2 items-center">
                    <Label className="text-[11px] text-muted-foreground">Step Size</Label>
                    <Input type="number" className="h-6 text-right px-2 py-0 text-xs font-mono" value={subsequentSize} onChange={(e) => setSubsequentSize(e.target.value)} />
                </div>

                <div className="grid grid-cols-[1fr,90px] gap-y-1.5 gap-x-2 mt-3">
                    <Label className="text-[11px] text-muted-foreground self-center">Top Price</Label>
                    <Input type="number" step="0.01" className="h-6 text-right font-mono font-bold" value={topPrice} onChange={(e) => setTopPrice(e.target.value)} />

                    <div className="flex items-center gap-2 self-center">
                        <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Start Price</Label>
                        <Badge
                            variant="outline"
                            className="text-[9px] px-1 h-4 cursor-pointer hover:bg-secondary text-muted-foreground font-normal"
                            onClick={() => currentPrice && setStartingPrice(currentPrice.toFixed(2))}
                        >
                            Current
                        </Badge>
                    </div>
                    <Input type="number" step="0.01" className="h-6 text-right font-mono font-bold" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />

                    <Label className="text-[11px] text-muted-foreground self-center">Increment</Label>
                    <Input type="number" step="0.01" className="h-6 text-right font-mono" value={priceIncrement} onChange={(e) => setPriceIncrement(e.target.value)} />

                    <Label className="text-[11px] text-muted-foreground self-center">Bottom Price</Label>
                    <Input type="number" step="0.01" className="h-6 text-right font-mono font-bold" value={bottomPrice} onChange={(e) => setBottomPrice(e.target.value)} />
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground border-b border-border/50 pb-1">Profit/Restoration</h4>
                <div className="flex items-center space-x-2">
                    <Checkbox id="pt" checked={createProfitOrder} onCheckedChange={(c) => setCreateProfitOrder(!!c)} />
                    <Label htmlFor="pt" className="text-[11px] cursor-pointer">Take Profit</Label>
                </div>
                <div className="pl-5 flex items-center gap-2">
                    <Label className="text-[11px] text-muted-foreground">Offset</Label>
                    <Input className="w-16 h-6 px-1 text-center font-mono" value={profitOffset} onChange={(e) => setProfitOffset(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="rs" checked={restoreSize} onCheckedChange={(c) => setRestoreSize(!!c)} />
                    <Label htmlFor="rs" className="text-[11px] cursor-pointer">Restore Size</Label>
                </div>
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-1">
                    <h4 className="font-semibold text-muted-foreground">Adaptive Shift</h4>
                    <div className="flex items-center space-x-1">
                        <Checkbox id="es" checked={enableChannelShift} onCheckedChange={(c) => setEnableChannelShift(!!c)} />
                        <Label htmlFor="es" className="text-[10px] cursor-pointer">Enable</Label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-1 gap-x-2 pl-1">
                    <Label className="text-[10px] text-muted-foreground self-center">Profit Cap %</Label>
                    <Input type="number" className="h-5 text-center font-mono text-[10px]" value={profitGivebackCapPercent} onChange={(e) => setProfitGivebackCapPercent(e.target.value)} />

                    <Label className="text-[10px] text-muted-foreground self-center">Sensitivity</Label>
                    <Input type="number" className="h-5 text-center font-mono text-[10px]" value={channelShiftFactor} onChange={(e) => setChannelShiftFactor(e.target.value)} />
                </div>
            </div>

            <Separator />

            <div className="pt-2 flex justify-between items-center text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                    {tradingPaused && (
                        <Badge variant="destructive" className="h-4 px-1 gap-1 text-[9px] animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> BREAK
                        </Badge>
                    )}
                    <span>Profit:</span>
                    <span className={`font-mono font-bold ${cumulativeProfit > 0 ? 'text-green-500' : ''}`}>
                        ${cumulativeProfit.toFixed(2)}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setCumulativeProfit(0)}>
                    <RefreshCw className="w-3 h-3" />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="destructive" className="h-8 text-xs gap-1" onClick={handleCancelAll}>
                    <Trash2 className="w-3 h-3" /> Nuclear Cancel
                </Button>
                <Button className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleTransmit()}>
                    Transmit
                </Button>
            </div>
        </div>
    )
}
