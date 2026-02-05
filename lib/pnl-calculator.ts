export interface AnalyzedActivity extends Activity {
    realized_pl?: number;
    cost_basis?: number;
}

interface Activity {
    id: string;
    symbol: string;
    side: "buy" | "sell" | undefined; // safe check
    qty: string;
    price: string;
    transaction_time: string;
    type: "fill" | "partial_fill";
}

interface PositionState {
    qty: number;
    totalCost: number; // to track average price
}

export function calculateRealizedPnL(activities: any[]): AnalyzedActivity[] {
    if (!activities || activities.length === 0) return [];

    // 1. Sort oldest to newest to replay history
    // Alpaca usually returns newest first, so we reverse it for calculation
    const sorted = [...activities].sort((a, b) =>
        new Date(a.transaction_time).getTime() - new Date(b.transaction_time).getTime()
    );

    const positionMap = new Map<string, PositionState>();
    const analyzed: AnalyzedActivity[] = [];

    for (const act of sorted) {
        const item: AnalyzedActivity = { ...act };
        const sym = item.symbol;
        const qty = parseFloat(item.qty);
        const price = parseFloat(item.price);
        const side = item.side?.toLowerCase();

        // Initialize position state if not exists
        if (!positionMap.has(sym)) {
            positionMap.set(sym, { qty: 0, totalCost: 0 });
        }
        const pos = positionMap.get(sym)!;

        // Note: This matches simple Long interactions. 
        // Shorting logic (selling to open) is more complex if not tracked explicitly as "sell_short".
        // Assuming typical Long strategy for now based on context, but let's try to be generic.

        // Actually Alpaca `side` is just 'buy' or 'sell'.
        // We assume 'buy' increases position (Long), 'sell' decreases (closing Long).
        // If we go negative, we are Short.

        if (side === 'buy') {
            // If we are short (qty < 0), this is "Buy to Cover" -> Realized P&L
            if (pos.qty < 0) {
                // Covering Short
                const qtyToCover = Math.min(qty, Math.abs(pos.qty));
                const remainingBuy = qty - qtyToCover;

                // Avg Entry Price for Short
                // For short, "totalCost" represented the money RECEIVED when selling.
                // Avg Entry = totalCost / abs(qty)
                const avgEntryPrice = pos.totalCost / Math.abs(pos.qty);

                // P&L = (Entry - Exit) * Qty
                // Entry (Sell price) > Exit (Buy price) = Profit
                const pnl = (avgEntryPrice - price) * qtyToCover;

                item.realized_pl = (item.realized_pl || 0) + pnl;

                // Update position
                pos.totalCost -= avgEntryPrice * qtyToCover; // Remove portion of cost basis
                pos.qty += qtyToCover; // Move towards 0

                // If we flipped to Long with the remainder
                if (remainingBuy > 0) {
                    pos.qty += remainingBuy;
                    pos.totalCost += remainingBuy * price; // Add cost for new long leg
                }
            } else {
                // Opening/Adding Long
                pos.qty += qty;
                pos.totalCost += qty * price;
            }
        } else if (side === 'sell') {
            // If we are long (qty > 0), this is "Sell to Close" -> Realized P&L
            if (pos.qty > 0) {
                // Closing Long
                const qtyToClose = Math.min(qty, pos.qty);
                const remainingSell = qty - qtyToClose;

                // Avg Entry Price
                const avgEntryPrice = pos.totalCost / pos.qty;

                // P&L = (Exit - Entry) * Qty
                // Exit (Sell price) > Entry (Buy price) = Profit
                const pnl = (price - avgEntryPrice) * qtyToClose;

                item.realized_pl = (item.realized_pl || 0) + pnl;

                // Update Position
                pos.totalCost -= avgEntryPrice * qtyToClose;
                pos.qty -= qtyToClose;

                // If we flipped to Short with the remainder
                if (remainingSell > 0) {
                    pos.qty -= remainingSell;
                    pos.totalCost += remainingSell * price; // Add "cost" (received money) for new short leg?
                    // Wait, for Shorting, we usually track "Proceeds". 
                    // Let's treat totalCost as "value involved". 
                    // For short, we track cost basis as the price we sold at.
                }
            } else {
                // Opening/Adding Short
                pos.qty -= qty;
                pos.totalCost += qty * price; // Track the value we sold it for (Cost Basis)
            }
        }

        analyzed.push(item);
    }

    // Return reversed (Newest First) for display
    return analyzed.reverse();
}
