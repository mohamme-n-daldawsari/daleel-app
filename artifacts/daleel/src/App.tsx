import React, { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppProvider } from "./components/app-provider";
import { AppShell } from "./components/app-shell";

import NotFound from '@/pages/not-found';
import LandingPage from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import ContractsList from '@/pages/contracts';
import UploadContract from '@/pages/upload-contract';
import ProcessingContract from '@/pages/processing-contract';
import ContractReport from '@/pages/contract-report';
import AskDaleel from '@/pages/ask-daleel';
import CompareContracts from '@/pages/compare-contracts';
import Reminders from '@/pages/reminders';
import Settings from '@/pages/settings';
import About from '@/pages/about';
import AdminDashboard from '@/pages/admin-dashboard';
import AdminUsers from '@/pages/admin-users';
import AdminLogs from '@/pages/admin-logs';
import { useGetMe } from '@workspace/api-client-react';

const configuredClerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkPubKey = configuredClerkPubKey
  ? publishableKeyFromHost(window.location.hostname, configuredClerkPubKey)
  : null;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey && !import.meta.env.DEV) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(173 58% 39%)",
    colorForeground: "hsl(222 47% 11%)",
    colorMutedForeground: "hsl(215 16% 47%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(214 32% 91%)",
    colorInputForeground: "hsl(222 47% 11%)",
    colorNeutral: "hsl(214 32% 91%)",
    fontFamily: "Inter, Cairo, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white dark:bg-slate-900 rounded-2xl w-[440px] max-w-full overflow-hidden border border-slate-200 dark:border-slate-800",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-slate-900 dark:text-white",
    headerSubtitle: "text-slate-500 dark:text-slate-400",
    socialButtonsBlockButtonText: "text-slate-600 dark:text-slate-300 font-medium",
    formFieldLabel: "text-sm font-medium text-slate-700 dark:text-slate-200",
    footerActionLink: "text-teal-600 hover:text-teal-700 font-medium",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-teal-600 hover:text-teal-700",
    formFieldSuccessText: "text-green-600",
    alertText: "text-red-600 dark:text-red-400",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <Show when="signed-in">
        <AppShell>
          <Component />
        </AppShell>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: { start: { title: "تسجيل الدخول إلى دليل", subtitle: "مرحبًا بعودتك" } },
        signUp: { start: { title: "إنشاء حساب في دليل", subtitle: "ابدأ مجانًا اليوم" } },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/about" component={About} />
          
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
          
          <Route path="/contracts/upload"><ProtectedRoute component={UploadContract} /></Route>
          <Route path="/contracts/compare"><ProtectedRoute component={CompareContracts} /></Route>
          <Route path="/contracts/processing/:id"><ProtectedRoute component={ProcessingContract} /></Route>
          <Route path="/contracts/:id/ask"><ProtectedRoute component={AskDaleel} /></Route>
          <Route path="/contracts/:id"><ProtectedRoute component={ContractReport} /></Route>
          <Route path="/contracts"><ProtectedRoute component={ContractsList} /></Route>
          
          <Route path="/reminders"><ProtectedRoute component={Reminders} /></Route>
          <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
          
          <Route path="/admin"><AdminRoute component={AdminDashboard} /></Route>
          <Route path="/admin/users"><AdminRoute component={AdminUsers} /></Route>
          <Route path="/admin/logs"><AdminRoute component={AdminLogs} /></Route>

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function SignedInAdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-64 items-center justify-center text-slate-500">
          Loading...
        </div>
      </AppShell>
    );
  }

  if (user?.role !== 'admin') {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <Show when="signed-in">
        <SignedInAdminRoute component={Component} />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkSetupRequired() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Authentication setup required
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Add VITE_CLERK_PUBLISHABLE_KEY to the local environment, then restart
          the development server to use sign-in and protected pages.
        </p>
      </div>
    </div>
  );
}

function DevelopmentRoutesWithoutClerk() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/about" component={About} />
      <Route path="/sign-in/*?" component={ClerkSetupRequired} />
      <Route path="/sign-up/*?" component={ClerkSetupRequired} />
      <Route path="/dashboard" component={ClerkSetupRequired} />
      <Route path="/contracts/upload" component={ClerkSetupRequired} />
      <Route path="/contracts/compare" component={ClerkSetupRequired} />
      <Route path="/contracts/processing/:id" component={ClerkSetupRequired} />
      <Route path="/contracts/:id/ask" component={ClerkSetupRequired} />
      <Route path="/contracts/:id" component={ClerkSetupRequired} />
      <Route path="/contracts" component={ClerkSetupRequired} />
      <Route path="/reminders" component={ClerkSetupRequired} />
      <Route path="/settings" component={ClerkSetupRequired} />
      <Route path="/admin" component={ClerkSetupRequired} />
      <Route path="/admin/users" component={ClerkSetupRequired} />
      <Route path="/admin/logs" component={ClerkSetupRequired} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppProvider>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          {clerkPubKey ? (
            <ClerkProviderWithRoutes />
          ) : (
            <DevelopmentRoutesWithoutClerk />
          )}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

export default App;
