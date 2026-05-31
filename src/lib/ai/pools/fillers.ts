// Phrasing variants for token substitution. The provider rotates these so two
// outputs from the same structure still read differently.
export const FILLERS = {
  // Non-banned openers (never "Thank you…", "A customer in…", "Wheel Rush completed…").
  opener: ['Last week,', 'The other day,', 'Not long ago,', 'Picture this:', 'True story:'],
  transition: ['Good news —', 'Here’s the thing:', 'So', 'Honestly,', 'Bottom line:'],
  closer: ['That’s the difference.', 'Simple as that.', 'No drama.', 'Back to your day.'],
  painPoint: [
    'A flat never picks a good time.',
    'Nobody plans for a blowout.',
    'A slow leak sneaks up on you.',
    'A nail in the tread ruins a morning fast.',
  ],
  benefit: ['back on the road fast', 'no tow truck needed', 'done right where you are'],
} as const;

export type FillerKey = keyof typeof FILLERS;
