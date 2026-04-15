import { useParams } from "wouter";
import {
  useGetCustomerOrderBill,
  getGetCustomerOrderBillQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { Store, Printer } from "lucide-react";

export default function BillView() {
  const params = useParams<{ id: string }>();
  const orderId = parseInt(params.id ?? "0");

  const { data: bill, isLoading, isError } = useGetCustomerOrderBill(orderId, {
    query: { queryKey: getGetCustomerOrderBillQueryKey(orderId), enabled: !!orderId },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading bill…
      </div>
    );
  }

  if (isError || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold">Bill not found</p>
          <p className="text-sm mt-1">The bill may not exist or has not been generated yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-primary text-primary-foreground px-6 py-5 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/20 mb-3">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Retail POS</h1>
            <p className="text-primary-foreground/80 text-sm">Tax Invoice</p>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="text-center border-b pb-3">
              <p className="font-mono font-bold text-xl">{bill.billNo}</p>
              <p className="text-sm text-muted-foreground">{bill.orderDate}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Customer</p>
                <p className="font-semibold">{bill.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Mobile</p>
                <p className="font-semibold">{bill.mobile}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">Items</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-right text-xs">Qty</TableHead>
                    <TableHead className="text-right text-xs">Price</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.details.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium py-2">{d.productName}</TableCell>
                      <TableCell className="text-right text-sm py-2">{d.qty}</TableCell>
                      <TableCell className="text-right text-sm py-2">${Number(d.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold py-2">${Number(d.lineTotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-bold text-lg">Total Amount</span>
              <span className="font-bold text-2xl text-primary">${Number(bill.totalAmount).toFixed(2)}</span>
            </div>

            <div className="border rounded-xl p-5 bg-gray-50 flex flex-col items-center">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Bill QR Code</p>
              <QRCode
                value={bill.qrData}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "200px" }}
              />
              <p className="text-xs text-muted-foreground mt-2 font-mono">{bill.billNo}</p>
            </div>

            <Button
              className="w-full print:hidden"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" /> Print this Bill
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-2 pb-1">
              <p>Thank you for your purchase!</p>
              <p className="mt-0.5">Please keep this bill for your records.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
