import { useEffect, useState } from "react";

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let alive = true;
    void import("qrcode").then((QR) =>
      QR.toString(value, {
        type: "svg",
        margin: 1,
        width: size,
        color: { dark: "#1c2422", light: "#00000000" },
      }).then((out) => {
        if (alive) setSvg(out);
      }),
    );
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!svg) return <div className="size-44 animate-pulse rounded-lg bg-surface-2" />;
  return (
    <div
      className="inline-block rounded-lg bg-surface p-2"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
