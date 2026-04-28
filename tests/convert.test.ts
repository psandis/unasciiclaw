import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { convertFromAscii } from "../src/convert.js";

const tmp = (name: string) => join(tmpdir(), `unascii-test-${name}`);

const BASE = { ramp: "classic" as const, invert: false, color: false, scale: 1, fixAspect: false };

describe("convertFromAscii", () => {
  it("grayscale: output has correct dimensions", async () => {
    const output = tmp("dims.png");
    await convertFromAscii(" .:-=+*#%@\n .:-=+*#%@", { ...BASE, output });
    const m = await sharp(output).metadata();
    expect(m.width).toBe(10);
    expect(m.height).toBe(2);
  });

  it("grayscale: space maps to black, @ maps to white", async () => {
    const output = tmp("brightness.png");
    await convertFromAscii(" @", { ...BASE, output });
    const { data } = await sharp(output).grayscale().raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(255);
  });

  it("grayscale: invert flips brightness", async () => {
    const output = tmp("invert.png");
    await convertFromAscii(" @", { ...BASE, invert: true, output });
    const { data } = await sharp(output).grayscale().raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(0);
  });

  it("scale multiplies dimensions", async () => {
    const output = tmp("scale.png");
    await convertFromAscii(" .:-=+*#%@", { ...BASE, scale: 4, output });
    const m = await sharp(output).metadata();
    expect(m.width).toBe(40);
    expect(m.height).toBe(4);
  });

  it("fixAspect doubles height", async () => {
    const output = tmp("aspect.png");
    await convertFromAscii(" .:-=+*#%@", { ...BASE, fixAspect: true, output });
    const m = await sharp(output).metadata();
    expect(m.width).toBe(10);
    expect(m.height).toBe(2);
  });

  it("color: extracts RGB from ANSI codes", async () => {
    // \x1b[38;2;R;G;Bm{char}\x1b[39m — same format chalk.rgb() emits
    const text = "\x1b[38;2;255;0;0mA\x1b[39m\x1b[38;2;0;255;0mB\x1b[39m";
    const output = tmp("color.png");
    await convertFromAscii(text, { ...BASE, color: true, output });
    const { data } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
    expect(data[3]).toBe(0);
    expect(data[4]).toBe(255);
    expect(data[5]).toBe(0);
  });

  it("jpg output writes jpeg format", async () => {
    const output = tmp("out.jpg");
    await convertFromAscii(" .:-=+*#%@", { ...BASE, output });
    const m = await sharp(output).metadata();
    expect(m.format).toBe("jpeg");
  });

  it("throws on empty input", async () => {
    await expect(convertFromAscii("", { ...BASE, output: tmp("empty.png") })).rejects.toThrow(
      "Input is empty",
    );
  });
});
