import QRCode from "qrcode";
import { randomBytes } from "crypto";

export async function generateQRDataURL(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#7d5070",
      light: "#ffffff",
    },
  });
}

export function generateToken(): string {
  return randomBytes(6).toString("base64url");
}
