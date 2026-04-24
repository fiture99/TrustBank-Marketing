import { useState } from "react";
import {
  useListCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Plus, Trash2, Smartphone, Mail, Globe, Building } from "lucide-react";

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  digital: Globe,
  sms: Smartphone,
  email: Mail,
  branch: Building,
};

const STATUS_VARIANTS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-slate-100 text-slate-700",
};

export default function Campaigns() {
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaigns } = useListCampaigns({
    channel: channelFilter === "all" ? undefined : (channelFilter as "digital" | "sms" | "email" | "branch"),
    status: statusFilter === "all" ? undefined : (statusFilter as "active" | "paused" | "ended"),
  });

  const { mutate: deleteCampaign } = useDeleteCampaign();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    deleteCampaign(
      { id },
      {
        onSuccess: () => queryClient.invalidateQueries(),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage marketing campaigns across digital, SMS, email and branch channels.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create campaign</DialogTitle>
            </DialogHeader>
            <CampaignForm onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="digital">Digital</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(campaigns ?? []).map((c) => {
          const Icon = CHANNEL_ICONS[c.channel] ?? Globe;
          const usedPct = c.budget === 0 ? 0 : (c.spent / c.budget) * 100;
          const convRate = c.leadsGenerated === 0 ? 0 : (c.conversions / c.leadsGenerated) * 100;
          return (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                  </div>
                  <Badge className={cn("capitalize", STATUS_VARIANTS[c.status])} variant="outline">
                    {c.status}
                  </Badge>
                </div>
                <CardDescription>{c.targetAudience}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Stat label="Leads" value={c.leadsGenerated.toString()} />
                  <Stat label="Conversions" value={c.conversions.toString()} />
                  <Stat label="Conv. rate" value={`${convRate.toFixed(1)}%`} />
                  <Stat label="Channel" value={c.channel} className="capitalize" />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Budget used</span>
                    <span className="tabular-nums">
                      {formatCurrency(c.spent)} / {formatCurrency(c.budget)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full",
                        usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-amber-500" : "bg-primary",
                      )}
                      style={{ width: `${Math.min(100, usedPct)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>
                    {formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : "ongoing"}
                  </span>
                  <span>Owner: {c.ownerName}</span>
                </div>
              </CardContent>
              <div className="flex justify-end border-t p-3">
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {(campaigns ?? []).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No campaigns match the current filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums", className)}>{value}</div>
    </div>
  );
}

function CampaignForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"digital" | "sms" | "email" | "branch">("digital");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "ended">("active");
  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateCampaign();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutate(
          {
            data: {
              name,
              channel,
              startDate,
              endDate: endDate || undefined,
              budget: Number(budget),
              targetAudience: audience,
              status,
            },
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries();
              onClose();
            },
          },
        );
      }}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="digital">Digital</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="start">Start date</Label>
          <Input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="end">End date (optional)</Label>
          <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="budget">Budget (D)</Label>
        <Input
          id="budget"
          type="number"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="audience">Target audience</Label>
        <Textarea
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create campaign"}
        </Button>
      </DialogFooter>
    </form>
  );
}
