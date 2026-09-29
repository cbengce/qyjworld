import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedAppzposToken = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function decodeKey(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("APPZPOS token encryption key must decode to exactly 32 bytes.");
  return key;
}

export function encryptAppzposToken(accessToken: string, encodedKey: string): EncryptedAppzposToken {
  if (!accessToken) throw new Error("APPZPOS access token is required.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64")
  };
}

export function decryptAppzposToken(token: EncryptedAppzposToken, encodedKey: string) {
  const decipher = createDecipheriv("aes-256-gcm", decodeKey(encodedKey), Buffer.from(token.iv, "base64"));
  decipher.setAuthTag(Buffer.from(token.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(token.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}
