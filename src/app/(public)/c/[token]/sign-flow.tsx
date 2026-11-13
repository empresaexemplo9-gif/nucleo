"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, Download, Eraser, MapPin, PenLine, RefreshCcw, ScanFace } from "lucide-react";
import { Button, cn, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { signContract } from "@/actions/public";

type FaceDetectorCtor = new (o?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (src: CanvasImageSource) => Promise<unknown[]> };

export function SignFlow({
  token,
  signed: initialSigned,
  signedAt,
  requireSelfie,
  defaults,
  orgName,
}: {
  token: string;
  signed: boolean;
  signedAt: string | null;
  requireSelfie: boolean;
  defaults: { name: string; document: string };
  orgName: string;
}) {
  const [signed, setSigned] = useState(initialSigned);
  const [name, setName] = useState(defaults.name);
  const [doc, setDoc] = useState(defaults.document);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [faceCheck, setFaceCheck] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [geo, setGeo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  if (signed)
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-lg font-medium text-ok"><CheckCircle2 className="size-6" /> Documento assinado</p>
        <p className="text-sm text-fg-2">Sua assinatura foi registrada{signedAt ? ` em ${signedAt}` : ""}. {orgName} já foi avisada.</p>
        <a href={`/api/public/contract/${token}/pdf`}>
          <Button variant="secondary" className="w-full justify-between" trail={<Download className="size-3.5" />}>Baixar via assinada (PDF)</Button>
        </a>
      </div>
    );

  const ready = name.trim().length >= 3 && !!signature && (!requireSelfie || !!selfie) && consent;
  let step = 1;

  return (
    <div className="space-y-5">
      <Step n={step++} title="Seus dados" done={name.trim().length >= 3}>
        <div className="grid gap-2">
          <Field label="Nome completo"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
          <Field label="CPF / CNPJ"><Input value={doc} onChange={(e) => setDoc(e.target.value)} inputMode="numeric" /></Field>
        </div>
      </Step>
      {requireSelfie && (
        <Step n={step++} title="Captura facial" done={!!selfie}>
          <FaceCapture value={selfie} onCapture={(img, check) => { setSelfie(img); setFaceCheck(check); }} />
        </Step>
      )}
      <Step n={step++} title="Assinatura na tela" done={!!signature}>
        <SignaturePad onChange={setSignature} />
      </Step>
      <Step n={step++} title="Confirmação" done={consent}>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-fg-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
          <span>
            Li o documento e concordo em assiná-lo eletronicamente. Autorizo o registro de data, hora, IP, dispositivo{requireSelfie ? " e da minha imagem facial" : ""} exclusivamente como
            evidência desta assinatura, conforme a LGPD.
          </span>
        </label>
        <button
          type="button"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => setGeo(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`),
              () => toast("Localização não autorizada — tudo bem, ela é opcional", "error"),
            )
          }
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
        >
          <MapPin className="size-3.5" /> {geo ? `Localização: ${geo}` : "Incluir minha localização (opcional)"}
        </button>
      </Step>
      <Button
        className="w-full justify-between"
        trail
        disabled={!ready}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await signContract(token, { name, document: doc, signature: signature!, selfie, faceCheck, consent, geo });
            if (!r.ok) return toast(r.error, "error");
            toast(r.message ?? "Assinado");
            setSigned(true);
          })
        }
      >
        Assinar documento
      </Button>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className={cn("inline-flex size-6 items-center justify-center rounded-full border font-mono text-[11px]", done ? "border-transparent bg-[var(--ok)] text-white" : "border-line text-muted")}>
          {done ? <CheckCircle2 className="size-3.5" /> : n}
        </span>
        {title}
      </p>
      {children}
    </section>
  );
}

/** Câmera frontal com guia de enquadramento; usa o detector de rostos do navegador quando disponível. */
function FaceCapture({ value, onCapture }: { value: string | null; onCapture: (img: string | null, check: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOn(false);
  };
  useEffect(() => stop, []);
  // liga o vídeo assim que o elemento existir na tela
  useEffect(() => {
    const v = video.current;
    if (!on || !v || !stream.current) return;
    v.srcObject = stream.current;
    void v.play().catch(() => {});
  }, [on]);

  async function startCam() {
    setMsg("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      setOn(true);
    } catch {
      setMsg("Não foi possível acessar a câmera. Autorize o acesso nas permissões do navegador e tente novamente.");
    }
  }

  async function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) {
      setMsg("Aguarde a câmera iniciar e tente de novo.");
      return;
    }
    setMsg("");
    setBusy(true);
    const w = Math.min(960, v.videoWidth);
    const h = Math.round((v.videoHeight / v.videoWidth) * w);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.translate(w, 0);
    g.scale(-1, 1);
    g.drawImage(v, 0, 0, w, h);
    // brilho médio: evita fotos escuras/tampadas
    const px = g.getImageData(0, 0, w, h).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 16) sum += px[i]! * 0.299 + px[i + 1]! * 0.587 + px[i + 2]! * 0.114;
    const lum = sum / (px.length / 16);
    if (lum < 35) {
      setBusy(false);
      setMsg("Imagem muito escura. Procure um local iluminado.");
      return;
    }
    let check = "Captura facial pela câmera do aparelho";
    const FD = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
    if (FD) {
      try {
        const faces = await new FD({ fastMode: true, maxDetectedFaces: 2 }).detect(c);
        if (faces.length !== 1) {
          setBusy(false);
          setMsg(faces.length ? "Mais de um rosto encontrado. Fique sozinho no enquadramento." : "Nenhum rosto encontrado. Centralize o rosto no oval e tente de novo.");
          return;
        }
        check = "Rosto detectado automaticamente (1 rosto)";
      } catch {
        /* detector indisponível neste aparelho */
      }
    }
    onCapture(c.toDataURL("image/jpeg", 0.85), `${check} · ${w}×${h}px`);
    stop();
    setBusy(false);
  }

  if (value)
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Selfie capturada" className="size-24 rounded-[12px] border border-line object-cover" />
        <Button type="button" size="sm" variant="secondary" onClick={() => { onCapture(null, ""); void startCam(); }}><RefreshCcw className="size-3.5" /> Refazer</Button>
      </div>
    );
  return (
    <div className="space-y-2">
      {on ? (
        <div className="relative overflow-hidden rounded-[12px] border border-line bg-black">
          <video ref={video} playsInline muted className="aspect-[4/3] w-full -scale-x-100 object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[72%] w-[48%] rounded-[50%] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <Button type="button" size="sm" loading={busy} onClick={capture}><Camera className="size-3.5" /> Capturar</Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" className="w-full" onClick={startCam}><ScanFace className="size-4" /> Ativar câmera para a selfie</Button>
      )}
      {msg && <p className="text-xs text-err">{msg}</p>}
      <p className="text-[11px] text-muted">Rosto centralizado, sem óculos escuros ou boné, em local iluminado.</p>
    </div>
  );
}

/** Área de assinatura para dedo, caneta ou mouse (alta resolução). */
function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    let lastWidth = 0;
    const fit = () => {
      const r = c.getBoundingClientRect();
      // no celular a barra de endereço muda a altura ao rolar: só refaz quando a largura muda
      if (Math.round(r.width) === lastWidth) return;
      lastWidth = Math.round(r.width);
      const dpr = Math.max(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#111827";
      setEmpty(true);
      onChange(null);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [onChange]);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const export_ = () => {
    const c = ref.current!;
    const out = document.createElement("canvas");
    const scale = Math.min(1, 1400 / c.width);
    out.width = Math.round(c.width * scale);
    out.height = Math.round(c.height * scale);
    out.getContext("2d")!.drawImage(c, 0, 0, out.width, out.height);
    onChange(out.toDataURL("image/png"));
  };

  return (
    <div>
      <div className="relative rounded-[12px] border border-line bg-white">
        <canvas
          ref={ref}
          className="block h-44 w-full touch-none rounded-[12px]"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = pos(e);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const g = ref.current!.getContext("2d")!;
            const p = pos(e);
            g.lineWidth = e.pointerType === "pen" ? 1.2 + (e.pressure || 0.5) * 2.6 : 2.4;
            g.beginPath();
            g.moveTo(last.current.x, last.current.y);
            g.quadraticCurveTo(last.current.x, last.current.y, (last.current.x + p.x) / 2, (last.current.y + p.y) / 2);
            g.lineTo(p.x, p.y);
            g.stroke();
            last.current = p;
            if (empty) setEmpty(false);
          }}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
            if (!empty) export_();
          }}
          onPointerLeave={() => {
            if (drawing.current && !empty) export_();
            drawing.current = false;
          }}
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-sm text-neutral-400">
            <PenLine className="size-4" /> Assine aqui com o dedo, caneta ou mouse
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-neutral-300" />
      </div>
      <button
        type="button"
        onClick={() => {
          const c = ref.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          setEmpty(true);
          onChange(null);
        }}
        className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
      >
        <Eraser className="size-3.5" /> Limpar
      </button>
    </div>
  );
}
