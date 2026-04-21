import { useState } from "react";
import { useListProducts, getListProductsQueryKey, useCreateSale } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Gift, ShoppingCart, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@workspace/api-client-react/src/generated/api.schemas";

type CartItem = Product & { cartQty: number };

export default function Pos() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: products } = useListProducts({ search: searchTerm }, { query: { queryKey: getListProductsQueryKey({ search: searchTerm }) } });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const createSale = useCreateSale();

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.cartQty + delta);
        return { ...item, cartQty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.salesPrice * item.cartQty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    createSale.mutate({
      data: {
        saleDate: new Date().toISOString(),
        details: cart.map(item => ({
          productId: item.id,
          qty: item.cartQty,
          salesPrice: item.salesPrice,
          discount: 0
        })),
        payments: [
          { paymentType: "cash", amount: totalAmount }
        ]
      }
    }, {
      onSuccess: () => {
        toast({ title: "Sale completed successfully" });
        setCart([]);
      },
      onError: () => {
        toast({ title: "Failed to complete sale", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Products Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search products..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-3 gap-4 pb-4">
            {products?.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-20 w-20 bg-muted rounded-md mb-3 flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div className="font-medium text-sm line-clamp-2 min-h-[40px]">{product.name}</div>
                  <div className="text-primary font-bold mt-1">₹{product.salesPrice.toFixed(2)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <Card className="w-[400px] flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle>Current Order</CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-muted-foreground text-xs">₹{item.salesPrice.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.cartQty}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <div className="w-16 text-right font-medium text-sm">
                      ₹{(item.salesPrice * item.cartQty).toFixed(2)}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="mt-auto border-t p-4 bg-muted/30">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button variant="outline" className="flex items-center gap-2 h-12">
              <Banknote className="h-4 w-4 text-green-600" /> Cash
            </Button>
            <Button variant="outline" className="flex items-center gap-2 h-12">
              <CreditCard className="h-4 w-4 text-blue-600" /> Card
            </Button>
          </div>
          
          <Button 
            className="w-full h-14 text-lg font-bold" 
            disabled={cart.length === 0 || createSale.isPending}
            onClick={handleCheckout}
          >
            Pay ₹{totalAmount.toFixed(2)}
          </Button>
        </div>
      </Card>
    </div>
  );
}