"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, Wallet } from "lucide-react"

interface AccountData {
    equity: string
    cash: string
    buying_power: string
    currency: string
    portfolio_value: string
    long_market_value: string
    short_market_value: string
}

export function AccountSummary() {
    const [account, setAccount] = useState<AccountData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAccount() {
            try {
                const res = await fetch("/api/alpaca/account")
                if (res.ok) {
                    const data = await res.json()
                    setAccount(data)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchAccount()
        // Poll every 10 seconds
        const interval = setInterval(fetchAccount, 10000)
        return () => clearInterval(interval)
    }, [])

    if (loading) {
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

    if (!account) return null

    // Calculate generic P&L (Equity - Cash, rough approximation if we don't have explicit P&L fields from API yet)
    // Ideally, Alpaca account object has 'equity' and 'last_equity'.
    // Let's rely on what we get. The interface above is based on standard Alpaca Account.
    // We'll trust the API returns these fields.

    const equity = Number(account.equity)
    const cash = Number(account.cash)
    const buyingPower = Number(account.buying_power)

    // Alpaca actually provides `last_equity` in the real API response usually.
    // If not, we can just show Equity, Cash, Buying Power.

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">
                        Total Portfolio Value
                    </p>
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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cash</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">
                        Settled Cash
                    </p>
                </CardContent>
            </Card>

            {/* Optional: Add a P&L card if we can calculate it or get it from API */}
            {/* For now, just show Market Values to be useful */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Market Value</CardTitle>
                    <div className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${(Number(account.long_market_value) - Math.abs(Number(account.short_market_value || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>L: ${Number(account.long_market_value || 0).toFixed(0)}</span>
                        <span>S: ${Number(account.short_market_value || 0).toFixed(0)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
