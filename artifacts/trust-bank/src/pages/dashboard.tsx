import { useState } from "react";
import {
  useGetCurrentUser,
  useGetDashboardSummary,
  useGetChannelBreakdown,
  useGetMonthlyTrend,
  useGetFunnel,
  useGetRevenueOverview,
  useGetDealPipeline,
  GetDashboardSummaryChannel,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Users,
  Target,
  Activity,
  Megaphone,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  digital: "#1e3a5f",
  sms: "#c9a227",
  email: "#a23b72",
  branch: "#2a9d8f",
};

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const [channel, setChannel] = useState<GetDashboardSummaryChannel | undefined>(
    undefined,
  );
  const { data: summary } = useGetDashboardSummary({ channel });
  const { data: breakdown } = useGetChannelBreakdown();
  const { data: trend } = useGetMonthlyTrend();
  const { data: funnel } = useGetFunnel();
  const { data: revenue } = useGetRevenueOverview();
  const { data: pipeline } = useGetDealPipeline();

  if (!summary) {
    return <div className="p-8 text-muted-foreground">Loading dashboard…</div>;
  }

  const Trend = ({ value }: { value: number }) => {
    if (value === 0)
      return <span className="ml-2 text-xs text-muted-foreground">—</span>;
    const isPositive = value > 0;
    const pct = (value * 100).toFixed(1);
    return (
      <span
        className={cn(
          "ml-2 flex items-center text-xs",
          isPositive ? "text-emerald-600" : "text-red-600",
        )}
      >
        {isPositive ? (
          <ArrowUpRight className="mr-1 h-3 w-3" />
        ) : (
          <ArrowDownRight className="mr-1 h-3 w-3" />
        )}
        {Math.abs(Number(pct))}%
      </span>
    );
  };

  const funnelData = funnel
    ? [
        { stage: "Impressions", count: funnel.impressions },
        { stage: "Clicks", count: funnel.clicks },
        { stage: "Leads", count: funnel.leads },
        { stage: "Conversions", count: funnel.conversions },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}, {user?.name.split(" ")[0] ?? "team"}
        </h1>
        <p className="text-muted-foreground">
          Here's how Trust Bank's marketing & sales engine is performing today.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill
          label="All channels"
          active={!channel}
          onClick={() => setChannel(undefined)}
        />
        {(["digital", "sms", "email", "branch"] as const).map((c) => (
          <FilterPill
            key={c}
            label={c}
            active={channel === c}
            onClick={() => setChannel(c)}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Kpi
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          title="Total leads"
          value={summary.totalLeads.toLocaleString()}
          trend={<Trend value={summary.leadsDelta} />}
        />
        <Kpi
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          title="Conversions"
          value={summary.conversions.toLocaleString()}
          trend={<Trend value={summary.conversionsDelta} />}
        />
        <Kpi
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          title="Conversion rate"
          value={`${(summary.conversionRate * 100).toFixed(1)}%`}
          trend={<Trend value={summary.conversionRateDelta} />}
        />
        <Kpi
          icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
          title="Active campaigns"
          value={
            <>
              {summary.campaignsActive}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {summary.campaignsTotal}
              </span>
            </>
          }
        />
        <Kpi
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          title="Budget used"
          value={`${(summary.budgetUsedPct * 100).toFixed(1)}%`}
          subtitle={`${formatCurrency(summary.budgetSpent)} of ${formatCurrency(summary.budgetTotal)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly leads & conversions</CardTitle>
            <CardDescription>Trend across 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#1e3a5f"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversions"
                    stroke="#c9a227"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel mix</CardTitle>
            <CardDescription>Leads by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown ?? []}
                    dataKey="leads"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(d) => d.channel}
                  >
                    {(breakdown ?? []).map((b) => (
                      <Cell
                        key={b.channel}
                        fill={CHANNEL_COLORS[b.channel] ?? "#888"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Acquisition funnel</CardTitle>
            <CardDescription>
              From impressions through to conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e3a5f" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Pipeline value
            </CardTitle>
            <CardDescription>Across all stages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline?.stages.map((s) => (
              <div key={s.stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{s.stage}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.count} · {formatCurrency(s.totalValue)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width:
                        pipeline.totalValue === 0
                          ? "0%"
                          : `${Math.min(100, (s.totalValue / pipeline.totalValue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="border-t pt-4 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Win rate</span>
                <span className="font-medium tabular-nums text-foreground">
                  {pipeline ? (pipeline.winRate * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Closed this quarter</span>
                <span className="font-medium tabular-nums text-foreground">
                  {pipeline?.closedThisQuarter ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel performance</CardTitle>
          <CardDescription>Spend, leads, conversion rate by channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Channel</th>
                  <th className="px-2 py-2 font-medium">Leads</th>
                  <th className="px-2 py-2 font-medium">Conversions</th>
                  <th className="px-2 py-2 font-medium">Conv. rate</th>
                  <th className="px-2 py-2 font-medium">Budget</th>
                  <th className="px-2 py-2 font-medium">Spent</th>
                  <th className="px-2 py-2 font-medium">Used</th>
                </tr>
              </thead>
              <tbody>
                {(breakdown ?? []).map((row) => (
                  <tr key={row.channel} className="border-b last:border-0">
                    <td className="px-2 py-3 font-medium capitalize">
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHANNEL_COLORS[row.channel] }}
                      />
                      {row.channel}
                    </td>
                    <td className="px-2 py-3 tabular-nums">{row.leads}</td>
                    <td className="px-2 py-3 tabular-nums">{row.conversions}</td>
                    <td className="px-2 py-3 tabular-nums">
                      {(row.conversionRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      {formatCurrency(row.budget)}
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      {formatCurrency(row.spent)}
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      {(row.budgetUsedPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {revenue && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue overview</CardTitle>
            <CardDescription>
              {formatCurrency(revenue.revenueClosedQuarter)} closed this quarter
              · {revenue.dealsInPipeline} deals in pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#c9a227" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {label}
    </button>
  );
}

function Kpi({
  icon,
  title,
  value,
  trend,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  trend?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline text-2xl font-bold tabular-nums">
          {value}
          {trend}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
