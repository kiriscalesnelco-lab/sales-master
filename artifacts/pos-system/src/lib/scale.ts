import { useEffect, useRef, useState, useCallback } from "react";

export type ScaleMode = "wifi" | "serial" | "off";

export interface ScaleConfig {
  mode: ScaleMode;
  wifiUrl: string;
  wifiPollMs: number;
  serialBaudRate: number;
}

const STORAGE_KEY = "pos.scale.config";

export const defaultScaleConfig: ScaleConfig = {
  mode: "off",
  wifiUrl: "http://192.168.1.50/weight",
  wifiPollMs: 500,
  serialBaudRate: 9600,
};

export function loadScaleConfig(): ScaleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScaleConfig;
    return { ...defaultScaleConfig, ...JSON.parse(raw) };
  } catch { return defaultScaleConfig; }
}

export function saveScaleConfig(cfg: ScaleConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function parseWeight(input: string): number | null {
  // Accept JSON {"weight": 1.234} or {"value":...} or plain number "1.234 kg"
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const j = JSON.parse(trimmed);
    if (typeof j === "number") return j;
    if (typeof j?.weight === "number") return j.weight;
    if (typeof j?.value === "number") return j.value;
    if (typeof j?.kg === "number") return j.kg;
  } catch { /* fallthrough */ }
  const m = trimmed.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export interface UseScaleResult {
  weight: number | null;
  status: "idle" | "connecting" | "live" | "error";
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  tare: () => void;
}

export function useScale(config: ScaleConfig): UseScaleResult {
  const [weight, setWeight] = useState<number | null>(null);
  const [status, setStatus] = useState<UseScaleResult["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tareValue, setTareValue] = useState(0);

  const pollTimer = useRef<number | null>(null);
  const serialPort = useRef<any>(null);
  const serialReader = useRef<any>(null);
  const stopRequested = useRef(false);

  const setRaw = useCallback((v: number | null) => {
    if (v === null) return;
    setWeight(Math.max(0, v - tareValue));
  }, [tareValue]);

  const disconnect = useCallback(() => {
    stopRequested.current = true;
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    if (serialReader.current) { try { serialReader.current.cancel(); } catch {} serialReader.current = null; }
    if (serialPort.current) { try { serialPort.current.close(); } catch {} serialPort.current = null; }
    setStatus("idle");
    setWeight(null);
  }, []);

  const connect = useCallback(async () => {
    disconnect();
    stopRequested.current = false;
    setError(null);

    if (config.mode === "off") return;

    if (config.mode === "wifi") {
      setStatus("connecting");
      const tick = async () => {
        try {
          const res = await fetch(config.wifiUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const w = parseWeight(text);
          if (w !== null) setRaw(w);
          setStatus("live");
          setError(null);
        } catch (e: any) {
          setStatus("error");
          setError(e?.message ?? "Fetch failed");
        }
      };
      await tick();
      pollTimer.current = window.setInterval(tick, Math.max(100, config.wifiPollMs));
      return;
    }

    if (config.mode === "serial") {
      const nav: any = navigator;
      if (!nav.serial) {
        setStatus("error");
        setError("Web Serial not supported in this browser. Use Chrome/Edge over HTTPS.");
        return;
      }
      try {
        setStatus("connecting");
        const port = await nav.serial.requestPort();
        await port.open({ baudRate: config.serialBaudRate });
        serialPort.current = port;
        setStatus("live");

        const decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable).catch(() => {});
        const reader = decoder.readable.getReader();
        serialReader.current = reader;

        let buffer = "";
        (async () => {
          while (!stopRequested.current) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let nl;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              const w = parseWeight(line);
              if (w !== null) setRaw(w);
            }
          }
        })().catch(e => { setStatus("error"); setError(String(e?.message ?? e)); });
      } catch (e: any) {
        setStatus("error");
        setError(e?.message ?? "Serial connection failed");
      }
    }
  }, [config, disconnect, setRaw]);

  const tare = useCallback(() => {
    setTareValue(t => t + (weight ?? 0));
    setWeight(0);
  }, [weight]);

  useEffect(() => () => disconnect(), [disconnect]);

  return { weight, status, error, connect, disconnect, tare };
}
