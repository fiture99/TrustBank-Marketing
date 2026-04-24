import { useState } from "react";
import {
  useListLeads,
  useGetLead,
  useCreateLead,
  useUpdateLead,
  useCreateInteraction,
  useListUsers,
  useListCampaigns,
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
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatRelative, initials } from "@/lib/utils";
import { Plus, Phone, Mail, MessageSquare, Building, Calendar } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  qualified: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-100 text-slate-600",
};

const INTERACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Calendar,
  branch_visit: Building,
};

export default function Leads() {
  const [stage, setStage] = useState<string>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: leads } = useListLeads({
    stage: stage === "all" ? undefined : (stage as "new" | "contacted" | "qualified" | "converted" | "lost"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Customer prospects across all marketing channels.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New lead</DialogTitle>
            </DialogHeader>
            <CreateLeadForm onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {["all", "new", "contacted", "qualified", "converted", "lost"].map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium capitalize",
                stage === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {s}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(leads ?? []).map((l) => (
                <tr
                  key={l.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  onClick={() => setOpenId(l.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3">{l.productInterest}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.campaignName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.assignedToName ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("capitalize", STAGE_COLORS[l.stage])} variant="outline">
                      {l.stage}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelative(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(leads ?? []).length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No leads in this stage yet.
            </div>
          )}
        </CardContent>
      </Card>

      <LeadDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function LeadDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: lead } = useGetLead(id ?? 0, { query: { enabled: id !== null } });
  const queryClient = useQueryClient();
  const { mutate: updateLead } = useUpdateLead();
  const { mutate: createInteraction } = useCreateInteraction();

  const [type, setType] = useState<"call" | "email" | "sms" | "meeting" | "branch_visit">("call");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {lead && (
          <>
            <SheetHeader>
              <SheetTitle>{lead.name}</SheetTitle>
              <SheetDescription>
                {lead.productInterest} · {lead.phone}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Email" value={lead.email ?? "—"} />
                <Field label="Source" value={lead.source} />
                <Field label="Campaign" value={lead.campaignName ?? "—"} />
                <Field label="Owner" value={lead.assignedToName ?? "Unassigned"} />
              </div>

              <div>
                <Label className="mb-2 block">Stage</Label>
                <Select
                  value={lead.stage}
                  onValueChange={(v) => {
                    updateLead(
                      { id: lead.id, data: { stage: v as "new" | "contacted" | "qualified" | "converted" | "lost" } },
                      { onSuccess: () => queryClient.invalidateQueries() },
                    );
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["new", "contacted", "qualified", "converted", "lost"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Log interaction
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="branch_visit">Branch visit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Next follow-up</Label>
                      <Input
                        type="date"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="What happened in this interaction?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (!notes.trim()) return;
                      createInteraction(
                        {
                          data: {
                            leadId: lead.id,
                            type,
                            notes,
                            nextFollowUp: followUp || undefined,
                          },
                        },
                        {
                          onSuccess: () => {
                            setNotes("");
                            setFollowUp("");
                            queryClient.invalidateQueries();
                          },
                        },
                      );
                    }}
                  >
                    Log interaction
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Activity timeline
                </h3>
                <div className="space-y-3">
                  {lead.interactions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
                  )}
                  {lead.interactions.map((it) => {
                    const Icon = INTERACTION_ICONS[it.type] ?? MessageSquare;
                    return (
                      <div key={it.id} className="flex gap-3 rounded-lg border p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="capitalize">{it.type.replace("_", " ")}</span>
                            <span>{formatRelative(it.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm">{it.notes}</p>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>by {it.salesOfficerName}</span>
                            {it.nextFollowUp && (
                              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                                Follow-up: {it.nextFollowUp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function CreateLeadForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [productInterest, setProductInterest] = useState("");
  const [source, setSource] = useState("Walk-in");
  const [campaignId, setCampaignId] = useState<string>("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateLead();
  const { data: campaigns } = useListCampaigns();
  const { data: users } = useListUsers();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutate(
          {
            data: {
              name,
              phone,
              email: email || undefined,
              productInterest,
              source,
              campaignId: campaignId ? Number(campaignId) : undefined,
              assignedToId: assignedToId ? Number(assignedToId) : undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Email (optional)</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>Product interest</Label>
        <Input
          value={productInterest}
          onChange={(e) => setProductInterest(e.target.value)}
          placeholder="Savings account, Home loan, etc."
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Source</Label>
          <Input value={source} onChange={(e) => setSource(e.target.value)} required />
        </div>
        <div>
          <Label>Campaign</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {(campaigns ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Assign to</Label>
        <Select value={assignedToId} onValueChange={setAssignedToId}>
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            {(users ?? [])
              .filter((u) => u.role === "sales" || u.role === "manager")
              .map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add lead"}
        </Button>
      </DialogFooter>
    </form>
  );
}
