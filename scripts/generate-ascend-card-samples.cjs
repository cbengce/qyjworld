const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "docs", "ascend-card-samples");
const logoPath = path.join(root, "public", "assets", "qing-yun-jian-logo-official.png");
const colors = { forestDeep: "#02110e", cream: "#f5efdf", gold: "#d6b36a" };

const samples = [
  {
    slug: "luna-tide",
    nameEn: "LUNA TIDE",
    nameZh: "月汐",
    title: "CALM CLARITY",
    quote: ["Move gently.", "Rise steadily."],
    edition: "01 / 08",
    motif: "MOON LAKE",
    referralCode: "a10c0a1100000001",
    landscape: "luna-tide-moon-lake.png"
  },
  {
    slug: "night-nectar",
    nameEn: "NIGHT NECTAR",
    nameZh: "星津",
    title: "CREATIVE ENERGY",
    quote: ["Stay curious.", "Let inspiration rise."],
    edition: "02 / 08",
    motif: "RAIN PAVILION",
    referralCode: "a10c0a1100000002",
    landscape: "night-nectar-rain-pavilion.png"
  },
  {
    slug: "evenfall",
    nameEn: "EVENFALL",
    nameZh: "归岚",
    title: "GENTLE COMPANION",
    quote: ["Stay gentle.", "Keep moving upward."],
    edition: "03 / 08",
    motif: "AUTUMN FOREST",
    referralCode: "a10c0a1100000003",
    landscape: "evenfall-autumn-forest.png"
  },
  {
    slug: "clearsky",
    nameEn: "CLEARSKY",
    nameZh: "破云",
    title: "FRESH PERSPECTIVE",
    quote: ["Breathe deeply.", "Begin again."],
    edition: "04 / 08",
    motif: "CLOUD VALLEY",
    referralCode: "a10c0a1100000004",
    landscape: "clearsky-cloud-valley.png"
  },
  {
    slug: "monsoon",
    nameEn: "MONSOON",
    nameZh: "长风",
    title: "BOLD EXPLORER",
    quote: ["Move boldly.", "Ascend freely."],
    edition: "05 / 08",
    motif: "HIGHLAND RAIN",
    referralCode: "a10c0a1100000005",
    landscape: "monsoon-highland-rain.png"
  },
  {
    slug: "drift",
    nameEn: "DRIFT",
    nameZh: "云隐",
    title: "FREE SPIRIT",
    quote: ["Flow naturally.", "Rise in your own way."],
    edition: "06 / 08",
    motif: "ANCIENT TEA PATH",
    referralCode: "a10c0a1100000006",
    landscape: "drift-ancient-tea-path.png"
  },
  {
    slug: "stillearth",
    nameEn: "STILLEARTH",
    nameZh: "山止",
    title: "GROUNDED STRENGTH",
    quote: ["Stand steady.", "Ascend with purpose."],
    edition: "07 / 08",
    motif: "WINTER SILENCE",
    referralCode: "a10c0a1100000007",
    landscape: "stillearth-winter-path.png"
  },
  {
    slug: "cloudlift",
    nameEn: "CLOUDLIFT",
    nameZh: "扶摇",
    title: "OPTIMISTIC DREAMER",
    quote: ["Look upward.", "Let the journey lift you."],
    edition: "08 / 08",
    motif: "HIGHLAND SUNRISE",
    referralCode: "a10c0a1100000008",
    landscape: "cloudlift-highland-sunrise.png"
  }
];

function dataUri(filePath, mimeType = "image/png") {
  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function render(sample) {
  const landscape = dataUri(path.join(root, "public", "assets", "ascend", "landscapes", sample.landscape));
  const logo = dataUri(logoPath);
  const qr = await QRCode.toDataURL(`https://qyjworld.com/en/ascend?ref=${sample.referralCode}`, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 600,
    color: { dark: colors.forestDeep, light: colors.cream }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="lower" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02110e" stop-opacity="0"/><stop offset=".42" stop-color="#02110e" stop-opacity=".35"/><stop offset=".72" stop-color="#02110e" stop-opacity=".92"/><stop offset="1" stop-color="#02110e"/></linearGradient>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02110e" stop-opacity=".52"/><stop offset="1" stop-color="#02110e" stop-opacity="0"/></linearGradient>
    <style>
      .sans { font-family: Arial, Helvetica, sans-serif; }
      .serif { font-family: Georgia, 'Times New Roman', serif; }
      .series { font-size: 24px; font-weight: 700; letter-spacing: 4px; }
      .mark { font-size: 18px; font-weight: 700; letter-spacing: 3px; }
      .identity { font-size: 102px; font-weight: 500; }
      .archetype { font-size: 29px; font-weight: 700; letter-spacing: 4px; }
      .quote { font-size: 58px; font-weight: 500; }
      .brand { font-size: 23px; font-weight: 700; letter-spacing: 3px; }
      .tagline { font-size: 19px; font-weight: 600; letter-spacing: 3px; }
      .discovery { font-size: 16px; font-weight: 700; letter-spacing: 2px; }
    </style>
  </defs>
  <image href="${landscape}" width="1080" height="1920" preserveAspectRatio="xMidYMid slice"/>
  <rect y="780" width="1080" height="1140" fill="url(#lower)"/>
  <rect width="1080" height="360" fill="url(#top)"/>
  <rect x="46" y="46" width="988" height="1828" fill="none" stroke="#d6b36a" stroke-opacity=".42" stroke-width="2"/>
  <text x="92" y="138" class="sans series" fill="#f5efdf">THE ASCEND SERIES</text>
  <text x="988" y="138" class="sans series" fill="#d6b36a" text-anchor="end">${sample.edition}</text>
  <text x="92" y="186" class="sans mark" fill="#f5efdf" fill-opacity=".68">IDENTITY / ${sample.motif}</text>
  <text x="92" y="1196" class="serif identity" fill="#f5efdf">${escapeXml(sample.nameEn)}</text>
  <text x="92" y="1270" class="sans archetype" fill="#d6b36a">${sample.nameZh}  ·  ${sample.title}</text>
  <text x="92" y="1418" class="serif quote" fill="#f5efdf"><tspan x="92">${escapeXml(sample.quote[0])}</tspan><tspan x="92" dy="72">${escapeXml(sample.quote[1])}</tspan></text>
  <image href="${logo}" x="92" y="1666" width="118" height="118" preserveAspectRatio="xMidYMid meet"/>
  <text x="234" y="1713" class="sans brand" fill="#f5efdf">QING YUN JIAN</text>
  <text x="234" y="1750" class="sans tagline" fill="#d6b36a">BORN TO ASCEND</text>
  <rect x="810" y="1620" width="186" height="186" fill="#f5efdf"/>
  <image href="${qr}" x="818" y="1628" width="170" height="170"/>
  <text x="903" y="1838" class="sans discovery" fill="#d6b36a" text-anchor="middle">DISCOVER YOURS</text>
  <text x="903" y="1866" class="sans discovery" fill="#f5efdf" fill-opacity=".62" text-anchor="middle">QYJWORLD.COM</text>
</svg>`;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const sample of samples) {
    fs.writeFileSync(path.join(outputDir, `${sample.slug}.svg`), await render(sample), "utf8");
    fs.writeFileSync(
      path.join(outputDir, `${sample.slug}.html`),
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#02110e}body{display:flex;justify-content:center}img{display:block;width:min(100%,1080px);height:auto;aspect-ratio:9/16}</style></head><body><img src="./${sample.slug}.svg" alt="${sample.nameEn} ASCEND collectible card"></body></html>`,
      "utf8"
    );
  }
  console.log(`Generated ${samples.length} ASCEND sample cards in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
