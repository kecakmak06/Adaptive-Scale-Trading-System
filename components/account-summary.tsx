"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, Wallet } from "lucide-react"

interface AccountSummaryProps {
    account: {
        cash: number
        buyingPower: number
        equity: number
        initialCash: number
    } | null
}

export function AccountSummary({ account }: AccountSummaryProps) {
    if (!account) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-muted rounded"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-32 bg-muted rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const { cash, buyingPower, equity, initialCash } = account;
    const totalPnl = equity - initialCash;
    const pnlPercent = initialCash > 0 ? (totalPnl / initialCash) * 100 : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={`flex items-center text-xs ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalPnl >= 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                        ${Math.abs(totalPnl).toFixed(2)} ({pnlPercent.toFixed(2)}%)
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">
                        Available for trading
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
