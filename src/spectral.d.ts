declare module 'spectral.js' {
  export class Color {
    constructor(c: string | number[]);
    sRGB: number[];
    tintingStrength: number;
  }
  /** Pigment mix of colours by weight (Kubelka-Munk): blue and yellow make green, as paint does. */
  export function mix(...pairs: [Color, number][]): Color;
}
