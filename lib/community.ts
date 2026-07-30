export const ASCEND_COMMUNITY = {
  heading: "JOIN THE ASCEND COMMUNITY",
  supportingLines: ["Exclusive Offers", "New Creations", "Member Privileges", "Events"],
  compactHeading: "Stay Connected",
  compactText: "Join the Ascend Community for new creations, member privileges, special invitations and upcoming events.",
  buttonLabel: "Join Community",
  note: "Scan the QR code or tap the button to join.",
  qrAlt: "QING YUN JIAN Ascend Members WhatsApp Community QR code",
  qrImagePath: "/assets/community/ascend-community-whatsapp-qr.jpeg",
  inviteUrl: process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL?.trim() || ""
} as const;

export function getAscendCommunityInviteUrl() {
  const url = ASCEND_COMMUNITY.inviteUrl;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
