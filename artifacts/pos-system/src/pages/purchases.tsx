import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPurchases, useCreatePurchase, useGetPurchase, useDeletePurchase,
  useListSuppliers, useListProducts,
  getListPurchasesQueryKey, getGetPurchaseQueryKey, getListSuppliersQueryKey, getListProductsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LineItem { productId: number; productName: string; cost: number; price: number; qty: number; }

export default function Purchases() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: purchases } = useListPurchases({}, { query: { queryKey: getListPurchasesQueryKey({}) } });
  const { data: suppliers } = useListSuppliers({}, { query: { queryKey: getListSuppliersQueryKey({}) } });
  const { data: products } = useListProducts({}, { query: { queryKey: getListProductsQueryKey({}) } });
  const createMut = useCreatePurchase();
  const deleteMut = useDeletePurchase();

  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<string>("");
  const [billNo, setBillNo] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const { data: viewing } = useGetPurchase(viewId ?? 0, { query: { queryKey: getGetPurchaseQueryKey(viewId ?? 0), enabled: !!viewId } });

  const addItem = () => setItems([...items, { productId: 0, productName: "", cost: 0, price: 0, qty: 1 }]);
  const updateItem = (idx: number, patch: Partial<LineItem>) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const total = items.reduce((s, i) => s + i.cost * i.qty, 0);

  const reset = () => { setSupplierId(""); setBillNo(""); setItems([]); };

  const save = async () => {
    if (items.length === 0 || items.some(i => !i.productId)) return toast({ title: "Add valid items", variant: "destructive" });
    try {
      await createMut.mutateAsync({
        data: {
          purchaseDate: new Date().toISOString().split("T")[0],
          supplierId: supplierId ? Number(supplierId) : null,
          supplierBillNo: billNo || null,
          details: items.map(i => ({ productId: i.productId, cost: Number(i.cost), price: Number(i.price), qty: Number(i.qty) })),
        },
      });
      qc.invalidateQueries({ queryKey: getListPurchasesQueryKey({}) });
      setOpen(false); reset();
      toast({ title: "Purchase recorded" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete purchase? This will reverse the stock movement.")) return;
    try { await deleteMut.mutateAsync({ id }); qc.invalidateQueries({ queryKey: getListPurchasesQueryKey({}) }); toast({ title: "Deleted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchases</h2>
          <p className="text-muted-foreground text-sm">Stock-in transactions from suppliers</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New Purchase</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Purchase History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
              <TableHead>Bill No</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {purchases?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchases</TableCell></TableRow>}
              {purchases?.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">#{p.id}</TableCell>
                  <TableCell>{p.purchaseDate?.split("T")[0]}</TableCell>
                  <TableCell>{p.supplierName || "—"}</TableCell>
                  <TableCell>{p.supplierBillNo || "—"}</TableCell>
                  <TableCell className="text-right font-semibold">₹{Number(p.totalAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setViewId(p.id)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Supplier Bill No</Label><Input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="Optional" /></div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Cost</TableHead><TableHead>Sale Price</TableHead><TableHead>Qty</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={String(it.productId)} onValueChange={v => {
                          const prod = products?.find(p => p.id === Number(v));
                          updateItem(idx, { productId: Number(v), productName: prod?.name ?? "", cost: prod?.cost ?? 0, price: prod?.salesPrice ?? 0 });
                        }}>
                          <SelectTrigger className="w-48"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {products?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="w-24" value={it.cost} onChange={e => updateItem(idx, { cost: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input type="number" className="w-24" value={it.price} onChange={e => updateItem(idx, { price: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input type="number" className="w-20" value={it.qty} onChange={e => updateItem(idx, { qty: Number(e.target.value) })} /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end font-bold text-lg">Total: ₹{total.toFixed(2)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending}>Save Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Purchase #{viewId}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-muted-foreground">Date</p><p className="font-medium">{viewing.purchaseDate?.split("T")[0]}</p></div>
                <div><p className="text-muted-foreground">Supplier</p><p className="font-medium">{viewing.supplierName || "—"}</p></div>
                <div><p className="text-muted-foreground">Total</p><p className="font-bold">₹{Number(viewing.totalAmount).toFixed(2)}</p></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewing.details.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.productName}</TableCell>
                      <TableCell className="text-right">{Number(d.qty)}</TableCell>
                      <TableCell className="text-right">₹{Number(d.cost).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{(Number(d.cost) * Number(d.qty)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
