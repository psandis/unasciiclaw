export type RampName = "classic" | "blocks" | "dense";

export const RAMPS: Record<RampName, string> = {
  classic: " .:-=+*#%@",
  blocks: " ░▒▓█",
  dense:
    " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@",
};

export const DEFAULT_RAMP: RampName = "classic";
export const RAMP_NAMES = Object.keys(RAMPS) as RampName[];
