"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

interface Order {
    id: string
    client_order_id: string
    created_at: string
    updated_at: string
    submitted_at: string
    filled_at: string
    expired_at: string
    canceled_at: string
    failed_at: string
    asset_id: string
    symbol: string
    asset_class: string
    notional: string | null
    qty: string
    filled_qty: string
    filled_avg_price: string | null
    order_class: string
    order_type: string
    type: string
    side: string
    time_in_force: string
    limit_price: string | null
    stop_price: string | null
    status: string
}

interface OrdersListProps {
    orders: Order[]
    isLoading?: boolean
    onCancelOrder: (orderId: string) => Promise<void>
    filter: string
    setFilter: (filter: string) => void
}

export function OrdersList({ orders, isLoading, onCancelOrder, filter, setFilter }: OrdersListProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "filled": return "bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20"
            case "new":
            case "accepted":
            case "calculated": return "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 border-blue-500/20"
            case "partially_filled": return "bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20"
            case "canceled":
            case "rejected":
            case "expired": return "bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20"
            default: return "bg-secondary text-secondary-foreground"
        }
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Orders</h3>
                <Tabs value={filter} onValueChange={setFilter} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
                        <TabsTrigger value="closed" className="text-xs">Filled/Closed</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="h-[300px] w-full border rounded-md p-4">
                {isLoading && orders.length === 0 ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-secondary/50 rounded animate-pulse" />)}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">No orders found</div>
                ) : (
                    <div className="space-y-1">
                        {orders.map((order) => {
                            const isBuy = order.side === "buy"
                            return (
                                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={`${isBuy ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"} font-mono`}>
                                            {order.side.toUpperCase()}
                                        </Badge>
                                        <div>
                                            <div className="font-semibold font-mono">{order.symbol}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(order.submitted_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-sm font-mono">
                                                {order.filled_qty} / {order.qty}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Qty</div>
                                        </div>

                                        <div className="text-right w-24">
                                            <div className="text-sm font-mono">
                                                {order.filled_avg_price ? `$${Number(order.filled_avg_price).toFixed(2)}` : (order.limit_price ? `$${Number(order.limit_price).toFixed(2)} (Lmt)` : "MKT")}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Price</div>
                                        </div>

                                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                                            {order.status.replace("_", " ")}
                                        </Badge>

                                        {["new", "accepted", "calculated", "partially_filled"].includes(order.status) && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() => onCancelOrder(order.id)}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
