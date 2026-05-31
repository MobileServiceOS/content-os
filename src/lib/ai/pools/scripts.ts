// Script skeletons keyed by length. The script generator fills beats with
// brand-aware content and the hook engine supplies the opening line.
export interface ScriptSkeleton {
  id: string;
  lengthSeconds: number;
  beats: string[]; // narration beats, in order
  onScreen: string[]; // on-screen text cues
  shots: string[]; // shot-list suggestions
}

export const SCRIPT_SKELETONS: ScriptSkeleton[] = [
  {
    id: 'script-15',
    lengthSeconds: 15,
    beats: [
      '{hook}',
      '{painPoint} A {service} in {city} sounds like a whole ordeal.',
      'It isn’t — we come to you and handle it on the spot.',
      '{cta}',
    ],
    onScreen: ['Flat tire?', 'We come to you', '{cta}'],
    shots: ['Open on the flat tire', 'Tech arriving', 'Quick repair', 'Driver rolling away'],
  },
  {
    id: 'script-30',
    lengthSeconds: 30,
    beats: [
      '{hook}',
      '{opener} a {city} driver hit a {service} situation at {timeOfDay}.',
      'One call, and we rolled out within {responseTime}.',
      'About {completionTime} later, the tire was sorted right there.',
      'No tow, no waiting room. {cta}',
    ],
    onScreen: ['{timeOfDay}', 'On the way', 'Fixed in {completionTime}', '{cta}'],
    shots: ['Driver on the phone', 'Van rolling out', 'Close-up of the repair', 'Handshake / drive off'],
  },
  {
    id: 'script-60',
    lengthSeconds: 60,
    beats: [
      '{hook}',
      '{opener} here’s how a real {service} call goes.',
      'A {vehicle} owner in {city} finds a flat — {painPoint}',
      'They call instead of panicking. We confirm an ETA of {responseTime}.',
      'We arrive, assess, and handle the {service} in about {completionTime}.',
      'They’re back on the road, no tow truck, no lost day.',
      'That’s the whole point. {cta}',
    ],
    onScreen: ['The call', 'The arrival', 'The fix', 'Back on the road', '{cta}'],
    shots: [
      'Driver discovers the flat',
      'Phone call + ETA on screen',
      'Van arriving',
      'Repair in progress',
      'Driver thanks the tech',
      'Drive away shot',
    ],
  },
];

export function pickSkeleton(lengthSeconds: number): ScriptSkeleton {
  // Nearest available skeleton by length.
  return SCRIPT_SKELETONS.reduce((best, s) =>
    Math.abs(s.lengthSeconds - lengthSeconds) < Math.abs(best.lengthSeconds - lengthSeconds)
      ? s
      : best,
  );
}
