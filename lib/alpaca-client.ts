
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
                case "1Min": lookbackMinutes = limit * 2; break; // 2x buffer
                case "5Min": lookbackMinutes = limit * 5 * 2; break;
                case "15Min": lookbackMinutes = limit * 15 * 2; break;
                case "1Hour": lookbackMinutes = limit * 60 * 2; break;
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

    async submitOrder(order: { symbol: string; qty: number; side: "buy" | "sell"; type: "market" | "limit"; limitPrice?: number }): Promise<any> {
        try {
            const ord = await alpaca.createOrder({
                symbol: order.symbol,
                qty: order.qty,
                side: order.side,
                type: order.type,
                time_in_force: "day",
                limit_price: order.limitPrice,
            });
            return ord;
        } catch (error) {
            console.error("Error submitting order:", error);
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

    async cancelOrder(orderId: string): Promise<void> {
        try {
            await alpaca.cancelOrder(orderId);
        } catch (error) {
            console.error(`Error cancelling order ${orderId}:`, error);
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
}

export const alpacaClient = new AlpacaClient();
