import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthForm } from "../features/auth/AuthForm";
import { AuthProvider, useSession } from "../features/auth/AuthProvider";
import { InventoryPage } from "../features/vehicles/InventoryPage";
import { ToastProvider } from "../shared/ui";
import { ErrorBoundary } from "./ErrorBoundary";
import { Layout } from "./Layout";

// Admin screens load on demand: staff never download them.
const ManagePage = lazy(() => import("../features/vehicles/ManagePage"));
const ActivityPage = lazy(() => import("../features/activity/ActivityPage"));

/** Convenience only: the API enforces roles regardless of which routes the UI shows. */
function AdminOnly({ children }: { children: ReactNode }) {
  return useSession().user?.role === "ADMIN" ? children : <Navigate to="/inventory" replace />;
}

function Shell() {
  const { user, ready } = useSession();
  if (!ready) return <p className="p-8 text-muted">Loading…</p>;
  if (!user) return <AuthForm />;
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/manage" element={<AdminOnly><ManagePage /></AdminOnly>} />
          <Route path="/activity" element={<AdminOnly><ActivityPage /></AdminOnly>} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

/** Providers, outermost first: server cache → URL router → toasts → session. */
export function App() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <HashRouter>
          <ToastProvider>
            <AuthProvider><Shell /></AuthProvider>
          </ToastProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
