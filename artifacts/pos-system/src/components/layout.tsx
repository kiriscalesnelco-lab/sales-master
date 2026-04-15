import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  Award, 
  Users, 
  Truck, 
  ArrowLeftRight, 
  TrendingUp, 
  BarChart, 
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Point of Sale", href: "/pos", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Brands", href: "/brands", icon: Award },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Sales Returns", href: "/sales-returns", icon: ArrowLeftRight },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart },
  { name: "Purchase Returns", href: "/purchase-returns", icon: ArrowLeftRight },
  { name: "Stock Movement", href: "/stock", icon: Store },
  { name: "Reports", href: "/reports", icon: BarChart },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar font-bold text-lg tracking-tight">
          <Store className="mr-3 h-6 w-6 text-sidebar-primary" />
          Retail POS
        </div>
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground opacity-70 group-hover:opacity-100",
                      "flex-shrink-0 mr-3 h-5 w-5"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-card border-b flex items-center justify-between px-6 z-10 shadow-sm relative">
          <h1 className="text-xl font-semibold text-card-foreground">
            {navigation.find((item) => location === item.href || (item.href !== "/" && location.startsWith(item.href)))?.name || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Admin User
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30 p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}