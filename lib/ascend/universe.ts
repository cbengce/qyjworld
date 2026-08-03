export const ASCEND_UNIVERSE_VERSION = "1.0" as const;

export const ASCEND_UNIVERSE_PALETTE = {
  deepForest: "#0B211A",
  softJade: "#789485",
  stoneGrey: "#7A7D78",
  mistWhite: "#F2F0E9",
  morningGold: "#C7A25B",
  moonSilver: "#C7CCCA",
  teaBrown: "#6D5943",
  mutedOlive: "#68725A"
} as const;

export type AscendUniverseCollection = "origins" | "journey" | "tea-worlds" | "ascend" | "legacy";

export type AscendUniverseMaster = {
  id: string;
  collection: AscendUniverseCollection;
  title: string;
  visualRoute: string;
  atmosphere: string;
  asset: string;
};

export const ASCEND_UNIVERSE_MASTERS = [
  { id: "AU-001", collection: "origins", title: "The First Ascent", visualRoute: "Rain-dark stone path through rising tea terraces", atmosphere: "Morning mist after rain", asset: "/assets/ascend/universe/masters/01-origins-the-first-ascent.png" },
  { id: "AU-002", collection: "journey", title: "Higher Ground", visualRoute: "Mountain steps rising into clearing cloud", atmosphere: "Rain after sunrise", asset: "/assets/ascend/universe/masters/02-journey-higher-ground.png" },
  { id: "AU-003", collection: "tea-worlds", title: "Luna Tide", visualRoute: "Moonlit water drawing the eye toward distant elevation", atmosphere: "Moonlight and mountain spring mist", asset: "/assets/ascend/universe/masters/03-tea-world-luna-tide.png" },
  { id: "AU-004", collection: "tea-worlds", title: "Clearsky", visualRoute: "Stone overlook opening above a cloud valley", atmosphere: "Clear highland morning", asset: "/assets/ascend/universe/masters/04-tea-world-clearsky.png" },
  { id: "AU-005", collection: "tea-worlds", title: "Monsoon", visualRoute: "Wind-shaped terrain rising beyond tropical rain", atmosphere: "Rain clearing over highland green", asset: "/assets/ascend/universe/masters/05-tea-world-monsoon.png" },
  { id: "AU-006", collection: "tea-worlds", title: "Drift", visualRoute: "Quiet bridge and path disappearing into layered mist", atmosphere: "Cool air and measured movement", asset: "/assets/ascend/universe/masters/06-tea-world-drift.png" },
  { id: "AU-007", collection: "tea-worlds", title: "Cloudlift", visualRoute: "Highland steps ascending through cloud inversion", atmosphere: "Restrained sunrise above mist", asset: "/assets/ascend/universe/masters/07-tea-world-cloudlift.png" },
  { id: "AU-008", collection: "tea-worlds", title: "Evenfall", visualRoute: "A natural threshold framing moonlit distance", atmosphere: "Quiet evening after rain", asset: "/assets/ascend/universe/masters/08-tea-world-evenfall.png" },
  { id: "AU-009", collection: "ascend", title: "Quiet Focus", visualRoute: "Bamboo-shadowed path rising toward soft light", atmosphere: "Dew and diffused morning mist", asset: "/assets/ascend/universe/masters/09-ascend-quiet-focus.png" },
  { id: "AU-010", collection: "legacy", title: "The Next Horizon", visualRoute: "Tropical reservoir path rising toward Singapore's future", atmosphere: "Sunrise after tropical rain", asset: "/assets/ascend/universe/masters/10-legacy-next-horizon.png" }
] as const satisfies readonly AscendUniverseMaster[];
