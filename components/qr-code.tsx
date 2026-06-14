import QRCode from "qrcode";

/**
 * Real, scannable QR code rendered as inline SVG (generated server-side, no
 * client JS). High contrast for reliable scanning; style the wrapper, not the
 * modules.
 */
export async function QrCode({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  let svg = "";
  try {
    svg = await QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: size,
      errorCorrectionLevel: "M",
      color: { dark: "#070808", light: "#ffffff" },
    });
  } catch {
    svg = "";
  }

  if (!svg) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-label="QR code unavailable"
      />
    );
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={`QR code linking to ${value}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
