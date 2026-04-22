import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  getListCustomersQueryKey,
  type Customer,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const empty = { name: "", address: "", city: "", contactPerson: "", contactNo: "", creditLimit: 0, loyaltyPoints: 0 };

export default function Customers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: customers } = useListCustomers({}, { query: { queryKey: getListCustomersQueryKey({}) } });
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name, address: c.address ?? "", city: c.city ?? "",
      contactPerson: c.contactPerson ?? "", contactNo: c.contactNo ?? "",
      creditLimit: Number(c.creditLimit), loyaltyPoints: Number(c.loyaltyPoints),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    const data = { ...form, creditLimit: Number(form.creditLimit), loyaltyPoints: Number(form.loyaltyPoints) };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data });
      else await createMut.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getListCustomersQueryKey({}) });
      setOpen(false);
      toast({ title: editing ? "Updated" : "Created" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    try { await deleteMut.mutateAsync({ id }); qc.invalidateQueries({ queryKey: getListCustomersQueryKey({}) }); toast({ title: "Deleted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground text-sm">Manage customers, credit limits, and loyalty points</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> All Customers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>City</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead><TableHead className="text-right">Loyalty Pts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {customers?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers</TableCell></TableRow>}
              {customers?.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contactNo || "—"}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell className="text-right">₹{Number(c.creditLimit).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><Badge variant="secondary">{Number(c.loyaltyPoints).toFixed(0)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Customer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })} /></div>
            <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Credit Limit</Label><Input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} /></div>
            <div><Label>Loyalty Points</Label><Input type="number" value={form.loyaltyPoints} onChange={e => setForm({ ...form, loyaltyPoints: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
