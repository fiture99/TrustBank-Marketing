import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Campaigns from "@/pages/campaigns";
import Leads from "@/pages/leads";
import Pipeline from "@/pages/pipeline";
import FollowUps from "@/pages/follow-ups";
import Team from "@/pages/team";
import Notifications from "@/pages/notifications";
import Inbox from "@/pages/inbox";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/campaigns">
        <Layout><Campaigns /></Layout>
      </Route>
      <Route path="/leads">
        <Layout><Leads /></Layout>
      </Route>
      <Route path="/pipeline">
        <Layout><Pipeline /></Layout>
      </Route>
      <Route path="/follow-ups">
        <Layout><FollowUps /></Layout>
      </Route>
      <Route path="/team">
        <Layout><Team /></Layout>
      </Route>
      <Route path="/notifications">
        <Layout><Notifications /></Layout>
      </Route>
      <Route path="/inbox">
        <Layout><Inbox /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><Settings /></Layout>
      </Route>
      <Route component={NotFound} />
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
