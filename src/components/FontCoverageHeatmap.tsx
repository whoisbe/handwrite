import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

interface FontCoverageHeatmapProps {
  fontFamily: string;
  coverage: Record<string, boolean>;
  onCharacterClick?: (char: string) => void;
}

// Alphanumeric layout: uppercase, lowercase, numbers
const KEYBOARD_LAYOUT = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
];

// Generate mock coverage data (65% of characters randomly selected)
export function generateMockCoverage(percentage: number = 0.65): Record<string, boolean> {
  const allChars: string[] = [];
  KEYBOARD_LAYOUT.forEach(row => {
    allChars.push(...row);
  });

  const totalChars = allChars.length;
  const coveredCount = Math.floor(totalChars * percentage);
  
  // Shuffle and select random characters
  const shuffled = [...allChars].sort(() => Math.random() - 0.5);
  const covered = new Set(shuffled.slice(0, coveredCount));
  
  const coverage: Record<string, boolean> = {};
  allChars.forEach(char => {
    coverage[char] = covered.has(char);
  });
  
  return coverage;
}

// Calculate coverage percentage
function calculateCoveragePercentage(coverage: Record<string, boolean>): number {
  const values = Object.values(coverage);
  if (values.length === 0) return 0;
  const covered = values.filter(Boolean).length;
  return Math.round((covered / values.length) * 100);
}

export default function FontCoverageHeatmap({
  fontFamily,
  coverage,
  onCharacterClick
}: FontCoverageHeatmapProps) {
  const coveragePercentage = useMemo(() => calculateCoveragePercentage(coverage), [coverage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Coverage percentage label */}
      <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 500, textAlign: 'center' }}>
        {coveragePercentage}% coverage
      </div>
      
      {/* Heatmap grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {KEYBOARD_LAYOUT.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            style={{ 
              display: 'flex', 
              flexDirection: 'row',
              gap: '4px', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              width: '100%'
            }}
          >
            {row.map((char) => {
              const isAvailable = coverage[char] ?? false;
              return (
                <Tooltip key={char}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onCharacterClick?.(char)}
                      style={{
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        flexShrink: 0,
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease-in-out',
                        border: '1px solid',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        userSelect: 'none',
                        cursor: onCharacterClick ? 'pointer' : 'default',
                        background: isAvailable 
                          ? 'linear-gradient(to bottom right, #34d399, #10b981)' 
                          : '#f3f4f6',
                        color: isAvailable ? '#ffffff' : '#6b7280',
                        borderColor: isAvailable ? '#059669' : '#d1d5db',
                      }}
                      onMouseEnter={(e) => {
                        if (isAvailable) {
                          e.currentTarget.style.background = 'linear-gradient(to bottom right, #10b981, #059669)';
                        } else {
                          e.currentTarget.style.background = '#e5e7eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAvailable) {
                          e.currentTarget.style.background = 'linear-gradient(to bottom right, #34d399, #10b981)';
                        } else {
                          e.currentTarget.style.background = '#f3f4f6';
                        }
                      }}
                      onMouseDown={(e) => {
                        if (onCharacterClick) {
                          e.currentTarget.style.transform = 'scale(0.95)';
                        }
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      aria-label={`Character ${char}: ${isAvailable ? 'Available' : 'Not available'}`}
                    >
                      {char}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{char}: {isAvailable ? 'Available' : 'Not available'}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
