import { useState } from "react";
import {
  useListProducts,
  useCreateProduct,
  useListCategories,
  useListBrands,
  getListProductsQueryKey,
  getListCategoriesQueryKey,
  getListBrandsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const blank = {
  productCode: "",
  name: "",
  description: "",
  categoryId: "" as string,
  brandId: "" as string,
  barcode: "",
  salesPrice: 0,
  cost: 0,
  discount: 0,
  discountType: "fixed" as "fixed" | "percentage",
  hasExpiry: false,
  valuationMethod: "fifo" as "fifo" | "lifo" | "average",
  isActive: true,
  taxRate: 18,
};

export default function Products() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const { data: products, isLoading } = useListProducts({}, { query: { queryKey: getListProductsQueryKey({}) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: brands } = useListBrands({ query: { queryKey: getListBrandsQueryKey() } });
  const createProduct = useCreateProduct();

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (Number(form.salesPrice) <= 0 || Number(form.cost) < 0) {
      toast({ title: "Enter a valid price and cost", variant: "destructive" });
      return;
    }
    try {
      await createProduct.mutateAsync({
        data: {
          productCode: form.productCode.trim() || null,
          name: form.name.trim(),
          description: form.description.trim() || null,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          brandId: form.brandId ? Number(form.brandId) : null,
          barcode: form.barcode.trim() || null,
          salesPrice: Number(form.salesPrice),
          cost: Number(form.cost),
          discount: Number(form.discount),
          discountType: form.discountType,
          hasExpiry: form.hasExpiry,
          valuationMethod: form.valuationMethod,
          isActive: form.isActive,
          taxRate: Number(form.taxRate),
        },
      });
      toast({ title: "Product added" });
      qc.invalidateQueries({ queryKey: getListProductsQueryKey({}) });
      setForm(blank);
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Failed to add product", description: e?.message ?? "Try again", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground text-sm">Manage your product inventory</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading products...</TableCell>
                </TableRow>
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found.</TableCell>
                </TableRow>
              ) : (
                products?.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.productCode}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>₹{Number(product.salesPrice).toFixed(2)}</TableCell>
                    <TableCell>₹{Number(product.cost).toFixed(2)}</TableCell>
                    <TableCell>{product.currentStock || 0}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Basmati Rice 5kg" />
            </div>
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Input value={form.productCode} onChange={e => update("productCode", e.target.value)} placeholder="SKU-001" />
            </div>
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={e => update("barcode", e.target.value)} placeholder="EAN/UPC" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={v => update("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={form.brandId} onValueChange={v => update("brandId", v)}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands?.map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales Price (₹) *</Label>
              <Input type="number" step="0.01" value={form.salesPrice} onChange={e => update("salesPrice", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Cost (₹) *</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={e => update("cost", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input type="number" step="0.01" value={form.discount} onChange={e => update("discount", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={form.discountType} onValueChange={v => update("discountType", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GST Tax Rate</Label>
              <Select value={String(form.taxRate)} onValueChange={v => update("taxRate", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Exempt)</SelectItem>
                  <SelectItem value="5">5% GST</SelectItem>
                  <SelectItem value="12">12% GST</SelectItem>
                  <SelectItem value="18">18% GST</SelectItem>
                  <SelectItem value="28">28% GST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valuation Method</Label>
              <Select value={form.valuationMethod} onValueChange={v => update("valuationMethod", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">FIFO</SelectItem>
                  <SelectItem value="lifo">LIFO</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <Label htmlFor="hasExpiry">Has Expiry</Label>
              <Switch id="hasExpiry" checked={form.hasExpiry} onCheckedChange={v => update("hasExpiry", v)} />
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <Label htmlFor="isActive">Active</Label>
              <Switch id="isActive" checked={form.isActive} onCheckedChange={v => update("isActive", v)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createProduct.isPending}>
              {createProduct.isPending ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
