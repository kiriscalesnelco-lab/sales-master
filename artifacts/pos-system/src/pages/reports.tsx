import {
  useGetDashboardSummary, useGetSalesTrend, useGetTopProducts, useGetLowStockProducts,
  getGetDashboardSummaryQueryKey, getGetSalesTrendQueryKey, getGetTopProductsQueryKey, getGetLowStockProductsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
} from "recharts";
import { BarChart as BarChartIcon, AlertTriangle, TrendingUp, Package, IndianRupee } from "lucide-react";

export default function Reports() {
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: trend } = useGetSalesTrend({}, { query: { queryKey: getGetSalesTrendQueryKey({}) } });
  const { data: topProducts } = useGetTopProducts({}, { query: { queryKey: getGetTopProductsQueryKey({}) } });
  const { data: lowStock } = useGetLowStockProducts({}, { query: { queryKey: getGetLowStockProductsQueryKey({}) } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground text-sm">Business insights at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales This Month</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">₹{Number(summary?.totalSalesThisMonth ?? 0).toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">₹{Number(summary?.totalPurchasesThisMonth ?? 0).toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit (Month)</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">₹{Number(summary?.netProfitThisMonth ?? 0).toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{summary?.lowStockCount ?? 0}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Sales Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <LineChart data={trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v: number) => [`₹${Number(v).toFixed(2)}`, "Sales"]} />
                  <Line type="monotone" dataKey="totalSales" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={topProducts ?? []} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `₹${v}`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="productName" type="category" tick={{ fontSize: 11 }} width={120} />
                  <RechartsTooltip formatter={(v: number) => [`₹${Number(v).toFixed(2)}`, "Revenue"]} />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-amber-600" /> Low Stock Products</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Current Stock</TableHead></TableRow></TableHeader>
            <TableBody>
              {(!lowStock || lowStock.length === 0) && <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">All stock healthy</TableCell></TableRow>}
              {lowStock?.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.productCode}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right"><Badge variant="destructive">{Number(p.currentStock)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
