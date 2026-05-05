import QRCode from "qrcode";
import { randomBytes } from "crypto";

export async function generateQRDataURL(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#793000",
      light: "#ffffff",
    },
  });
}

export function generateToken(): string {
  return randomBytes(6).toString("base64url");
}
