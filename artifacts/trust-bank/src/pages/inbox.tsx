import {
  useListInboxAlerts,
  useMarkInboxAlertRead,
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
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatRelative } from "@/lib/utils";
import {
  Bell,
  Megaphone,
  TrendingUp,
  Calendar,
  Settings,
  UserPlus,
  Check,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  campaign: Megaphone,
  deal: TrendingUp,
  follow_up: Calendar,
  system: Settings,
  lead: UserPlus,
};

const CATEGORY_COLORS: Record<string, string> = {
  campaign: "bg-amber-100 text-amber-700",
  deal: "bg-emerald-100 text-emerald-700",
  follow_up: "bg-red-100 text-red-700",
  system: "bg-slate-100 text-slate-700",
  lead: "bg-blue-100 text-blue-700",
};

export default function Inbox() {
  const { data: alerts } = useListInboxAlerts();
  const { mutate: markRead } = useMarkInboxAlertRead();
  const queryClient = useQueryClient();

  const unread = (alerts ?? []).filter((a) => !a.read);
  const read = (alerts ?? []).filter((a) => a.read);

  const markAll = () => {
    unread.forEach((a) =>
      markRead({ id: a.id }, { onSuccess: () => queryClient.invalidateQueries() }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground">
            Personal in-app alerts. {unread.length} unread.
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" onClick={markAll}>
            <Check className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unread</CardTitle>
          <CardDescription>{unread.length} new alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {unread.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          )}
          <div className="space-y-3">
            {unread.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                onMarkRead={() =>
                  markRead({ id: a.id }, { onSuccess: () => queryClient.invalidateQueries() })
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Earlier</CardTitle>
          <CardDescription>{read.length} read alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {read.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing in your archive yet.
            </p>
          )}
          <div className="space-y-3">
            {read.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({
  alert,
  onMarkRead,
}: {
  alert: { id: number; title: string; body: string; category: string; read: boolean; createdAt: string };
  onMarkRead?: () => void;
}) {
  const Icon = CATEGORY_ICONS[alert.category] ?? Bell;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        !alert.read && "bg-primary/5",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{alert.title}</span>
          <Badge variant="outline" className={cn("capitalize", CATEGORY_COLORS[alert.category])}>
            {alert.category.replace("_", " ")}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{alert.body}</p>
        <div className="mt-1 text-xs text-muted-foreground">{formatRelative(alert.createdAt)}</div>
      </div>
      {onMarkRead && (
        <Button variant="ghost" size="sm" onClick={onMarkRead}>
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
