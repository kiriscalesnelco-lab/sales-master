import { useState } from "react";
import {
  useListSales, useGetSale,
  getListSalesQueryKey, getGetSaleQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, TrendingUp, FileText } from "lucide-react";

export default function Sales() {
  const { data: sales } = useListSales({}, { query: { queryKey: getListSalesQueryKey({}) } });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: sale } = useGetSale(selectedId ?? 0, { query: { queryKey: getGetSaleQueryKey(selectedId ?? 0), enabled: !!selectedId } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sales</h2>
        <p className="text-muted-foreground text-sm">All sales transactions</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Sales History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Bill No</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {sales?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sales yet</TableCell></TableRow>}
              {sales?.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-medium">{s.billNo}</TableCell>
                  <TableCell>{s.saleDate?.split("T")[0]}</TableCell>
                  <TableCell>{s.customerName || "Walk-in"}</TableCell>
                  <TableCell className="text-right font-semibold">₹{Number(s.totalAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(s.id)}><Eye className="h-4 w-4 mr-1" /> View</Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.open(`/sale-invoice/${s.id}`, "_blank")}>
                        <FileText className="h-4 w-4 mr-1" /> Tally Invoice
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Sale Details — {sale?.billNo}</DialogTitle></DialogHeader>
          {sale && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-muted-foreground">Date</p><p className="font-medium">{sale.saleDate?.split("T")[0]}</p></div>
                <div><p className="text-muted-foreground">Customer</p><p className="font-medium">{sale.customerName || "Walk-in"}</p></div>
                <div><p className="text-muted-foreground">Total</p><p className="font-bold text-primary">₹{Number(sale.totalAmount).toFixed(2)}</p></div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sale.details.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{d.productName}</TableCell>
                        <TableCell className="text-right">{Number(d.qty)}</TableCell>
                        <TableCell className="text-right">₹{Number(d.salesPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(Number(d.salesPrice) * Number(d.qty) - Number(d.discount)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payments</h4>
                <div className="flex flex-wrap gap-2">
                  {sale.payments.map(p => (
                    <Badge key={p.id} variant="secondary" className="capitalize">{p.paymentType}: ₹{Number(p.amount).toFixed(2)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
