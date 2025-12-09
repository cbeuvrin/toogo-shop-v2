
import React, { useEffect, useState } from 'react';

export const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate progress filling up
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 2; // Increment by 2% every 30ms (approx 1.5s total)
            });
        }, 30);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
            <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8">
                {/* Base Mascot Image (Grayscale/Faded) */}
                <img
                    src="/assets/mascot-toogo.png"
                    alt="Toogo Mascot Background"
                    className="absolute inset-0 w-full h-full object-contain opacity-30 grayscale"
                />

                {/* Liquid Fill Effect Container */}
                <div
                    className="absolute inset-0 w-full h-full overflow-hidden transition-all duration-300 ease-out"
                    style={{
                        clipPath: `inset(${100 - progress}% 0 0 0)` // Fills from bottom to top
                    }}
                >
                    {/* Filled Mascot Image (Full Color) */}
                    <img
                        src="/assets/mascot-toogo.png"
                        alt="Toogo Mascot Filling"
                        className="absolute inset-0 w-full h-full object-contain animate-float-gentle"
                    />

                    {/* Liquid Waveline Overlay (Optional visual flair) */}
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-blue-400 opacity-50 blur-sm animate-pulse"
                        style={{ bottom: `${progress}%`, transition: 'bottom 0.03s linear' }}>
                    </div>
                </div>
            </div>

            {/* Loading Text */}
            <div className="flex flex-col items-center space-y-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 animate-pulse">
                    Cargando tu tienda...
                </h2>
                <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#1A73E8] rounded-full transition-all duration-100 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
