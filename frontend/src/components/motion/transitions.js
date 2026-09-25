/**
 * Standardized Motion Timing & Curves for KaushalNexus
 * Based on production guidelines: snappy, intentional, subtle.
 */
export const transitions = {
  // Snappy micro-interactions (buttons, pills, dropdowns)
  micro: {
    duration: 0.16,
    ease: [0.16, 1, 0.3, 1],
  },
  // Normal UI transitions (cards, tabs, accordions)
  normal: {
    duration: 0.24,
    ease: [0.16, 1, 0.3, 1],
  },
  // Route and full page entrances
  page: {
    duration: 0.28,
    ease: [0.16, 1, 0.3, 1],
  },
  // Stagger timing
  staggerFast: 0.04,
  staggerNormal: 0.06,
};
