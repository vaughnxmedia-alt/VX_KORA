import { QRCodeSVG } from "qrcode.react";

type GuideQRCodeProps = {
  url: string;
  label?: string;
  size?: number;
  showText?: boolean;
};

export function GuideQRCode({
  url,
  label = "Read the full breakdown",
  size = 96,
  showText = true,
}: GuideQRCodeProps) {
  return (
    <figure className="inline-flex flex-col items-center gap-2 rounded-2xl border bg-white p-3 text-center shadow-sm">
      <QRCodeSVG value={url} size={size} level="M" includeMargin />
      {showText && (
        <figcaption className="max-w-[11rem] text-xs font-medium leading-snug text-muted-foreground">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
