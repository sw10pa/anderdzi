const sharp = require("sharp");

async function main() {
  // Read ANDERDZI-02-01 (green triangle + text on white bg)
  const meta = await sharp("/home/v-stepanegu/anderdzi/app/src/assets/logo-green.png").metadata();

  // Triangle is roughly top 72% of image (text "ANDERDZI" is at the bottom)
  const triangleHeight = Math.round(meta.height * 0.72);

  const trimmed = await sharp("/home/v-stepanegu/anderdzi/app/src/assets/logo-green.png")
    .extract({ left: 0, top: 0, width: meta.width, height: triangleHeight })
    .trim()
    .toBuffer();

  const trimMeta = await sharp(trimmed).metadata();
  const size = Math.max(trimMeta.width, trimMeta.height) + 40;

  await sharp(trimmed)
    .resize({
      width: size,
      height: size,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile("/home/v-stepanegu/anderdzi/app/public/favicon-green.png");

  console.log("Green triangle favicon: " + size + "x" + size);
}

main().catch(console.error);
