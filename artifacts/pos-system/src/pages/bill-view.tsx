import { useParams } from "wouter";
import {
  useGetCustomerOrderBill,
  getGetCustomerOrderBillQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { Printer, MessageCircle } from "lucide-react";

const COMPANY = {
  name: "RETAIL POS PVT. LTD.",
  address: "123 Market Road, Commerce Lane",
  city: "Mumbai, Maharashtra - 400001",
  phone: "+91 98765 43210",
  email: "billing@retailpos.in",
  gstin: "27AAAAA0000A1Z5",
  state: "Maharashtra",
  stateCode: "27",
  pan: "AAAAA0000A",
};

const GST_RATE = 0.18;
const HSN_DEFAULT = "9999";

function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
  };
  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (h ? a[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "");
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = "";
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;

  if (crore) words += threeDigits(crore) + " Crore ";
  if (lakh) words += twoDigits(lakh) + " Lakh ";
  if (thousand) words += twoDigits(thousand) + " Thousand ";
  if (rest) words += threeDigits(rest);

  let result = "Rupees " + words.trim();
  if (paise) result += " and " + twoDigits(paise) + " Paise";
  return result + " Only";
}

export default function BillView() {
  const params = useParams<{ id: string }>();
  const orderId = parseInt(params.id ?? "0");

  const { data: bill, isLoading, isError } = useGetCustomerOrderBill(orderId, {
    query: { queryKey: getGetCustomerOrderBillQueryKey(orderId), enabled: !!orderId },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading invoice…</div>;
  }
  if (isError || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold">Invoice not found</p>
          <p className="text-sm mt-1">The invoice may not exist or has not been generated yet.</p>
        </div>
      </div>
    );
  }

  // GST exclusive — line prices are taxable, tax added on top
  const detailsWithBreakdown = bill.details.map((d) => {
    const lineTaxable = Number(d.price) * Number(d.qty);
    const lineGst = lineTaxable * GST_RATE;
    return { ...d, lineTaxable, lineGst, lineTotal: lineTaxable + lineGst };
  });
  const taxable = detailsWithBreakdown.reduce((s, d) => s + d.lineTaxable, 0);
  const totalGst = taxable * GST_RATE;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const total = taxable + totalGst;

  const handlePrint = () => window.print();
  const handleWhatsApp = () => {
    const url = window.location.href;
    const msg = `Dear ${bill.customerName}, please find your tax invoice ${bill.billNo} for ₹${total.toFixed(2)} from ${COMPANY.name}.\n\nView: ${url}`;
    const phone = (bill.mobile ?? "").replace(/\D/g, "");
    const wa = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-3 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto">
        {/* Action buttons */}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print Invoice
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" /> Share on WhatsApp
          </Button>
        </div>

        {/* Invoice */}
        <div className="bg-white border-2 border-black text-[12px] text-black font-serif">
          {/* Title bar */}
          <div className="text-center border-b-2 border-black py-1.5">
            <p className="text-xs font-semibold tracking-widest">TAX INVOICE</p>
            <p className="text-[10px] italic">(ORIGINAL FOR RECIPIENT)</p>
          </div>

          {/* Company + Invoice meta */}
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-3 border-r-2 border-black">
              <p className="font-bold text-base">{COMPANY.name}</p>
              <p>{COMPANY.address}</p>
              <p>{COMPANY.city}</p>
              <p>Phone: {COMPANY.phone}</p>
              <p>Email: {COMPANY.email}</p>
              <p className="mt-1"><span className="font-semibold">GSTIN/UIN:</span> {COMPANY.gstin}</p>
              <p><span className="font-semibold">PAN:</span> {COMPANY.pan}</p>
              <p><span className="font-semibold">State:</span> {COMPANY.state}, Code: {COMPANY.stateCode}</p>
            </div>
            <div className="grid grid-cols-2">
              <div className="border-b border-r border-black p-1.5">
                <p className="text-[10px] text-gray-600">Invoice No.</p>
                <p className="font-semibold">{bill.billNo}</p>
              </div>
              <div className="border-b border-black p-1.5">
                <p className="text-[10px] text-gray-600">Dated</p>
                <p className="font-semibold">{new Date(bill.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
              <div className="border-b border-r border-black p-1.5">
                <p className="text-[10px] text-gray-600">Delivery Note</p>
                <p>—</p>
              </div>
              <div className="border-b border-black p-1.5">
                <p className="text-[10px] text-gray-600">Mode/Terms of Payment</p>
                <p>Cash/UPI</p>
              </div>
              <div className="border-b border-r border-black p-1.5">
                <p className="text-[10px] text-gray-600">Reference No. & Date</p>
                <p>—</p>
              </div>
              <div className="border-b border-black p-1.5">
                <p className="text-[10px] text-gray-600">Other References</p>
                <p>—</p>
              </div>
              <div className="border-r border-black p-1.5">
                <p className="text-[10px] text-gray-600">Buyer's Order No.</p>
                <p>—</p>
              </div>
              <div className="p-1.5">
                <p className="text-[10px] text-gray-600">Dispatch Doc No.</p>
                <p>—</p>
              </div>
            </div>
          </div>

          {/* Buyer / Consignee */}
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-3 border-r-2 border-black">
              <p className="text-[10px] text-gray-600 font-semibold">Consignee (Ship to)</p>
              <p className="font-bold mt-0.5">{bill.customerName}</p>
              <p>Mobile: {bill.mobile}</p>
              <p className="mt-1"><span className="font-semibold">State:</span> {COMPANY.state}, Code: {COMPANY.stateCode}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-gray-600 font-semibold">Buyer (Bill to)</p>
              <p className="font-bold mt-0.5">{bill.customerName}</p>
              <p>Mobile: {bill.mobile}</p>
              <p className="mt-1"><span className="font-semibold">State:</span> {COMPANY.state}, Code: {COMPANY.stateCode}</p>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r border-black p-1.5 text-center w-10">Sl<br/>No.</th>
                <th className="border-r border-black p-1.5 text-left">Description of Goods</th>
                <th className="border-r border-black p-1.5 text-center w-20">HSN/SAC</th>
                <th className="border-r border-black p-1.5 text-center w-16">Quantity</th>
                <th className="border-r border-black p-1.5 text-right w-20">Rate<br/><span className="text-[9px] font-normal">(excl. GST)</span></th>
                <th className="border-r border-black p-1.5 text-center w-10">per</th>
                <th className="p-1.5 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {detailsWithBreakdown.map((d, i) => (
                <tr key={i} className="align-top">
                  <td className="border-r border-black p-1.5 text-center">{i + 1}</td>
                  <td className="border-r border-black p-1.5">{d.productName}</td>
                  <td className="border-r border-black p-1.5 text-center">{HSN_DEFAULT}</td>
                  <td className="border-r border-black p-1.5 text-center">{Number(d.qty)}</td>
                  <td className="border-r border-black p-1.5 text-right">{Number(d.price).toFixed(2)}</td>
                  <td className="border-r border-black p-1.5 text-center">Nos</td>
                  <td className="p-1.5 text-right">{d.lineTaxable.toFixed(2)}</td>
                </tr>
              ))}
              {/* Spacer rows for Tally look */}
              {Array.from({ length: Math.max(0, 4 - detailsWithBreakdown.length) }).map((_, i) => (
                <tr key={`s${i}`} className="h-5">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              ))}
              {/* Tax rows */}
              <tr className="border-t border-black">
                <td className="border-r border-black"></td>
                <td className="border-r border-black p-1.5 text-right italic">Taxable Value</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="p-1.5 text-right">{taxable.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border-r border-black"></td>
                <td className="border-r border-black p-1.5 text-right italic">Add: CGST @ 9%</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="p-1.5 text-right">{cgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border-r border-black"></td>
                <td className="border-r border-black p-1.5 text-right italic">Add: SGST @ 9%</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="p-1.5 text-right">{sgst.toFixed(2)}</td>
              </tr>
              <tr className="border-t-2 border-black font-bold">
                <td className="border-r border-black p-1.5 text-center">Total</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black p-1.5 text-center">{detailsWithBreakdown.reduce((s, d) => s + Number(d.qty), 0)}</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="p-1.5 text-right">₹ {total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in words */}
          <div className="border-t-2 border-black p-3">
            <p className="text-[10px] text-gray-600">Amount Chargeable (in words)</p>
            <p className="font-semibold italic">INR {numberToWordsIndian(total)}</p>
          </div>

          {/* Tax summary table */}
          <div className="border-t-2 border-black overflow-hidden">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-black">
                  <th rowSpan={2} className="border-r border-black p-1.5">HSN/SAC</th>
                  <th rowSpan={2} className="border-r border-black p-1.5">Taxable Value</th>
                  <th colSpan={2} className="border-r border-b border-black p-1.5 text-center">Central Tax</th>
                  <th colSpan={2} className="border-r border-b border-black p-1.5 text-center">State Tax</th>
                  <th rowSpan={2} className="p-1.5">Total Tax Amount</th>
                </tr>
                <tr className="border-b border-black">
                  <th className="border-r border-black p-1 text-[10px]">Rate</th>
                  <th className="border-r border-black p-1 text-[10px]">Amount</th>
                  <th className="border-r border-black p-1 text-[10px]">Rate</th>
                  <th className="border-r border-black p-1 text-[10px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-black p-1.5 text-center">{HSN_DEFAULT}</td>
                  <td className="border-r border-black p-1.5 text-right">{taxable.toFixed(2)}</td>
                  <td className="border-r border-black p-1.5 text-center">9%</td>
                  <td className="border-r border-black p-1.5 text-right">{cgst.toFixed(2)}</td>
                  <td className="border-r border-black p-1.5 text-center">9%</td>
                  <td className="border-r border-black p-1.5 text-right">{sgst.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{totalGst.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-black font-bold">
                  <td className="border-r border-black p-1.5 text-right">Total</td>
                  <td className="border-r border-black p-1.5 text-right">{taxable.toFixed(2)}</td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black p-1.5 text-right">{cgst.toFixed(2)}</td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black p-1.5 text-right">{sgst.toFixed(2)}</td>
                  <td className="p-1.5 text-right">{totalGst.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax in words */}
          <div className="border-t-2 border-black p-3">
            <p className="text-[10px] text-gray-600">Tax Amount (in words)</p>
            <p className="font-semibold italic">INR {numberToWordsIndian(totalGst)}</p>
          </div>

          {/* Bank + signature + QR */}
          <div className="grid grid-cols-3 border-t-2 border-black">
            <div className="col-span-2 border-r-2 border-black p-3">
              <p className="font-semibold underline mb-1">Company's Bank Details</p>
              <p>A/c Holder's Name : {COMPANY.name}</p>
              <p>Bank Name : HDFC Bank</p>
              <p>A/c No. : 50100XXXXXXXXX</p>
              <p>Branch & IFS Code : Mumbai Main, HDFC0000123</p>
              <div className="mt-3">
                <p className="font-semibold underline mb-1">Declaration</p>
                <p className="text-[11px]">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
              </div>
            </div>
            <div className="p-3 flex flex-col items-center justify-between">
              <div className="flex flex-col items-center">
                <QRCode value={bill.qrData} size={90} />
                <p className="text-[9px] mt-1 font-mono">{bill.billNo}</p>
              </div>
              <div className="text-center mt-3 w-full">
                <p className="text-[10px]">for <span className="font-bold">{COMPANY.name}</span></p>
                <div className="h-10"></div>
                <div className="border-t border-black pt-0.5 text-[10px]">Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-black p-2 text-center text-[10px] italic">
            This is a Computer Generated Invoice
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
