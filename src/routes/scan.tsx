import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/hospital/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAsset } from "@/lib/hospital/actions";

export const Route = createFileRoute("/scan")({ component: ScanPage });

function ScanPage() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;

    async function go(code: string) {
      const raw = code.replace(/^SL:/, "").trim();
      try {
        const res = await getAsset({ data: { id: raw } });
        if (res?.asset) {
          stopped = true;
          void nav({ to: "/assets/$id", params: { id: String(res.asset.id) } });
        } else setError("No asset for that code.");
      } catch {
        setError("Could not look up that code.");
      }
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!Detector) {
          setError("This browser cannot decode QR from camera. Enter the asset code below.");
          return;
        }
        const det = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              await go(codes[0].rawValue);
              return;
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(tick, 400);
        };
        void tick();
      } catch {
        setError("Camera permission denied. Type the asset code instead.");
      }
    })();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, nav]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Floor" title="Scan asset QR" description="Point at the Sightline code on equipment, or enter MED-OT-001." />
      <div className="overflow-hidden rounded-xl bg-fg shadow-[var(--shadow-border)]">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover" playsInline muted />
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => { setError(null); setActive(true); }}>{active ? "Scanning…" : "Start camera"}</Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <form
        className="mt-6 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const raw = manual.replace(/^SL:/, "").trim();
          const res = await getAsset({ data: { id: raw } });
          if (res?.asset) void nav({ to: "/assets/$id", params: { id: String(res.asset.id) } });
          else setError("No asset for that code.");
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="MED-OT-001" className="font-mono" />
        <Button type="submit">Open</Button>
      </form>
    </div>
  );
}
