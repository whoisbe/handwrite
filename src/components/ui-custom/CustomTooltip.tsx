import React, { useState } from 'react';

interface CustomTooltipProps {
    children: React.ReactNode;
    content: string | React.ReactNode;
}

export function CustomTooltip({ children, content }: CustomTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-sm opacity-100 transition-opacity bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 whitespace-nowrap pointer-events-none">
                    {content}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
}
