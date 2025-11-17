/**
 * Easing functions for natural animation
 */

export type EasingFunction = (t: number) => number;

export const easings = {
  linear: (t: number): number => t,
  
  easeIn: (t: number): number => t * t,
  
  easeOut: (t: number): number => t * (2 - t),
  
  easeInOut: (t: number): number => {
    if (t < 0.5) {
      return 2 * t * t;
    } else {
      return -1 + (4 - 2 * t) * t;
    }
  }
};

export type EasingType = keyof typeof easings;
