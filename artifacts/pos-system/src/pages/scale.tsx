import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale as ScaleIcon, Wifi, Usb, Power, PowerOff, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  loadScaleConfig, saveScaleConfig, useScale,
  type ScaleConfig, type ScaleMode,
} from "@/lib/scale";

export default function ScalePage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ScaleConfig>(() => loadScaleConfig());
  const scale = useScale(config);

  const update = <K extends keyof ScaleConfig>(k: K, v: ScaleConfig[K]) =>
    setConfig(prev => ({ ...prev, [k]: v }));

  const persist = () => { saveScaleConfig(config); toast({ title: "Configuration saved" }); };

  const statusBadge = {
    idle: <Badge variant="outline">Disconnected</Badge>,
    connecting: <Badge className="bg-amber-500">Connecting…</Badge>,
    live: <Badge className="bg-green-600">Live</Badge>,
    error: <Badge variant="destructive">Error</Badge>,
  }[scale.status];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScaleIcon className="h-6 w-6" /> Weighing Scale
        </h2>
        <p className="text-muted-foreground text-sm">
          Connect to an ESP8266 weighing scale over WiFi or Serial USB for live weight reading.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>Choose how the POS reads weight from the scale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mode</Label>
              <Select value={config.mode} onValueChange={v => update("mode", v as ScaleMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off"><span className="flex items-center gap-2"><PowerOff className="h-4 w-4" /> Off</span></SelectItem>
                  <SelectItem value="wifi"><span className="flex items-center gap-2"><Wifi className="h-4 w-4" /> WiFi (HTTP)</span></SelectItem>
                  <SelectItem value="serial"><span className="flex items-center gap-2"><Usb className="h-4 w-4" /> Serial USB</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.mode === "wifi" && (
              <>
                <div>
                  <Label>ESP8266 Endpoint URL</Label>
                  <Input value={config.wifiUrl} onChange={e => update("wifiUrl", e.target.value)} placeholder="http://192.168.1.50/weight" />
                  <p className="text-xs text-muted-foreground mt-1">
                    The endpoint should return either a plain number, or JSON like <code>{`{"weight": 1.234}`}</code>.
                  </p>
                </div>
                <div>
                  <Label>Poll Interval (ms)</Label>
                  <Input type="number" min={100} value={config.wifiPollMs} onChange={e => update("wifiPollMs", Number(e.target.value))} />
                </div>
              </>
            )}

            {config.mode === "serial" && (
              <>
                <div>
                  <Label>Baud Rate</Label>
                  <Select value={String(config.serialBaudRate)} onValueChange={v => update("serialBaudRate", Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[9600, 19200, 38400, 57600, 115200].map(b => (
                        <SelectItem key={b} value={String(b)}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  When you click Connect, the browser will prompt you to choose the USB device. The ESP8266 should print one weight reading per line (e.g. <code>1.234</code> or <code>{`{"weight":1.234}`}</code>).
                </p>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={persist}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button variant="outline" onClick={() => { const d = loadScaleConfig(); setConfig(d); }}><RotateCcw className="h-4 w-4 mr-1" /> Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">Live Reading {statusBadge}</CardTitle>
            <CardDescription>Test the connection and verify the live weight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black rounded-lg p-8 text-center relative overflow-hidden">
              <div className="font-digital text-7xl text-red-500 relative" style={{ textShadow: "0 0 12px rgba(239,68,68,0.7)" }}>
                <span className="absolute inset-0 text-red-500/10">{"8".repeat(7)}.888</span>
                <span className="relative">{scale.weight !== null ? scale.weight.toFixed(3).padStart(8, " ") : "—.———"}</span>
              </div>
              <div className="text-red-400/80 font-digital text-xl mt-2 tracking-widest">kg</div>
            </div>
            {scale.error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded p-2">{scale.error}</div>
            )}
            <div className="flex gap-2">
              <Button onClick={scale.connect} disabled={config.mode === "off" || scale.status === "live" || scale.status === "connecting"} className="flex-1">
                <Power className="h-4 w-4 mr-1" /> Connect
              </Button>
              <Button variant="outline" onClick={scale.disconnect} disabled={scale.status === "idle"} className="flex-1">
                <PowerOff className="h-4 w-4 mr-1" /> Disconnect
              </Button>
              <Button variant="outline" onClick={scale.tare} disabled={scale.weight === null}>
                Tare
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Tip:</strong> Save your configuration first, then use the scale from the POS page (a "Use Scale" button will appear when configured).</p>
              <p>Web Serial USB requires Chrome or Edge and an HTTPS page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
