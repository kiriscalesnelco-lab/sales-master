import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Pos from "@/pages/pos";
import Products from "@/pages/products";
import CustomerLogin from "@/pages/customer-login";
import CustomerShop from "@/pages/customer-shop";
import OrdersPage from "@/pages/orders";
import BillView from "@/pages/bill-view";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/pos" component={Pos} />
        <Route path="/products" component={Products} />
        <Route path="/orders" component={OrdersPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/customer" component={CustomerLogin} />
      <Route path="/customer/shop" component={CustomerShop} />
      <Route path="/bill/:id" component={BillView} />
      <Route>{() => <AdminRouter />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
