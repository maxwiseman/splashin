import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@splashin/ui/dialog";

import { ConfigQRCode, ProxyQRCode } from "./proxy-qr-code";

export default function SetupPage() {
  return (
    <div className="flex size-full items-center justify-center py-8">
      <ol className="marker:text-muted-foreground list-decimal">
        <li>
          Download{" "}
          <a
            className="underline"
            href="https://apps.apple.com/us/app/shadowrocket/id932747118"
          >
            ShadowRocket
          </a>
        </li>
        <li>
          Scan the{" "}
          <Dialog>
            <DialogTrigger className="underline">QR code</DialogTrigger> (top
            left button)
            <DialogContent>
              <DialogTitle className="sr-only">QR Code</DialogTitle>
              <ProxyQRCode
                host="volantir-proxy.maxwiseman.io"
                port={9090}
                className="aspect-square w-full"
              />
            </DialogContent>
          </Dialog>
        </li>
        <li>Go to the Config tab</li>
        <li>
          Scan the{" "}
          <Dialog>
            <DialogTrigger className="underline">QR code</DialogTrigger>
            <DialogContent>
              <DialogTitle className="sr-only">QR Code</DialogTitle>
              <ConfigQRCode className="aspect-square w-full" />
            </DialogContent>
          </Dialog>
        </li>
      </ol>
    </div>
  );
}
