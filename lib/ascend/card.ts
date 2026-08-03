import QRCode from "qrcode";
import { ASCEND_CARD_TOKENS, ascendCardVisuals } from "./card-visuals";
import type { AscendProfile } from "./profiles";

export const ASCEND_CARD_SIZE = ASCEND_CARD_TOKENS.canvas;
export const ASCEND_SOCIAL_FORMATS = {
  instagramStory: ASCEND_CARD_SIZE,
  tiktok: ASCEND_CARD_SIZE,
  xiaohongshu: ASCEND_CARD_SIZE,
  facebookStory: ASCEND_CARD_SIZE,
  whatsappStatus: ASCEND_CARD_SIZE
} as const;

const WIDTH = ASCEND_CARD_SIZE.width;
const HEIGHT = ASCEND_CARD_SIZE.height;
const { colors, typography, safeMargin } = ASCEND_CARD_TOKENS;

export function ascendCardReferralUrl(referralCode?: string | null) {
  return referralCode
    ? `https://qyjworld.com/en/ascend?ref=${referralCode}`
    : "https://qyjworld.com/en/ascend";
}

function loadImage(source: string, label: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`${label} could not be loaded.`));
    image.src = source;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  focalPoint: { x: number; y: number }
) {
  const scale = Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const overflowX = drawWidth - WIDTH;
  const overflowY = drawHeight - HEIGHT;
  const x = -overflowX * (focalPoint.x / 100);
  const y = -overflowY * (focalPoint.y / 100);
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawFallbackLandscape(context: CanvasRenderingContext2D, profile: AscendProfile) {
  const base = context.createLinearGradient(0, 0, 0, HEIGHT);
  base.addColorStop(0, profile.theme.glow);
  base.addColorStop(0.38, profile.theme.background);
  base.addColorStop(1, colors.forestDeep);
  context.fillStyle = base;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = colors.mist;
  context.lineWidth = 90;
  for (let index = 0; index < 4; index += 1) {
    context.beginPath();
    context.moveTo(-180, 470 + index * 130);
    context.bezierCurveTo(220, 300 + index * 150, 640, 760 + index * 60, 1260, 400 + index * 150);
    context.stroke();
  }
  context.restore();
}

function drawAtmosphere(context: CanvasRenderingContext2D) {
  const lowerShade = context.createLinearGradient(0, 780, 0, HEIGHT);
  lowerShade.addColorStop(0, "rgba(2,17,14,0)");
  lowerShade.addColorStop(0.42, "rgba(2,17,14,0.35)");
  lowerShade.addColorStop(0.72, "rgba(2,17,14,0.92)");
  lowerShade.addColorStop(1, colors.forestDeep);
  context.fillStyle = lowerShade;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const topShade = context.createLinearGradient(0, 0, 0, 360);
  topShade.addColorStop(0, "rgba(2,17,14,0.52)");
  topShade.addColorStop(1, "rgba(2,17,14,0)");
  context.fillStyle = topShade;
  context.fillRect(0, 0, WIDTH, 360);

  context.strokeStyle = "rgba(214,179,106,0.42)";
  context.lineWidth = 2;
  context.strokeRect(46, 46, WIDTH - 92, HEIGHT - 92);
}

function drawText(context: CanvasRenderingContext2D, profile: AscendProfile) {
  const visual = ascendCardVisuals[profile.slug];
  context.textBaseline = "alphabetic";
  context.textAlign = "left";

  context.fillStyle = colors.cream;
  context.font = `700 24px ${typography.sans}`;
  context.fillText("THE ASCEND SERIES", safeMargin, 138);
  context.textAlign = "right";
  context.fillStyle = colors.gold;
  context.fillText(visual.edition, WIDTH - safeMargin, 138);

  context.textAlign = "left";
  context.fillStyle = "rgba(245,239,223,0.68)";
  context.font = `700 18px ${typography.sans}`;
  context.fillText(`IDENTITY / ${visual.motif.toUpperCase()}`, safeMargin, 186);

  context.fillStyle = colors.cream;
  context.font = `500 102px ${typography.display}`;
  context.fillText(profile.nameEn, safeMargin, 1196);

  context.fillStyle = colors.gold;
  context.font = `700 29px ${typography.sans}`;
  context.fillText(`${profile.nameZh}  ·  ${profile.title}`, safeMargin, 1270);

  const quoteParts = profile.quote.split(". ").map((part, index, list) => index < list.length - 1 ? `${part}.` : part);
  context.fillStyle = colors.cream;
  context.font = `500 58px ${typography.display}`;
  quoteParts.slice(0, 2).forEach((line, index) => context.fillText(line, safeMargin, 1418 + index * 72));
}

function drawBrandAndDiscovery(
  context: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  qrCode: HTMLImageElement
) {
  const logoSize = 118;
  const logoY = 1666;
  context.drawImage(logo, safeMargin, logoY, logoSize, logoSize);

  context.fillStyle = colors.cream;
  context.font = `700 23px ${typography.sans}`;
  context.fillText("QING YUN JIAN", safeMargin + 142, logoY + 47);
  context.fillStyle = colors.gold;
  context.font = `600 19px ${typography.sans}`;
  context.fillText("BORN TO ASCEND", safeMargin + 142, logoY + 84);

  const qrSize = 170;
  const qrX = WIDTH - safeMargin - qrSize;
  const qrY = 1628;
  context.fillStyle = colors.cream;
  context.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
  context.drawImage(qrCode, qrX, qrY, qrSize, qrSize);
  context.textAlign = "center";
  context.fillStyle = colors.gold;
  context.font = `700 16px ${typography.sans}`;
  context.fillText("DISCOVER YOURS", qrX + qrSize / 2, qrY + qrSize + 40);
  context.fillStyle = "rgba(245,239,223,0.62)";
  context.font = `500 16px ${typography.sans}`;
  context.fillText("QYJWORLD.COM", qrX + qrSize / 2, qrY + qrSize + 68);
}

export async function createAscendCard(profile: AscendProfile, referralCode?: string | null): Promise<Blob> {
  await document.fonts.ready;
  const visual = ascendCardVisuals[profile.slug];
  const referralUrl = ascendCardReferralUrl(referralCode);
  const qrDataUrl = await QRCode.toDataURL(referralUrl, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 600,
    color: { dark: colors.forestDeep, light: colors.cream }
  });
  const [logo, qrCode, landscape] = await Promise.all([
    loadImage("/assets/qing-yun-jian-logo-official.png", "The official brand mark"),
    loadImage(qrDataUrl, "The referral QR code"),
    visual.landscape ? loadImage(visual.landscape, `${profile.nameEn} landscape`) : Promise.resolve(null)
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Card generation is not supported in this browser.");

  if (landscape) drawCover(context, landscape, visual.focalPoint);
  else drawFallbackLandscape(context, profile);
  drawAtmosphere(context);
  drawText(context, profile);
  drawBrandAndDiscovery(context, logo, qrCode);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The PNG could not be created.")),
      "image/png"
    );
  });
}
