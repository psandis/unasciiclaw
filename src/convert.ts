import sharp from "sharp";
import { RAMPS, type RampName } from "./ramps.js";

export interface ConvertOptions {
  ramp: RampName;
  invert: boolean;
  color: boolean;
  scale: number;
  fixAspect: boolean;
  output: string;
}

// chalk.rgb(r,g,b)(char) emits: \x1b[38;2;R;G;Bm{char}\x1b[...m
// Capture R, G, B from each colored character in the line.
function parseColorLine(line: string): Array<[number, number, number]> {
  const pixels: Array<[number, number, number]> = [];
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ESC byte is required to match ANSI color codes
  const re = /\x1b\[38;2;(\d+);(\d+);(\d+)m[\s\S]/g;
  for (const match of line.matchAll(re)) {
    pixels.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  }
  return pixels;
}

function parseGrayscaleLine(line: string, chars: string): number[] {
  return [...line].map((char) => {
    const idx = chars.indexOf(char);
    if (idx === -1) return 0;
    return Math.round((idx / (chars.length - 1)) * 255);
  });
}

export async function convertFromAscii(text: string, options: ConvertOptions): Promise<void> {
  const { ramp, invert, color, scale, fixAspect, output } = options;

  const rawLines = text.split("\n");
  const lines = rawLines[rawLines.length - 1] === "" ? rawLines.slice(0, -1) : rawLines;

  if (lines.length === 0) throw new Error("Input is empty");

  // asciiclaw halves output height to compensate for terminal char aspect ratio.
  // Doubling it here restores the original proportions.
  const scaleX = scale;
  const scaleY = fixAspect ? scale * 2 : scale;

  if (color) {
    const rows = lines.map(parseColorLine);
    const srcW = Math.max(...rows.map((r) => r.length));
    const srcH = lines.length;
    const outW = srcW * scaleX;
    const outH = srcH * scaleY;
    const pixels = Buffer.alloc(outW * outH * 3, 0);

    for (let y = 0; y < srcH; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const [r, g, b] = row[x];
        for (let sy = 0; sy < scaleY; sy++) {
          for (let sx = 0; sx < scaleX; sx++) {
            const i = ((y * scaleY + sy) * outW + (x * scaleX + sx)) * 3;
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
          }
        }
      }
    }

    await sharp(pixels, { raw: { width: outW, height: outH, channels: 3 } }).toFile(output);
  } else {
    const chars = invert ? RAMPS[ramp].split("").reverse().join("") : RAMPS[ramp];
    const rows = lines.map((line) => parseGrayscaleLine(line, chars));
    const srcW = Math.max(...rows.map((r) => r.length));
    const srcH = lines.length;
    const outW = srcW * scaleX;
    const outH = srcH * scaleY;
    const pixels = Buffer.alloc(outW * outH, 0);

    for (let y = 0; y < srcH; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const value = row[x];
        for (let sy = 0; sy < scaleY; sy++) {
          for (let sx = 0; sx < scaleX; sx++) {
            pixels[(y * scaleY + sy) * outW + (x * scaleX + sx)] = value;
          }
        }
      }
    }

    await sharp(pixels, { raw: { width: outW, height: outH, channels: 1 } })
      .toColorspace("b-w")
      .toFile(output);
  }
}
