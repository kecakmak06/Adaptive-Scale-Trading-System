"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { SimulatedExchange, SimAccount, SimOrder, SimPosition } from '@/lib/simulated-exchange'

// Singleton instance
const simExchange = new SimulatedExchange();

interface SimulatedExchangeContextType {
    account: SimAccount;
    positions: SimPosition[];
    orders: SimOrder[];
    history: any[];
    isLoaded: boolean;
    placeOrder: (params: any) => SimOrder;
    cancelOrder: (id: string) => boolean;
    resetAccount: (cash: number) => void;
    clearHistory: () => void;
    processTick: (symbol: string, price: number) => SimOrder[];
}

const SimulatedExchangeContext = createContext<SimulatedExchangeContextType | undefined>(undefined);

export function SimulatedExchangeProvider({ children }: { children: ReactNode }) {
    const [account, setAccount] = useState<SimAccount>(simExchange.getAccount())
    const [positions, setPositions] = useState<SimPosition[]>([])
    const [orders, setOrders] = useState<SimOrder[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    const refreshState = useCallback(() => {
        const state = simExchange.getState();
        setAccount(simExchange.getAccount());
        setPositions(state.positions);
        setOrders(state.orders);
        setHistory(state.history);

        // Persist
        localStorage.setItem("sim_exchange_state", JSON.stringify(state));
    }, []);

    // Load on Mount
    useEffect(() => {
        const saved = localStorage.getItem("sim_exchange_state");
        if (saved) {
            try {
                simExchange.loadState(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load sim state", e);
            }
        }
        setIsLoaded(true);
        refreshState();
    }, [refreshState]);

    const placeOrder = useCallback((params: any) => {
        try {
            const order = simExchange.submitOrder(params);
            refreshState();
            return order;
        } catch (e: any) {
            console.error("Order Submit Failed", e.message);
            throw e;
        }
    }, [refreshState]);

    const cancelOrder = useCallback((id: string) => {
        const res = simExchange.cancelOrder(id);
        if (res) refreshState();
        return res;
    }, [refreshState]);

    const resetAccount = useCallback((cash: number) => {
        simExchange.reset(cash);
        refreshState();
    }, [refreshState]);

    const clearHistory = useCallback(() => {
        simExchange.clearHistory();
        refreshState();
    }, [refreshState]);

    const processTick = useCallback((symbol: string, price: number) => {
        const fills = simExchange.processTick(symbol, price);
        const currentAccount = simExchange.getAccount();

        // Always refresh if equity changed or fills occurred
        // Using a simpler "always refresh" for reliability in UI syncing
        refreshState();

        return fills;
    }, [refreshState]);

    return (
        <SimulatedExchangeContext.Provider
            value={{
                account,
                positions,
                orders,
                history,
                isLoaded,
                placeOrder,
                cancelOrder,
                resetAccount,
                clearHistory,
                processTick
            }
            }
        >
            {children}
        </SimulatedExchangeContext.Provider>
    );
}

export function useSimulatedExchange() {
    const context = useContext(SimulatedExchangeContext);
    if (context === undefined) {
        throw new Error('useSimulatedExchange must be used within a SimulatedExchangeProvider');
    }
    return context;
}
