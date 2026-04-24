import {
  useListFollowUpsDue,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function FollowUps() {
  const { data: user } = useGetCurrentUser();
  const { data: items } = useListFollowUpsDue();

  const myItems = (items ?? []).filter((i) => i.salesOfficerId === user?.id);
  const teamItems = (items ?? []).filter((i) => i.salesOfficerId !== user?.id);

  const overdue = (its: typeof items) =>
    (its ?? []).filter((i) => i.daysOverdue > 0);
  const today = (its: typeof items) =>
    (its ?? []).filter((i) => i.daysOverdue === 0);
  const upcoming = (its: typeof items) =>
    (its ?? []).filter((i) => i.daysOverdue < 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
        <p className="text-muted-foreground">
          Stay on top of customer commitments. Overdue items are highlighted.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          label="Overdue"
          count={overdue(items).length}
          tone="danger"
        />
        <SummaryCard
          icon={<Calendar className="h-5 w-5 text-amber-600" />}
          label="Due today"
          count={today(items).length}
          tone="warning"
        />
        <SummaryCard
          icon={<Calendar className="h-5 w-5 text-emerald-600" />}
          label="Upcoming (7 days)"
          count={upcoming(items).length}
          tone="success"
        />
      </div>

      <FollowUpSection
        title="My follow-ups"
        description={`Assigned to ${user?.name}`}
        items={myItems}
      />

      <FollowUpSection
        title="Team follow-ups"
        description="Visible to managers — across the team"
        items={teamItems}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: "danger" | "warning" | "success";
}) {
  const toneClass = {
    danger: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    success: "bg-emerald-50 border-emerald-200",
  }[tone];

  return (
    <Card className={cn("border-2", toneClass)}>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{count}</div>
        </div>
        <div className="rounded-full bg-white p-3 shadow-sm">{icon}</div>
      </CardContent>
    </Card>
  );
}

function FollowUpSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ReturnType<typeof useListFollowUpsDue>["data"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {(items ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing scheduled. You're all caught up.
          </p>
        )}
        <div className="space-y-3">
          {(items ?? []).map((it) => {
            const isOverdue = it.daysOverdue > 0;
            const isToday = it.daysOverdue === 0;
            return (
              <div
                key={it.interactionId}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-lg border p-4",
                  isOverdue && "border-red-300 bg-red-50/50",
                  isToday && "border-amber-300 bg-amber-50/50",
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{it.leadName}</span>
                    {isOverdue && (
                      <Badge variant="outline" className="bg-red-100 text-red-700">
                        Overdue {it.daysOverdue}d
                      </Badge>
                    )}
                    {isToday && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700">
                        Due today
                      </Badge>
                    )}
                    {!isOverdue && !isToday && (
                      <Badge variant="outline">In {Math.abs(it.daysOverdue)}d</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{it.notes}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Owner: {it.salesOfficerName} · Phone: {it.leadPhone} · Due {it.nextFollowUp}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Link href="/leads">
                    <Button size="sm" variant="default">
                      <Phone className="mr-1 h-3 w-3" /> Call
                    </Button>
                  </Link>
                  <Link href="/leads">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="mr-1 h-3 w-3" /> Note
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
