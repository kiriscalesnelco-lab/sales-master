import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBrands, useCreateBrand, useUpdateBrand, useDeleteBrand,
  getListBrandsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Brands() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: brands } = useListBrands({ query: { queryKey: getListBrandsQueryKey() } });
  const createMut = useCreateBrand();
  const updateMut = useUpdateBrand();
  const deleteMut = useDeleteBrand();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data: { name } });
      else await createMut.mutateAsync({ data: { name } });
      qc.invalidateQueries({ queryKey: getListBrandsQueryKey() });
      setOpen(false); setName(""); setEditing(null);
      toast({ title: editing ? "Updated" : "Created" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this brand?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListBrandsQueryKey() });
      toast({ title: "Deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brands</h2>
          <p className="text-muted-foreground text-sm">Product brands</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(""); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Brand
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> All Brands</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {brands?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No brands</TableCell></TableRow>}
              {brands?.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono">#{b.id}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setName(b.name); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Brand</DialogTitle></DialogHeader>
          <Input placeholder="Brand name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
