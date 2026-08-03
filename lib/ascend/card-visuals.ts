import type { AscendProfileSlug } from "./profiles";

export const ASCEND_CARD_TOKENS = {
  canvas: { width: 1080, height: 1920 },
  safeMargin: 92,
  colors: {
    forest: "#071d18",
    forestDeep: "#02110e",
    cream: "#f5efdf",
    mist: "#c9d3cd",
    gold: "#d6b36a",
    white: "#ffffff"
  },
  typography: {
    display: 'Georgia, "Times New Roman", serif',
    sans: "Arial, Helvetica, sans-serif"
  }
} as const;

export type AscendCardVisual = {
  edition: string;
  motif: string;
  landscape?: string;
  focalPoint: { x: number; y: number };
};

export const ascendCardVisuals: Record<AscendProfileSlug, AscendCardVisual> = {
  "luna-tide": {
    edition: "001 / 008",
    motif: "Moon Lake",
    landscape: "/assets/ascend/landscapes/luna-tide-moon-lake.png",
    focalPoint: { x: 50, y: 35 }
  },
  "night-nectar": {
    edition: "002 / 008",
    motif: "Rain Pavilion",
    landscape: "/assets/ascend/landscapes/night-nectar-rain-pavilion.png",
    focalPoint: { x: 50, y: 40 }
  },
  evenfall: {
    edition: "003 / 008",
    motif: "Autumn Forest",
    landscape: "/assets/ascend/landscapes/evenfall-autumn-forest.png",
    focalPoint: { x: 52, y: 38 }
  },
  clearsky: {
    edition: "004 / 008",
    motif: "Cloud Valley",
    landscape: "/assets/ascend/landscapes/clearsky-cloud-valley.png",
    focalPoint: { x: 50, y: 42 }
  },
  monsoon: {
    edition: "005 / 008",
    motif: "Highland Rain",
    landscape: "/assets/ascend/landscapes/monsoon-highland-rain.png",
    focalPoint: { x: 50, y: 40 }
  },
  drift: {
    edition: "006 / 008",
    motif: "Ancient Tea Path",
    landscape: "/assets/ascend/landscapes/drift-ancient-tea-path.png",
    focalPoint: { x: 48, y: 38 }
  },
  stillearth: {
    edition: "007 / 008",
    motif: "Winter Silence",
    landscape: "/assets/ascend/landscapes/stillearth-winter-path.png",
    focalPoint: { x: 50, y: 42 }
  },
  cloudlift: {
    edition: "008 / 008",
    motif: "Highland Sunrise",
    landscape: "/assets/ascend/landscapes/cloudlift-highland-sunrise.png",
    focalPoint: { x: 50, y: 38 }
  }
};

export const finishedAscendCardSamples = [
  "luna-tide",
  "night-nectar",
  "evenfall",
  "clearsky",
  "monsoon",
  "drift",
  "stillearth",
  "cloudlift"
] as const satisfies readonly AscendProfileSlug[];
