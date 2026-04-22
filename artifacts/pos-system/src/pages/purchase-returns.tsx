import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPurchaseReturns, useCreatePurchaseReturn,
  useListSuppliers, useListProducts,
  getListPurchaseReturnsQueryKey, getListSuppliersQueryKey, getListProductsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LineItem { productId: number; productName: string; cost: number; qty: number; }

export default function PurchaseReturns() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: returns } = useListPurchaseReturns({}, { query: { queryKey: getListPurchaseReturnsQueryKey({}) } });
  const { data: suppliers } = useListSuppliers({}, { query: { queryKey: getListSuppliersQueryKey({}) } });
  const { data: products } = useListProducts({}, { query: { queryKey: getListProductsQueryKey({}) } });
  const createMut = useCreatePurchaseReturn();

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const addItem = () => setItems([...items, { productId: 0, productName: "", cost: 0, qty: 1 }]);
  const updateItem = (idx: number, patch: Partial<LineItem>) => setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const total = items.reduce((s, i) => s + i.cost * i.qty, 0);

  const save = async () => {
    if (items.length === 0 || items.some(i => !i.productId)) return toast({ title: "Add valid items", variant: "destructive" });
    try {
      await createMut.mutateAsync({
        data: {
          returnDate: new Date().toISOString().split("T")[0],
          supplierId: supplierId ? Number(supplierId) : null,
          originalBillNo: billNo || null,
          details: items.map(i => ({ productId: i.productId, cost: Number(i.cost), qty: Number(i.qty) })),
        },
      });
      qc.invalidateQueries({ queryKey: getListPurchaseReturnsQueryKey({}) });
      setOpen(false); setSupplierId(""); setBillNo(""); setItems([]);
      toast({ title: "Purchase return recorded" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase Returns</h2>
          <p className="text-muted-foreground text-sm">Return stock to suppliers</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Return</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5" /> Return History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead>
              <TableHead>Original Bill</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {returns?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No returns</TableCell></TableRow>}
              {returns?.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">#{r.id}</TableCell>
                  <TableCell>{r.returnDate?.split("T")[0]}</TableCell>
                  <TableCell>{r.supplierName || "—"}</TableCell>
                  <TableCell>{r.originalBillNo || "—"}</TableCell>
                  <TableCell className="text-right font-semibold">₹{Number(r.totalAmount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
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
              <div><Label>Original Bill No</Label><Input value={billNo} onChange={e => setBillNo(e.target.value)} /></div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Cost</TableHead><TableHead>Qty</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={String(it.productId)} onValueChange={v => {
                          const prod = products?.find(p => p.id === Number(v));
                          updateItem(idx, { productId: Number(v), productName: prod?.name ?? "", cost: prod?.cost ?? 0 });
                        }}>
                          <SelectTrigger className="w-48"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {products?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="w-24" value={it.cost} onChange={e => updateItem(idx, { cost: Number(e.target.value) })} /></TableCell>
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
            <Button onClick={save} disabled={createMut.isPending}>Save Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
