"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Info, TrendingUp, ShieldAlert, Zap, Layers, ArrowRightLeft } from "lucide-react"

interface WelcomeModalProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function WelcomeModal({ open: controlledOpen, onOpenChange }: WelcomeModalProps) {
    const [open, setOpen] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    useEffect(() => {
        const hasSeen = localStorage.getItem("sc_has_seen_welcome")
        if (!hasSeen && controlledOpen === undefined) {
            setOpen(true)
        }
    }, [controlledOpen])

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem("sc_has_seen_welcome", "true")
        }
        if (onOpenChange) {
            onOpenChange(false)
        } else {
            setOpen(false)
        }
    }

    const isOpen = controlledOpen !== undefined ? controlledOpen : open

    return (
        <Dialog open={isOpen} onOpenChange={(val) => {
            if (!val) handleClose()
            else if (onOpenChange) onOpenChange(val)
            else setOpen(val)
        }}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-extrabold tracking-tight">
                            Welcome to ScaleTradeX
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-base text-muted-foreground">
                        Advanced Adaptive Scalar Trading Platform. Designed for precision,
                        automated grid management, and intelligent risk control.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <section className="space-y-3">
                        <h3 className="font-bold flex items-center gap-2 text-primary">
                            <Layers className="h-4 w-4" /> The Scalar Edge
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            ScaleTradeX is built around a proprietary **Scalar Trading** engine.
                            Unlike traditional order entry, Scalar Trading allows you to deploy
                            intelligent grids that think like a pro trader.
                        </p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-border/50 bg-secondary/30 p-4 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span>Adaptive Grid</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Set your **Top** and **Bottom** prices. The system automatically
                                distributes your position size across multiple limit levels.
                            </p>
                        </div>
                        <div className="border border-border/50 bg-secondary/30 p-4 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                                <span>Adaptive Shift</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                **Our Unique Feature:** The trading channel can automatically drift
                                in the direction of profit, allowing you to ride trends without
                                manual resets.
                            </p>
                        </div>
                        <div className="border border-border/50 bg-secondary/30 p-4 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Info className="h-4 w-4 text-orange-500" />
                                <span>Auto Management</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enable **Take Profit** and **Restore Size** to let the engine
                                auto-harvest gains and refill the grid levels instantly.
                            </p>
                        </div>
                        <div className="border border-border/50 bg-secondary/30 p-4 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <ShieldAlert className="h-4 w-4 text-red-500" />
                                <span>Risk Protection</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                If the price escapes your defined channel, the system triggers
                                an **Emergency Stop**, clearing all orders and closing positions.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row items-center gap-4 sm:justify-between border-t border-border pt-4 mt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="dont-show"
                            checked={dontShowAgain}
                            onCheckedChange={(val) => setDontShowAgain(!!val)}
                        />
                        <Label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer">
                            Don't show this again
                        </Label>
                    </div>
                    <Button onClick={handleClose} className="w-full sm:w-auto px-8 font-bold">
                        Start Trading
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
