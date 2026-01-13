import React, { useRef } from 'react';

interface CustomSliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}

export function CustomSlider({ value, onValueChange, min, max, step = 1, className }: CustomSliderProps) {
  const currentValue = value[0] ?? min;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  // Calculate percentage for gradient background
  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={`relative flex w-full touch-none select-none items-center ${className || ''}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
        style={{
          background: `linear-gradient(to right, #4F378A ${percentage}%, #e5e7eb ${percentage}%)`
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4F378A;
          margin-top: -2px; /* vertically center */
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type=range]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4F378A;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.1s;
        }
        input[type=range]::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
