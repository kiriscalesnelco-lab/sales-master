import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts, getListProductsQueryKey, useCreateSale,
  useListCustomers, getListCustomersQueryKey,
  CreatePaymentItemPaymentType,
  type CreatePaymentItem,
  type Product,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Gift, ShoppingCart, Package,
  FileCheck, Sparkles, Scale as ScaleIcon, Power, PowerOff, Smartphone,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { loadScaleConfig, useScale } from "@/lib/scale";

type CartItem = Product & { cartQty: number };

const paymentMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash: { label: "Cash", icon: <Banknote className="h-4 w-4" />, color: "text-green-600" },
  card: { label: "Card", icon: <CreditCard className="h-4 w-4" />, color: "text-blue-600" },
  upi: { label: "UPI", icon: <Smartphone className="h-4 w-4" />, color: "text-indigo-600" },
  cheque: { label: "Cheque", icon: <FileCheck className="h-4 w-4" />, color: "text-purple-600" },
  voucher: { label: "Voucher", icon: <Gift className="h-4 w-4" />, color: "text-pink-600" },
  loyalty: { label: "Loyalty", icon: <Sparkles className="h-4 w-4" />, color: "text-amber-600" },
};

const UPI_KEY = "pos.upi.config";
function loadUpiConfig() {
  try { return JSON.parse(localStorage.getItem(UPI_KEY) ?? "{}"); } catch { return {}; }
}
function saveUpiConfig(cfg: { vpa: string; payeeName: string }) {
  localStorage.setItem(UPI_KEY, JSON.stringify(cfg));
}

export default function Pos() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: products } = useListProducts({ search: searchTerm }, { query: { queryKey: getListProductsQueryKey({ search: searchTerm }) } });
  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payments, setPayments] = useState<CreatePaymentItem[]>([{ paymentType: "cash", amount: 0 }]);
  const createSale = useCreateSale();

  // UPI config
  const [upiCfg, setUpiCfg] = useState(() => {
    const c = loadUpiConfig();
    return { vpa: c.vpa ?? "merchant@upi", payeeName: c.payeeName ?? "Retail POS" };
  });
  const persistUpi = (next: typeof upiCfg) => { setUpiCfg(next); saveUpiConfig(next); };

  // Weighing scale integration
  const [scaleConfig] = useState(() => loadScaleConfig());
  const [weighOpen, setWeighOpen] = useState(false);
  const [weighProductId, setWeighProductId] = useState<string>("");
  const scale = useScale(scaleConfig);
  const scaleEnabled = scaleConfig.mode !== "off";

  const captureWeight = () => {
    const prod = products?.find(p => p.id === Number(weighProductId));
    const w = scale.weight;
    if (!prod || !w || w <= 0) {
      toast({ title: "Select a product and capture a non-zero weight", variant: "destructive" });
      return;
    }
    setCart(prev => [...prev, { ...prod, cartQty: Number(w.toFixed(3)) }]);
    setWeighOpen(false);
    setWeighProductId("");
    scale.disconnect();
    toast({ title: `Added ${w.toFixed(3)} kg of ${prod.name}` });
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, cartQty: Math.max(1, item.cartQty + delta) } : item));
  };
  const removeFromCart = (id: number) => setCart(prev => prev.filter(item => item.id !== id));

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.salesPrice) * item.cartQty, 0);
  const paymentTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const remaining = totalAmount - paymentTotal;

  const openPayDialog = () => {
    if (cart.length === 0) return;
    setPayments([{ paymentType: "cash", amount: totalAmount }]);
    setPayDialogOpen(true);
  };

  const addPayment = () => setPayments([...payments, { paymentType: "cash", amount: Math.max(0, remaining) }]);
  const updatePayment = (idx: number, patch: Partial<CreatePaymentItem>) => setPayments(payments.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const removePayment = (idx: number) => setPayments(payments.filter((_, i) => i !== idx));

  const handleCheckout = () => {
    if (Math.abs(remaining) > 0.01) {
      return toast({ title: `Payment must total ₹${totalAmount.toFixed(2)}`, variant: "destructive" });
    }
    createSale.mutate({
      data: {
        saleDate: new Date().toISOString(),
        customerId: customerId ? Number(customerId) : null,
        details: cart.map(item => ({
          productId: item.id, qty: item.cartQty,
          salesPrice: Number(item.salesPrice), discount: 0,
        })),
        payments: payments.filter(p => Number(p.amount) > 0).map(p => ({ paymentType: p.paymentType, amount: Number(p.amount) })),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Sale completed successfully" });
        setCart([]); setCustomerId(""); setPayDialogOpen(false);
        qc.invalidateQueries();
      },
      onError: () => toast({ title: "Failed to complete sale", variant: "destructive" })
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search products by name or code..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {scaleEnabled && (
            <Button variant="outline" onClick={() => { setWeighOpen(true); scale.connect(); }}>
              <ScaleIcon className="h-4 w-4 mr-1" /> Use Scale
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-3 gap-4 pb-4">
            {products?.map(product => (
              <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors hover:shadow-md" onClick={() => addToCart(product)}>
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-20 w-20 bg-muted rounded-md mb-3 flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div className="font-medium text-sm line-clamp-2 min-h-[40px]">{product.name}</div>
                  <div className="text-primary font-bold mt-1">₹{Number(product.salesPrice).toFixed(2)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Card className="w-[420px] flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle>Current Order</CardTitle>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walkin">Walk-in customer</SelectItem>
              {customers?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({Number(c.loyaltyPoints).toFixed(0)} pts)</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-muted-foreground text-xs">₹{Number(item.salesPrice).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm">{item.cartQty}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                    <div className="w-16 text-right font-medium text-sm">₹{(Number(item.salesPrice) * item.cartQty).toFixed(2)}</div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="mt-auto border-t p-4 bg-muted/30">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>₹{totalAmount.toFixed(2)}</span></div>
          </div>
          <Button className="w-full h-14 text-lg font-bold" disabled={cart.length === 0} onClick={openPayDialog}>
            Checkout — Pay ₹{totalAmount.toFixed(2)}
          </Button>
        </div>
      </Card>

      <Dialog open={weighOpen} onOpenChange={(o) => { setWeighOpen(o); if (!o) scale.disconnect(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ScaleIcon className="h-5 w-5" /> Weigh Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Select value={weighProductId} onValueChange={setWeighProductId}>
                <SelectTrigger><SelectValue placeholder="Select weighable product" /></SelectTrigger>
                <SelectContent>
                  {products?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — ₹{Number(p.salesPrice).toFixed(2)}/kg</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-black rounded-lg p-6 text-center relative overflow-hidden">
              <div className="font-digital text-6xl text-red-500 relative" style={{ textShadow: "0 0 10px rgba(239,68,68,0.7)" }}>
                <span className="absolute inset-0 text-red-500/10">8888.888</span>
                <span className="relative">{scale.weight !== null ? scale.weight.toFixed(3).padStart(8, " ") : "—.———"}</span>
              </div>
              <div className="text-red-400/80 font-digital text-base mt-1 tracking-widest">kg</div>
              <div className="mt-2 text-sm">
                {scale.status === "live" && <span className="text-green-600 font-medium">● Live</span>}
                {scale.status === "connecting" && <span className="text-amber-600 font-medium">Connecting…</span>}
                {scale.status === "error" && <span className="text-destructive font-medium">{scale.error}</span>}
                {scale.status === "idle" && <span className="text-muted-foreground">Disconnected</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={scale.connect} disabled={scale.status === "live"} className="flex-1">
                <Power className="h-4 w-4 mr-1" /> Connect
              </Button>
              <Button variant="outline" onClick={scale.disconnect} disabled={scale.status === "idle"} className="flex-1">
                <PowerOff className="h-4 w-4 mr-1" /> Disconnect
              </Button>
              <Button variant="outline" onClick={scale.tare} disabled={scale.weight === null}>Tare</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeighOpen(false)}>Cancel</Button>
            <Button onClick={captureWeight} disabled={!weighProductId || !scale.weight}>
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Process Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-medium">Total Due</span>
              <span className="text-2xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label>Split payment across methods</Label>
              {payments.map((p, idx) => {
                const meta = paymentMeta[p.paymentType];
                return (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={p.paymentType} onValueChange={v => updatePayment(idx, { paymentType: v as CreatePaymentItem["paymentType"] })}>
                      <SelectTrigger className="w-36">
                        <span className="flex items-center gap-2"><span className={meta.color}>{meta.icon}</span>{meta.label}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(CreatePaymentItemPaymentType).map(t => (
                          <SelectItem key={t} value={t}>
                            <span className="flex items-center gap-2"><span className={paymentMeta[t].color}>{paymentMeta[t].icon}</span>{paymentMeta[t].label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="0.00" value={p.amount} onChange={e => updatePayment(idx, { amount: Number(e.target.value) })} />
                    {payments.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removePayment(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={addPayment} className="w-full">
                <Plus className="h-3 w-3 mr-1" /> Add another payment
              </Button>
            </div>

            {payments.some(p => p.paymentType === "upi" && Number(p.amount) > 0) && (
              <div className="border rounded-lg p-3 bg-indigo-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Smartphone className="h-4 w-4" /> Scan UPI QR to pay
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Merchant VPA (e.g. shop@upi)" value={upiCfg.vpa} onChange={e => persistUpi({ ...upiCfg, vpa: e.target.value })} />
                  <Input placeholder="Payee Name" value={upiCfg.payeeName} onChange={e => persistUpi({ ...upiCfg, payeeName: e.target.value })} />
                </div>
                {payments.filter(p => p.paymentType === "upi" && Number(p.amount) > 0).map((p, i) => {
                  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiCfg.vpa)}&pn=${encodeURIComponent(upiCfg.payeeName)}&am=${Number(p.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent("POS Payment")}`;
                  return (
                    <div key={i} className="flex flex-col items-center bg-white rounded p-3">
                      <QRCode value={upiUrl} size={140} />
                      <div className="text-xs text-muted-foreground mt-2 font-mono">{upiCfg.vpa}</div>
                      <div className="text-sm font-bold mt-1">₹{Number(p.amount).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
              <div>Paid: <span className="font-bold">₹{paymentTotal.toFixed(2)}</span></div>
              <div className="text-right">
                {Math.abs(remaining) < 0.01
                  ? <span className="text-green-600 font-bold">Fully paid ✓</span>
                  : remaining > 0
                    ? <span className="text-amber-600 font-bold">Remaining: ₹{remaining.toFixed(2)}</span>
                    : <span className="text-blue-600 font-bold">Change: ₹{Math.abs(remaining).toFixed(2)}</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckout} disabled={createSale.isPending || Math.abs(remaining) > 0.01}>
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
