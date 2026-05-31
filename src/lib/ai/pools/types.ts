// A Structure is one reusable template with token slots like {service}, {city}.
// The mock provider rotates across structures + categories to avoid repetition.
export interface Structure<Cat extends string = string> {
  id: string;
  category: Cat;
  template: string;
}

/** Group structures by category for round-robin selection. */
export function byCategory<C extends string>(
  structures: Structure<C>[],
): Record<string, Structure<C>[]> {
  const out: Record<string, Structure<C>[]> = {};
  for (const s of structures) (out[s.category] ??= []).push(s);
  return out;
}
