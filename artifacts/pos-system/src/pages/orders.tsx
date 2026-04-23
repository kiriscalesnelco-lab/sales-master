import { useState } from "react";
import {
  useListCustomerOrders,
  useGetCustomerOrderBill,
  useConfirmCustomerOrder,
  getListCustomerOrdersQueryKey,
  getGetCustomerOrderBillQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { Receipt, CheckCircle2, Eye, Printer, RefreshCw, MessageCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: orders, isLoading, refetch } = useListCustomerOrders(
    { status: statusFilter },
    { query: { queryKey: getListCustomerOrdersQueryKey({ status: statusFilter }) } }
  );

  const { data: bill } = useGetCustomerOrderBill(
    selectedOrderId ?? 0,
    { query: { queryKey: getGetCustomerOrderBillQueryKey(selectedOrderId ?? 0), enabled: !!selectedOrderId && billDialogOpen } }
  );

  const confirmMutation = useConfirmCustomerOrder();

  const handleConfirm = async (id: number) => {
    try {
      await confirmMutation.mutateAsync({ id });
      toast({ title: "Order confirmed and bill generated!" });
      queryClient.invalidateQueries({ queryKey: getListCustomerOrdersQueryKey({}) });
      refetch();
    } catch {
      toast({ title: "Failed to confirm order", variant: "destructive" });
    }
  };

  const handleViewBill = (id: number) => {
    setSelectedOrderId(id);
    setBillDialogOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    confirmed: "default",
    billed: "default",
  };

  const filterButtons = [
    { label: "All", value: undefined },
    { label: "Pending", value: "pending" },
    { label: "Billed", value: "billed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customer Orders</h2>
          <p className="text-muted-foreground text-sm">Orders submitted from the customer portal</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {filterButtons.map((f) => (
          <Button
            key={f.label}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Incoming Orders
            {orders && (
              <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading orders…</div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No customer orders yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-semibold">#{order.id}</TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell>{order.mobile}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>{order.details.length} item{order.details.length !== 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(order.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[order.status] ?? "secondary"} className="capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{order.billNo ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {order.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(order.id)}
                            disabled={confirmMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm & Bill
                          </Button>
                        )}
                        {order.billNo && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewBill(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> View Bill
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => window.open(`/bill/${order.id}`, "_blank")}
                            >
                              <FileText className="h-4 w-4 mr-1" /> Tally Invoice
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="max-w-lg print:shadow-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Bill / Invoice
            </DialogTitle>
          </DialogHeader>

          {bill ? (
            <div className="space-y-4" id="bill-content">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">Retail POS</h2>
                <p className="text-muted-foreground text-sm">Tax Invoice</p>
                <p className="font-mono font-bold text-lg mt-1">{bill.billNo}</p>
                <p className="text-sm text-muted-foreground">{bill.orderDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{bill.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mobile</p>
                  <p className="font-medium">{bill.mobile}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.details.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.productName}</TableCell>
                      <TableCell className="text-right">{d.qty}</TableCell>
                      <TableCell className="text-right">₹{Number(d.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{Number(d.lineTotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{Number(bill.totalAmount).toFixed(2)}</span>
              </div>

              <div className="flex flex-col items-center border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-muted-foreground mb-3 font-medium">Scan QR to view bill</p>
                <QRCode
                  value={bill.qrData}
                  size={160}
                  style={{ height: "auto", maxWidth: "100%", width: "160px" }}
                />
                <p className="text-xs text-muted-foreground mt-2">{bill.billNo}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 print:hidden">
                <Button
                  className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.open(`/bill/${selectedOrderId}`, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" /> Open Tally Invoice
                </Button>
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/bill/${selectedOrderId}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Bill link copied to clipboard!" });
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  className="col-span-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const url = `${window.location.origin}/bill/${selectedOrderId}`;
                    const msg = `Hi ${bill.customerName}, here's your bill ${bill.billNo} for ₹${Number(bill.totalAmount).toFixed(2)} from Retail POS:\n${url}`;
                    const phone = (bill.mobile ?? "").replace(/\D/g, "");
                    const wa = phone
                      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
                      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    window.open(wa, "_blank");
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Share on WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Loading bill…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
