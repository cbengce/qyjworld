import type { AscendProfile } from "./profiles";
import QRCode from "qrcode";

export const ASCEND_CARD_SIZE = { width: 1080, height: 1920 } as const;
export const ASCEND_SOCIAL_FORMATS = {
  instagramStory: ASCEND_CARD_SIZE,
  tiktok: ASCEND_CARD_SIZE,
  xiaohongshu: ASCEND_CARD_SIZE,
  facebookStory: ASCEND_CARD_SIZE,
  whatsappStatus: ASCEND_CARD_SIZE
} as const;
const WIDTH = ASCEND_CARD_SIZE.width;
const HEIGHT = ASCEND_CARD_SIZE.height;

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The brand mark could not be loaded."));
    image.src = source;
  });
}

export async function createAscendCard(profile: AscendProfile, referralCode: string): Promise<Blob> {
  await document.fonts.ready;
  const referralUrl = `https://qyjworld.com/en/ascend?ref=${referralCode}`;
  const qrDataUrl = await QRCode.toDataURL(referralUrl, { errorCorrectionLevel: "H", margin: 4, width: 600, color: { dark: "#071d18", light: "#ffffff" } });
  const [logo, qrCode] = await Promise.all([loadImage("/assets/qing-yun-jian-logo-official.png"), loadImage(qrDataUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Card generation is not supported in this browser.");

  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, profile.theme.background);
  gradient.addColorStop(0.7, profile.theme.background);
  gradient.addColorStop(1, profile.theme.glow);
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.globalAlpha = 0.14;
  context.fillStyle = profile.theme.accent;
  context.beginPath(); context.arc(850, 300, 390, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.arc(180, 1520, 520, 0, Math.PI * 2); context.fill();
  context.globalAlpha = 1;

  context.fillStyle = "rgba(255,255,255,0.08)";
  roundedRect(context, 84, 96, 912, 1728, 42);
  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 2;
  context.strokeRect(108, 120, 864, 1680);

  context.globalAlpha = 0.16;
  context.drawImage(logo, 445, 1300, 190, 190);
  context.globalAlpha = 1;
  context.textAlign = "center";
  context.fillStyle = profile.theme.accent;
  context.font = "700 28px system-ui, sans-serif";
  context.fillText("YOUR ASCEND PROFILE", 540, 250);
  context.fillStyle = "#ffffff";
  context.font = "600 150px Georgia, serif";
  context.fillText(profile.nameZh, 540, 510);
  context.font = "600 72px Georgia, serif";
  context.fillText(profile.nameEn, 540, 620);
  context.fillStyle = profile.theme.accent;
  context.font = "700 36px system-ui, sans-serif";
  context.fillText(profile.title, 540, 735);

  context.fillStyle = "rgba(255,255,255,0.88)";
  context.font = "500 28px system-ui, sans-serif";
  context.fillText(profile.keywords.slice(0, 3).join("  ·  "), 540, 830);
  context.fillStyle = "#ffffff";
  context.font = "500 54px Georgia, serif";
  const quoteLines = profile.quote.split(". ").map((line, index, list) => index < list.length - 1 ? `${line}.` : line);
  quoteLines.forEach((line, index) => context.fillText(line, 540, 1050 + index * 78));

  context.fillStyle = "rgba(255,255,255,0.78)";
  context.font = "700 27px system-ui, sans-serif";
  context.fillText("QING YUN JIAN", 540, 1235);
  context.fillStyle = profile.theme.accent;
  context.font = "600 25px system-ui, sans-serif";
  context.fillText("Born to Ascend", 540, 1280);

  context.globalAlpha = 1;
  context.drawImage(qrCode, 443, 1525, 194, 194);
  context.fillStyle = "#ffffff";
  context.font = "700 25px system-ui, sans-serif";
  context.fillText("DISCOVER YOURS", 540, 1770);
  context.fillStyle = profile.theme.accent;
  context.font = "600 22px system-ui, sans-serif";
  context.fillText("SCAN HERE", 540, 1810);
  context.fillStyle = "rgba(255,255,255,0.68)";
  context.font = "500 22px system-ui, sans-serif";
  context.fillText("qyjworld.com", 540, 1855);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The PNG could not be created.")), "image/png"));
}
