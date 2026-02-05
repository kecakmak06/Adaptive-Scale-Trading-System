
import Alpaca from "@alpacahq/alpaca-trade-api";

// Initialize Alpaca client
// Note: We use process.env directly. Ensure these are set in .env.local
const alpaca = new Alpaca({
    keyId: process.env.NEXT_PUBLIC_ALPACA_API_KEY,
    secretKey: process.env.NEXT_PUBLIC_ALPACA_API_SECRET,
    paper: true, // Default to paper trading
});

export interface AlpacaAccount {
    id: string;
    equity: string;
    buying_power: string;
    cash: string;
    currency: string;
    status: string;
}

export interface AlpacaBar {
    t: string; // Timestamp
    o: number; // Open
    h: number; // High
    l: number; // Low
    c: number; // Close
    v: number; // Volume
}

export class AlpacaClient {
    async getAccount(): Promise<AlpacaAccount> {
        try {
            const account = await alpaca.getAccount();
            return account;
        } catch (error) {
            console.error("Error fetching Alpaca account:", error);
            throw error;
        }
    }

    async getBars(symbol: string, timeframe: string = "1Day", limit: number = 100): Promise<AlpacaBar[]> {
        try {
            // Manual Aggregation for unsupported timeframes on free plan
            if (["1Week", "1Month", "12Month"].includes(timeframe)) {
                return this.getAggregatedBars(symbol, timeframe, limit);
            }

            // Calculate Start Date based on limit and timeframe to ensure we get enough data
            // We go back enough units + buffer (for weekends/closed hours)
            const now = new Date();
            let lookbackMinutes = 0;

            switch (timeframe) {
                // Ensure we look back at least 5 days (5 * 24 * 60 = 7200 mins) for intraday
                // This covers weekends (2 days) + holidays + buffer
                case "1Min":
                case "5Min":
                case "15Min":
                case "1Hour":
                    lookbackMinutes = Math.max(limit * 60 * 2, 8000);
                    break;
                case "1Day": lookbackMinutes = limit * 24 * 60 * 2; break; // 2x for weekends
                default: lookbackMinutes = limit * 24 * 60; // default to day-ish
            }

            // For small limits or intraday, ensure we don't go back too absurdly far, 
            // but for "1Day", ensuring 14 bars means going back ~20-30 days.
            const start = new Date(now.getTime() - lookbackMinutes * 60000);

            const bars: AlpacaBar[] = [];
            const resp = alpaca.getBarsV2(symbol, {
                timeframe: timeframe, // "1Min", "5Min", "15Min", "1Day"
                start: start.toISOString(),
                adjustment: 'all', // Ensure we get splits/divs and potentially raw/extended data depending on feed defaults
                // limit: limit, // Do NOT pass limit to API if we want the LATEST. If we pass limit=14 with start=30days ago, we get the OLD 14 bars.
                // We will fetch from start -> now, then slice.
            });

            for await (const b of resp) {
                const bar = b as any;
                bars.push({
                    t: bar.Timestamp || bar.t,
                    o: bar.OpenPrice || bar.o,
                    h: bar.HighPrice || bar.h,
                    l: bar.LowPrice || bar.l,
                    c: bar.ClosePrice || bar.c,
                    v: bar.Volume || bar.v,
                });
            }

            // If we fetched too many, take the last 'limit'
            return bars.slice(-limit);
        } catch (error) {
            console.error(`Error fetching bars for ${symbol}:`, error);
            return [];
        }
    }

    private async getAggregatedBars(symbol: string, timeframe: string, limit: number): Promise<AlpacaBar[]> {
        // Fetch enough daily bars to aggregate
        let multiplier = 7;
        if (timeframe === "1Month") multiplier = 35; // Buffer for weekends/holidays
        if (timeframe === "12Month") multiplier = 370;

        // Cap at reasonable max (e.g. 3 years of dailies ~ 750 bars, 10 years ~ 2500)
        // Alpaca pagination handles large requests automatically in getBarsV2 usually, 
        // but let's be safe.
        const dailyLimit = Math.min(limit * multiplier, 3000);

        const dailyBars = await this.getBars(symbol, "1Day", dailyLimit);

        if (dailyBars.length === 0) return [];

        const aggregatedPars: AlpacaBar[] = [];
        let currentBar: AlpacaBar | null = null;

        // Helper to get aggregation key
        const getKey = (dateStr: string) => {
            const date = new Date(dateStr);
            if (timeframe === "1Week") {
                // Get Monday of the week
                const day = date.getDay(),
                    diff = date.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(date.setDate(diff));
                return monday.toISOString().split('T')[0];
            }
            if (timeframe === "1Month") {
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            // 12Month (Year)
            return `${date.getFullYear()}`;
        }

        // dailyBars come latest last usually, but let's sort to be sure
        dailyBars.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

        // Map key -> accumulated bar
        const grouped = new Map<string, AlpacaBar>();

        for (const bar of dailyBars) {
            const key = getKey(bar.t);
            if (!grouped.has(key)) {
                grouped.set(key, { ...bar, t: key }); // Set timestamp to start of period (or close enough)
            } else {
                const existing = grouped.get(key)!;
                existing.h = Math.max(existing.h, bar.h);
                existing.l = Math.min(existing.l, bar.l);
                existing.c = bar.c; // Close is the last bar's close
                existing.v += bar.v;
                // Open remains first Open
            }
        }

        return Array.from(grouped.values()).slice(-limit); // Return last N aggregated bars
    }

    async getMarketStatus(): Promise<boolean> {
        try {
            const clock = await alpaca.getClock();
            return clock.is_open;
        } catch (err) {
            return false;
        }
    }

    async getSnapshot(symbol: string): Promise<any> {
        try {
            const snapshot = await alpaca.getSnapshot(symbol);
            return snapshot;
        } catch (error) {
            console.error(`Error fetching snapshot for ${symbol}:`, error);
            throw error;
        }
    }

    async getSnapshots(symbols: string[]): Promise<any> {
        try {
            // accounts for different versions of the library or potential missing method
            if (typeof alpaca.getSnapshots === 'function') {
                const response = await alpaca.getSnapshots(symbols);
                if (Array.isArray(response)) {
                    return response.reduce((acc: any, curr: any) => {
                        acc[curr.symbol] = curr;
                        return acc;
                    }, {});
                }
                return response;
            } else {
                console.warn("alpaca.getSnapshots is not a function, falling back to sequential fetch");
                const snapshots: Record<string, any> = {};
                await Promise.all(symbols.map(async (sym) => {
                    try {
                        snapshots[sym] = await this.getSnapshot(sym);
                    } catch (e) {
                        console.error(`Failed to fetch ${sym}`, e);
                    }
                }));
                return snapshots;
            }
        } catch (error) {
            console.error(`Error fetching snapshots for ${symbols}:`, error);
            throw error;
        }
    }

    async getLatestTrade(symbol: string): Promise<any> {
        try {
            const trade = await alpaca.getLatestTrade(symbol);
            return trade;
        } catch (error) {
            console.error(`Error fetching latest trade for ${symbol}:`, error);
            throw error;
        }
    }

    async getAsset(symbol: string): Promise<any> {
        try {
            const asset = await alpaca.getAsset(symbol);
            return asset;
        } catch (error) {
            console.error(`Error fetching asset info for ${symbol}:`, error);
            throw error;
        }
    }

    async submitOrder(order: {
        symbol: string;
        qty: number;
        side: "buy" | "sell";
        type: "market" | "limit" | "stop" | "stop_limit";
        timeInForce?: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
        limitPrice?: number;
        stopPrice?: number;
        clientOrderId?: string;
        orderClass?: "simple" | "bracket" | "oto" | "oco";
        takeProfit?: { limit_price: number };
        stopLoss?: { stop_price: number; limit_price?: number };
        extendedHours?: boolean;
    }): Promise<any> {
        try {
            const payload: any = {
                symbol: order.symbol,
                qty: order.qty,
                side: order.side,
                type: order.type,
                time_in_force: order.timeInForce || "day",
                limit_price: order.limitPrice,
                stop_price: order.stopPrice,
                client_order_id: order.clientOrderId,
                extended_hours: order.extendedHours
            };

            if (order.orderClass) {
                payload.order_class = order.orderClass;
                if (order.takeProfit) payload.take_profit = order.takeProfit;
                if (order.stopLoss) payload.stop_loss = order.stopLoss;
            }

            const ord = await alpaca.createOrder(payload);
            return ord;
        } catch (error: any) {
            console.error("Error submitting order:", error);
            if (error.response && error.response.data) {
                console.error("Alpaca Error Details:", error.response.data);
                throw new Error(JSON.stringify(error.response.data));
            }
            throw error;
        }
    }

    async getPositions(): Promise<any[]> {
        try {
            const positions = await alpaca.getPositions();
            return positions;
        } catch (error) {
            console.error("Error fetching positions:", error);
            return [];
        }
    }

    async getOrders(status: "open" | "closed" | "all" = "all", limit: number = 50): Promise<any[]> {
        try {
            const orders = await alpaca.getOrders({
                status: status,
                limit: limit,
                nested: true,
            } as any);
            return orders;
        } catch (error) {
            console.error("Error fetching orders:", error);
            return [];
        }
    }

    async getOrder(orderId: string): Promise<any> {
        try {
            const order = await alpaca.getOrder(orderId);
            return order;
        } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
            throw error;
        }
    }

    async cancelOrder(orderId: string): Promise<void> {
        try {
            await alpaca.cancelOrder(orderId);
        } catch (error) {
            console.error(`Error cancelling order ${orderId}:`, error);
            throw error;
        }
    }

    async cancelOrdersForSymbol(symbol: string): Promise<void> {
        try {
            // Alpaca doesn't have a direct "cancel all by symbol" method in the JS SDK typically,
            // so we list open orders and cancel them.
            // Actually, cancelAllOrders exists but nukes everything.
            const orders = await alpaca.getOrders({
                status: 'open',
                limit: 100, // Reasonable limit
                nested: false
            } as any);

            const targetOrders = orders.filter((o: any) => o.symbol === symbol);

            console.log(`Cancelling ${targetOrders.length} orders for ${symbol}`);
            await Promise.all(targetOrders.map((o: any) => alpaca.cancelOrder(o.id)));
        } catch (error) {
            console.error(`Error cancelling orders for ${symbol}:`, error);
            throw error;
        }
    }

    async closePosition(symbol: string): Promise<void> {
        try {
            await alpaca.closePosition(symbol);
        } catch (error) {
            console.error(`Error closing position for ${symbol}:`, error);
            throw error;
        }
    }

    async getAccountActivities(activityTypes: string | string[] = "FILL", limit: number = 50): Promise<any[]> {
        try {
            // @ts-ignore
            const activities = await alpaca.getAccountActivities({ activity_types: activityTypes, page_size: limit });
            return activities;
        } catch (error) {
            console.error("Error fetching account activities:", error);
            return [];
        }
    }
}

export const alpacaClient = new AlpacaClient();
