import { useState, useCallback } from "react"

interface AdaptiveConfig {
    enabled: boolean
    channelShiftFactor: number // 0-1
    profitOffset: number
    strategyAction: "buy" | "sell"
}

export function useAdaptiveScalar(config: AdaptiveConfig) {
    const [cumulativeShift, setCumulativeShift] = useState(0)

    // Call this function when the execution engine confirms a profit order fill
    const onProfitFill = useCallback(() => {
        if (!config.enabled) return

        const shiftStep = config.profitOffset * config.channelShiftFactor

        setCumulativeShift(prev => {
            // For Buy Strategies (Long):
            // We bought low, took profit high. 
            // "shift all channel price levels upward" to follow the trend up.
            if (config.strategyAction === "buy") {
                return prev + shiftStep
            }
            // For Sell Strategies (Short):
            // We sold high, took profit low.
            // "shift them downward" to follow the trend down.
            else {
                return prev - shiftStep
            }
        })
    }, [config.enabled, config.profitOffset, config.channelShiftFactor, config.strategyAction])

    const resetShift = useCallback(() => setCumulativeShift(0), [])

    return {
        cumulativeShift,
        onProfitFill,
        resetShift
    }
}
