const sharp = require("sharp");
const path = require("path");

const iconsDir =
  "/Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/Logo & Icons";
const assetsDir =
  "/Users/ankitsinha/Documents/GitHub/Prompt_Closet-Claude/apps/mobile/assets";

const iconMap = {
  "Closet Icon.png": "tab-closet.png",
  "Add Icon.png": "tab-add.png",
  "Style Icon.png": "tab-style.png",
  "Search Icon.png": "tab-search.png",
  "History Icon.png": "tab-history.png",
  "Settings Icon.png": "tab-settings.png",
  "User Profile Icon.png": "tab-profile.png",
};

async function main() {
  for (const [srcName, destName] of Object.entries(iconMap)) {
    const src = path.join(iconsDir, srcName);
    const dest = path.join(assetsDir, destName);
    await sharp(src)
      .resize(48, 48, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(dest);
    console.log(`Saved ${destName}`);
  }
  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
