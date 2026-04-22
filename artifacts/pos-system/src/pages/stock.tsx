import {
  useListStockMovements,
  getListStockMovementsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, Store } from "lucide-react";

const colors: Record<string, string> = {
  purchase: "bg-green-100 text-green-700 border-green-300",
  purchase_return: "bg-amber-100 text-amber-700 border-amber-300",
  sale: "bg-blue-100 text-blue-700 border-blue-300",
  sales_return: "bg-purple-100 text-purple-700 border-purple-300",
};

export default function Stock() {
  const { data: movements } = useListStockMovements({}, { query: { queryKey: getListStockMovementsQueryKey({}) } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stock Movement</h2>
        <p className="text-muted-foreground text-sm">Complete in/out history ledger across all transactions</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Movement Ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Code</TableHead>
              <TableHead>Type</TableHead><TableHead className="text-right">Stock In</TableHead>
              <TableHead className="text-right">Stock Out</TableHead><TableHead>Ref</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {movements?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No movements</TableCell></TableRow>}
              {movements?.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{m.movementDate?.split("T")[0]}</TableCell>
                  <TableCell className="font-medium">{m.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{m.productCode}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[m.movementType] ?? "bg-gray-100 text-gray-700"} capitalize`}>
                      {m.movementType.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(m.stockIn) > 0 && (
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                        <ArrowDownToLine className="h-3 w-3" /> {Number(m.stockIn)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(m.stockOut) > 0 && (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <ArrowUpFromLine className="h-3 w-3" /> {Number(m.stockOut)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.referenceId ? `#${m.referenceId}` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
