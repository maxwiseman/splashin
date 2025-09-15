/* eslint-disable @next/next/no-img-element */
"use client";

import type { HTMLProps } from "react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { authClient } from "~/auth/client";

export function ProxyQRCode({
  username,
  password,
  host,
  port,
  style,
  ...props
}: {
  username?: string;
  password?: string;
  host: string;
  port: number;
} & HTMLProps<HTMLImageElement>) {
  const { data: session } = authClient.useSession();
  console.log("user", session?.user);
  const data = `http://${Buffer.from(`${username ?? session?.user.id}:${password ?? session?.user.secret}@${host}:${port}`, "utf-8").toString("base64")}?method=auto#Volantir`;
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const dataUrl = await QRCode.toDataURL(data);
      setSrc(dataUrl);
    })().catch(console.error);
  }, [data]);

  if (!(username || password) && !session) return null;
  return src ? (
    <img
      src={src}
      style={{ imageRendering: "pixelated", ...style }}
      alt="QR code"
      {...props}
    />
  ) : null;
}

export function ConfigQRCode({ style, ...props }: HTMLProps<HTMLImageElement>) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const dataUrl = await QRCode.toDataURL(
        "https://volantir.maxwiseman.io/volantir.conf",
      );
      setSrc(dataUrl);
    })().catch(console.error);
  }, []);

  return src ? (
    <img
      src={src}
      style={{ imageRendering: "pixelated", ...style }}
      alt="QR code"
      {...props}
    />
  ) : null;
}
