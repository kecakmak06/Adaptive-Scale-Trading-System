"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import React from "react"

interface HistoryListProps {
    activities: any[]
    isLoading: boolean
    onClear?: () => void
}

export function HistoryList({ activities, isLoading, onClear }: HistoryListProps) {

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground animate-pulse">Loading execution history...</div>
    }

    // Always render structure to hold the button, even if empty
    return (
        <div className="space-y-2">
            <div className="flex justify-end">
                {onClear && (
                    <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear History
                    </Button>
                )}
            </div>

            {(!activities || activities.length === 0) ? (
                <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
                    No closed positions logged.
                </div>
            ) : (
                <div className="rounded-md border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Symbol</TableHead>
                                <TableHead>Side</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Entry</TableHead>
                                <TableHead className="text-right">Exit</TableHead>
                                <TableHead className="text-right">P&L</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities.map((item) => {
                                // Data structure: { id, symbol, side, qty, entryPrice, exitPrice, pnl, timestamp }
                                const isBuy = item.side?.toLowerCase() === "buy" // Should be 'sell'/'buy' (close action)
                                const pnl = item.pnl

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono font-medium">{item.symbol}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={!isBuy ? "text-green-500 border-green-500/30" : "text-green-500 border-green-500/30"}>
                                                CLOSED
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{item.qty}</TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">${item.entryPrice?.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">${item.exitPrice?.toFixed(2)}</TableCell>
                                        <TableCell className={`text-right font-mono font-semibold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                            {pnl >= 0 ? "+" : ""}{pnl?.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs">
                                            {item.timestamp ? format(new Date(item.timestamp), "MMM d HH:mm:ss") : "-"}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
