import React, { useRef, useState, useCallback, useEffect } from "react";

interface FocalPointPickerProps {
    imageUrl: string;
    value: string; // CSS object-position, e.g. "50% 30%"
    onChange: (value: string) => void;
}

/**
 * Converts legacy keyword positions (e.g. "center top") to percentages.
 */
function keywordToPercent(pos: string): { x: number; y: number } {
    const KEYWORDS: Record<string, number> = {
        left: 0, center: 50, right: 100, top: 0, bottom: 100,
    };
    const parts = pos.trim().split(/\s+/);
    if (parts.length === 2) {
        const xRaw = parts[0];
        const yRaw = parts[1];
        const x = xRaw.endsWith("%") ? parseFloat(xRaw) : KEYWORDS[xRaw] ?? 50;
        const y = yRaw.endsWith("%") ? parseFloat(yRaw) : KEYWORDS[yRaw] ?? 50;
        return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }
    return { x: 50, y: 50 };
}

export const FocalPointPicker = ({ imageUrl, value, onChange }: FocalPointPickerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const [pos, setPos] = useState(() => keywordToPercent(value || "50% 50%"));

    // Sync external value changes
    useEffect(() => {
        setPos(keywordToPercent(value || "50% 50%"));
    }, [value]);

    const updateFromEvent = useCallback(
        (clientX: number, clientY: number) => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
            const rounded = { x: Math.round(x), y: Math.round(y) };
            setPos(rounded);
            onChange(`${rounded.x}% ${rounded.y}%`);
        },
        [onChange]
    );

    // Mouse events
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        updateFromEvent(e.clientX, e.clientY);
    };
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current) return;
            updateFromEvent(e.clientX, e.clientY);
        },
        [updateFromEvent]
    );
    const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

    // Touch events
    const onTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        const t = e.touches[0];
        updateFromEvent(t.clientX, t.clientY);
    };
    const onTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isDragging.current) return;
            const t = e.touches[0];
            updateFromEvent(t.clientX, t.clientY);
        },
        [updateFromEvent]
    );
    const onTouchEnd = useCallback(() => { isDragging.current = false; }, []);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

    return (
        <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
                Arrastra el punto para enfocar lo que quieres mostrar
            </p>
            <div
                ref={containerRef}
                className="relative w-full aspect-[16/7] rounded-lg overflow-hidden cursor-crosshair select-none border border-border"
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                style={{ touchAction: "none" }}
            >
                {/* Image showing full photo */}
                <img
                    src={imageUrl}
                    alt="Selección de punto focal"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                        objectFit: "cover",
                        objectPosition: `${pos.x}% ${pos.y}%`,
                    }}
                    draggable={false}
                />

                {/* Dark overlay rings for contrast */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: `radial-gradient(circle 60px at ${pos.x}% ${pos.y}%, transparent 40px, rgba(0,0,0,0.25) 60px)`,
                }} />

                {/* Focal point marker */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    {/* Outer ring */}
                    <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5)] bg-white/20 backdrop-blur-sm" />
                        {/* Center dot */}
                        <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-sm border border-black/20" />
                        {/* Crosshair lines */}
                        <div className="absolute w-14 h-px bg-white/60" style={{ boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3)" }} />
                        <div className="absolute h-14 w-px bg-white/60" style={{ boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3)" }} />
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
                Posición: {pos.x}% · {pos.y}%
            </p>
        </div>
    );
};
