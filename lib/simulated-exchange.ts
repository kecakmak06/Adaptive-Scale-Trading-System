
export interface SimOrder {
    id: string;
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    limitPrice?: number;
    status: 'open' | 'filled' | 'canceled' | 'rejected';
    filledAvgPrice?: number;
    createdAt: number;
    extendedHours?: boolean;
    clientOrderId?: string;
}

export interface SimPosition {
    symbol: string;
    qty: number;
    avgEntryPrice: number;
    currentPrice: number;
    unrealizedPl: number;
    marketValue: number;
}

export interface SimAccount {
    cash: number;
    buyingPower: number;
    equity: number;
    initialCash: number;
}

export class SimulatedExchange {
    private cash: number;
    private initialCash: number;
    private positions: Map<string, SimPosition>;
    private orders: Map<string, SimOrder>;
    private history: any[];
    private realizedPnL: number = 0;
    private lastPrice: Map<string, number> = new Map();

    constructor(initialCash: number = 100000) {
        this.cash = initialCash;
        this.initialCash = initialCash;
        this.positions = new Map();
        this.orders = new Map();
        this.history = [];
    }

    // Load from specific state (for persistence)
    loadState(state: { cash: number, initialCash: number, positions: any[], orders: any[], history: any[], realizedPnL?: number }) {
        this.cash = state.cash;
        this.initialCash = state.initialCash;
        this.positions = new Map(state.positions.map((p: any) => [p.symbol, p]));
        this.orders = new Map(state.orders.map((o: any) => [o.id, o]));
        this.history = state.history || [];
        this.realizedPnL = state.realizedPnL || 0;
    }

    getState() {
        return {
            cash: this.cash,
            initialCash: this.initialCash,
            positions: Array.from(this.positions.values()),
            orders: Array.from(this.orders.values()),
            history: this.history,
            realizedPnL: this.realizedPnL
        };
    }

    getAccount(): SimAccount {
        let equity = this.cash;
        let heldCash = 0;

        // Equity = Cash + Position Value
        this.positions.forEach(p => {
            equity += p.marketValue;
        });

        // Buying Power = Cash - Committed to Open Buy Orders
        this.orders.forEach(o => {
            if (o.status === 'open' && o.side === 'buy' && o.limitPrice) {
                heldCash += o.qty * o.limitPrice;
            }
        });

        return {
            cash: this.cash,
            equity: equity,
            buyingPower: Math.max(0, this.cash - heldCash),
            initialCash: this.initialCash
        };
    }

    reset(amount: number) {
        this.cash = amount;
        this.initialCash = amount;
        this.positions.clear();
        this.orders.clear();
        this.history = [];
        this.realizedPnL = 0;
    }

    clearHistory() {
        this.history = [];
        this.realizedPnL = 0;
    }

    submitOrder(orderParams: Omit<SimOrder, 'id' | 'status' | 'createdAt' | 'filledAvgPrice'>): SimOrder {
        const id = crypto.randomUUID();
        const account = this.getAccount();

        // Basic Validation
        if (orderParams.qty <= 0) throw new Error("Quantity must be positive");

        // Buying Power / Margin Check
        const price = orderParams.limitPrice || this.lastPrice.get(orderParams.symbol) || 0;
        const estTotal = orderParams.qty * price;

        if (orderParams.side === 'buy') {
            const pos = this.positions.get(orderParams.symbol);
            if (pos && pos.qty < 0) {
                // Covering a short. Buying power logic usually allows this if you have the cash to buy back.
                // For simplicity, we just check if you have the cash.
                if (estTotal > account.cash) {
                    throw new Error(`Insufficient Cash to cover short. Required: $${estTotal.toFixed(2)}, Available: $${account.cash.toFixed(2)}`);
                }
            } else {
                // Regular long buy
                if (estTotal > account.buyingPower) {
                    throw new Error(`Insufficient Buying Power. Required: $${estTotal.toFixed(2)}, Available: $${account.buyingPower.toFixed(2)}`);
                }
            }
        } else if (orderParams.side === 'sell') {
            const pos = this.positions.get(orderParams.symbol);
            const currentQty = pos ? pos.qty : 0;

            if (currentQty <= 0) {
                // Entering or adding to a short. 
                // We lock up 100% of the short value as a "margin" requirement for simplicity.
                if (estTotal > account.buyingPower) {
                    throw new Error(`Insufficient Buying Power for short. Required: $${estTotal.toFixed(2)}, Available: $${account.buyingPower.toFixed(2)}`);
                }
            }
            // If currentQty > 0, it's a long exit, which should always be allowed (already checked for pending sells in next block)
        }

        // Over-selling protection (cannot sell more than you own if you're trying to do a clean exit)
        // Actually, if we allow shorting, we just allow the negative qty. 
        // But we want to prevent UNINTENTIONAL over-selling if they have a long.
        // Let's keep it simple: any SELL subtracts from Qty. Any BUY adds to Qty.


        const newOrder: SimOrder = {
            ...orderParams,
            id,
            status: 'open',
            createdAt: Date.now()
        };

        this.orders.set(id, newOrder);

        // Immediate Market Fill if price is known
        if (newOrder.type === 'market') {
            const price = this.lastPrice.get(newOrder.symbol);
            if (price) {
                this.executeFill(newOrder, price);
            }
        }

        return newOrder;
    }

    cancelOrder(id: string) {
        const order = this.orders.get(id);
        if (order && order.status === 'open') {
            order.status = 'canceled';
            this.orders.set(id, order); // Update ref
            return true;
        }
        return false;
    }

    // THE MATCHING ENGINE
    processTick(symbol: string, price: number) {
        const fills: SimOrder[] = [];

        // 0. Store Price
        this.lastPrice.set(symbol, price);

        // 1. Update Position Market Values
        if (this.positions.has(symbol)) {
            const pos = this.positions.get(symbol)!;
            pos.currentPrice = price;
            pos.marketValue = pos.qty * price;
            pos.unrealizedPl = pos.marketValue - (pos.qty * pos.avgEntryPrice);
        }

        // 2. Check Orders
        this.orders.forEach(order => {
            if (order.status !== 'open') return;
            if (order.symbol !== symbol) return;

            let shouldFill = false;

            if (order.type === 'market') {
                shouldFill = true;
            } else if (order.type === 'limit' && order.limitPrice) {
                if (order.side === 'buy' && price <= order.limitPrice) {
                    shouldFill = true;
                } else if (order.side === 'sell' && price >= order.limitPrice) {
                    shouldFill = true;
                }
            }

            if (shouldFill) {
                this.executeFill(order, price);
                fills.push(order);
            }
        });

        return fills;
    }

    private executeFill(order: SimOrder, price: number) {
        if (order.status !== 'open') return;

        // Double check cash (for market buys)
        if (order.side === 'buy') {
            const cost = order.qty * price;
            if (cost > this.cash) {
                order.status = 'rejected';
                return;
            }
            this.cash -= cost;
        } else {
            const proceed = order.qty * price;
            this.cash += proceed;
        }

        // Update Position
        const pos = this.positions.get(order.symbol) || {
            symbol: order.symbol,
            qty: 0,
            avgEntryPrice: 0,
            currentPrice: price,
            unrealizedPl: 0,
            marketValue: 0
        };

        if (order.side === 'buy') {
            if (pos.qty < 0) {
                // Covering a short
                const coveredQty = Math.min(Math.abs(pos.qty), order.qty);
                const profit = coveredQty * (pos.avgEntryPrice - price);
                this.realizedPnL += profit;

                this.history.unshift({
                    id: crypto.randomUUID(),
                    symbol: order.symbol,
                    qty: coveredQty,
                    entryPrice: pos.avgEntryPrice,
                    exitPrice: price,
                    pnl: profit,
                    timestamp: Date.now(),
                    type: 'cover'
                });
            }

            const totalCost = (pos.qty * pos.avgEntryPrice) + (order.qty * price);
            pos.qty += order.qty;
            if (Math.abs(pos.qty) > 0.000001) {
                // If flipping from short to long, the new avgEntryPrice is just the fill price
                if (pos.qty > 0 && (pos.qty - order.qty) <= 0) {
                    pos.avgEntryPrice = price;
                } else {
                    pos.avgEntryPrice = totalCost / pos.qty;
                }
            }
        } else {
            if (pos.qty > 0) {
                // Selling a long
                const soldQty = Math.min(pos.qty, order.qty);
                const profit = soldQty * (price - pos.avgEntryPrice);
                this.realizedPnL += profit;

                this.history.unshift({
                    id: crypto.randomUUID(),
                    symbol: order.symbol,
                    qty: soldQty,
                    entryPrice: pos.avgEntryPrice,
                    exitPrice: price,
                    pnl: profit,
                    timestamp: Date.now(),
                    type: 'sell'
                });
            }

            const totalProceeds = (pos.qty * pos.avgEntryPrice) - (order.qty * price);
            pos.qty -= order.qty;
            if (Math.abs(pos.qty) > 0.000001) {
                // If flipping from long to short, the new avgEntryPrice is just the fill price
                if (pos.qty < 0 && (pos.qty + order.qty) >= 0) {
                    pos.avgEntryPrice = price;
                } else {
                    // Avg Entry doesn't change on simple reduction of long, 
                    // but for shorts, we track the entry price.
                    if (pos.qty < 0) {
                        pos.avgEntryPrice = Math.abs(totalProceeds / pos.qty);
                    }
                }
            }
        }

        // Update Position Record
        if (Math.abs(pos.qty) <= 0.000001) {
            this.positions.delete(order.symbol);
        } else {
            pos.currentPrice = price;
            pos.marketValue = pos.qty * price;
            pos.unrealizedPl = pos.marketValue - (pos.qty * pos.avgEntryPrice);
            this.positions.set(order.symbol, pos);
        }

        // Update Order
        order.status = 'filled';
        order.filledAvgPrice = price;
        this.orders.set(order.id, order);
    }
}
