import { useGetTeamActivity } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials, cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const ROLE_COLORS: Record<string, string> = {
  manager: "#1e3a5f",
  marketing: "#c9a227",
  sales: "#2a9d8f",
};

export default function Team() {
  const { data: activity } = useGetTeamActivity();

  const chartData = (activity ?? []).map((u) => ({
    name: u.name.split(" ")[0],
    Campaigns: u.campaignsCount,
    Leads: u.leadsCount,
    Interactions: u.interactionsCount,
    Deals: u.dealsCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Activity</h1>
        <p className="text-muted-foreground">
          Per-officer activity across campaigns, leads, interactions and deals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity by team member</CardTitle>
          <CardDescription>Counts across all-time data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Campaigns" fill="#c9a227" />
                <Bar dataKey="Leads" fill="#1e3a5f" />
                <Bar dataKey="Interactions" fill="#a23b72" />
                <Bar dataKey="Deals" fill="#2a9d8f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(activity ?? []).map((u) => (
          <Card key={u.userId}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white font-semibold"
                  style={{ backgroundColor: ROLE_COLORS[u.role] ?? "#888" }}
                >
                  {initials(u.name)}
                </div>
                <div>
                  <CardTitle className="text-base">{u.name}</CardTitle>
                  <CardDescription className="capitalize">{u.role}</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto capitalize",
                    u.role === "manager" && "border-primary text-primary",
                  )}
                >
                  {u.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Campaigns" value={u.campaignsCount} />
                <Stat label="Leads" value={u.leadsCount} />
                <Stat label="Interactions" value={u.interactionsCount} />
                <Stat label="Deals" value={u.dealsCount} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
