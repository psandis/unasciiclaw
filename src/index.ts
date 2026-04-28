import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { Command } from "commander";
import { convertFromAscii } from "./convert.js";
import { DEFAULT_RAMP, RAMP_NAMES, type RampName } from "./ramps.js";

const SUPPORTED_FORMATS = [".png", ".jpg", ".jpeg", ".webp"];

function defaultOutput(inputPath: string | undefined): string {
  if (!inputPath) return join("images", "output.png");
  const name = basename(inputPath, extname(inputPath));
  return join("images", `${name}.png`);
}

const program = new Command();

program
  .name("unascii")
  .description("Convert ASCII art to an image")
  .version("0.1.0")
  .argument("[input]", "path to ASCII art file (reads stdin if omitted)")
  .option("-o, --output <file>", "output image path (.png, .jpg, .webp)")
  .option("-r, --ramp <name>", "character ramp: classic | blocks | dense", DEFAULT_RAMP)
  .option("-i, --invert", "invert brightness mapping", false)
  .option("-c, --color", "input contains ANSI color codes, output a color image", false)
  .option("-s, --scale <number>", "upscale each character to NxN pixels", "1")
  .option(
    "--no-fix-aspect",
    "disable automatic 2x height stretch that corrects terminal aspect ratio",
  )
  .action(
    async (
      inputPath: string | undefined,
      opts: {
        output?: string;
        ramp: string;
        invert: boolean;
        color: boolean;
        scale: string;
        fixAspect: boolean;
      },
    ) => {
      const output = opts.output ?? defaultOutput(inputPath);
      const ext = extname(output).toLowerCase();

      if (!SUPPORTED_FORMATS.includes(ext)) {
        console.error(`Error: output format must be one of: ${SUPPORTED_FORMATS.join(", ")}`);
        process.exit(1);
      }

      if (!RAMP_NAMES.includes(opts.ramp as RampName)) {
        console.error(`Error: --ramp must be one of: ${RAMP_NAMES.join(", ")}`);
        process.exit(1);
      }

      const scale = parseInt(opts.scale, 10);
      if (Number.isNaN(scale) || scale < 1 || scale > 64) {
        console.error("Error: --scale must be a number between 1 and 64");
        process.exit(1);
      }

      let text: string;
      if (inputPath) {
        text = readFileSync(inputPath, "utf8");
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
        text = Buffer.concat(chunks).toString("utf8");
      }

      try {
        await convertFromAscii(text, {
          ramp: opts.ramp as RampName,
          invert: opts.invert,
          color: opts.color,
          scale,
          fixAspect: opts.fixAspect,
          output,
        });
        console.error(`Written: ${output}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    },
  );

program.parse();
