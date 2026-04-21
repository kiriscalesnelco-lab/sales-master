import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListProducts,
  useSubmitCustomerOrder,
  useGetCustomerOrdersByMobile,
  getListProductsQueryKey,
  getGetCustomerOrdersByMobileQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Package,
  LogOut, ClipboardList, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  productId: number;
  productName: string;
  price: number;
  qty: number;
}

export default function CustomerShop() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const mobile = sessionStorage.getItem("customerMobile") ?? "";
  const customerName = sessionStorage.getItem("customerName") ?? "Customer";

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<"shop" | "orders">("shop");
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const { data: products } = useListProducts({}, { query: { queryKey: getListProductsQueryKey({}) } });
  const { data: myOrders, refetch: refetchOrders } = useGetCustomerOrdersByMobile(mobile, {
    query: { queryKey: getGetCustomerOrdersByMobileQueryKey(mobile), enabled: !!mobile },
  });

  const submitOrderMutation = useSubmitCustomerOrder();

  useEffect(() => {
    if (!mobile) navigate("/customer");
  }, [mobile, navigate]);

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const addToCart = (product: { id: number; name: string; sellPrice: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { productId: product.id, productName: product.name, price: Number(product.sellPrice), qty: 1 }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.productId === productId ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    try {
      await submitOrderMutation.mutateAsync({
        mobile,
        customerName,
        details: cart,
      });
      setCart([]);
      setOrderSubmitted(true);
      refetchOrders();
      toast({ title: "Order submitted successfully!" });
      setTimeout(() => setOrderSubmitted(false), 4000);
    } catch {
      toast({ title: "Failed to submit order", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("customerMobile");
    sessionStorage.removeItem("customerName");
    navigate("/customer");
  };

  const getStatusColor = (status: string) => {
    if (status === "pending") return "secondary";
    if (status === "confirmed") return "default";
    if (status === "billed") return "default";
    return "secondary";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="font-bold text-lg">Shop</h1>
          <p className="text-xs text-muted-foreground">Hi, {customerName} ({mobile})</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setView("orders"); refetchOrders(); }}
            className="relative"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="ml-1 text-xs">My Orders</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {view === "shop" ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {orderSubmitted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Order Submitted!</p>
                  <p className="text-sm text-green-700">Your order has been received and is being processed.</p>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                return (
                  <Card key={p.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div
                      className="bg-gradient-to-br from-blue-50 to-indigo-100 h-24 flex items-center justify-center"
                      onClick={() => addToCart({ id: p.id, name: p.name, sellPrice: Number(p.sellPrice) })}
                    >
                      <Package className="h-10 w-10 text-indigo-400" />
                    </div>
                    <CardContent className="p-2">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-primary font-bold text-sm">₹{Number(p.sellPrice).toFixed(2)}</p>
                      {inCart ? (
                        <div className="flex items-center justify-between mt-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(p.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-bold text-sm">{inCart.qty}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(p.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full mt-1 h-7 text-xs"
                          onClick={() => addToCart({ id: p.id, name: p.name, sellPrice: Number(p.sellPrice) })}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="w-72 border-l bg-white flex flex-col p-4 overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Cart</h2>
              {cartCount > 0 && (
                <Badge variant="secondary" className="ml-auto">{cartCount} items</Badge>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p>Cart is empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-2 overflow-auto">
                  {cart.map((item) => (
                    <div key={item.productId} className="border rounded-lg p-2">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.productId, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.productId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold">₹{(item.price * item.qty).toFixed(2)}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => updateQty(item.productId, -item.qty)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mt-3 space-y-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSubmitOrder}
                    disabled={submitOrderMutation.isPending}
                  >
                    {submitOrderMutation.isPending ? "Placing Order…" : "Place Order"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("shop")}>
              ← Back to Shop
            </Button>
            <h2 className="font-semibold text-lg">My Orders</h2>
          </div>
          {!myOrders || myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Order #{order.id}</CardTitle>
                      <Badge variant={getStatusColor(order.status)} className="capitalize">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.orderDate}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Amount</span>
                      <span className="font-bold text-lg">₹{Number(order.totalAmount).toFixed(2)}</span>
                    </div>
                    {order.billNo && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
                        <strong>Bill:</strong> {order.billNo} —{" "}
                        <a
                          href={`/bill/${order.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-medium"
                        >
                          View Bill & QR
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
