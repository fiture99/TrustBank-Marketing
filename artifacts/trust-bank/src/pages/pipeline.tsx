import { useState } from "react";
import {
  useListDeals,
  useUpdateDeal,
  useGetDealPipeline,
  useCreateDeal,
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
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, TrendingUp, GripVertical } from "lucide-react";

const STAGES: Array<{
  key: "prospect" | "negotiation" | "won" | "lost";
  label: string;
  color: string;
}> = [
  { key: "prospect", label: "Prospect", color: "bg-blue-50 border-blue-200" },
  { key: "negotiation", label: "Negotiation", color: "bg-amber-50 border-amber-200" },
  { key: "won", label: "Won", color: "bg-emerald-50 border-emerald-200" },
  { key: "lost", label: "Lost", color: "bg-slate-50 border-slate-200" },
];

export default function Pipeline() {
  const { data: deals } = useListDeals();
  const { data: pipeline } = useGetDealPipeline();
  const queryClient = useQueryClient();
  const { mutate: updateDeal } = useUpdateDeal();
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const onDrop = (stage: "prospect" | "negotiation" | "won" | "lost") => {
    if (!draggedId) return;
    updateDeal(
      { id: draggedId, data: { stage } },
      { onSuccess: () => queryClient.invalidateQueries() },
    );
    setDraggedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Drag deals between stages. Total pipeline:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(pipeline?.totalValue ?? 0)}
            </span>{" "}
            · Win rate{" "}
            <span className="font-semibold text-foreground">
              {((pipeline?.winRate ?? 0) * 100).toFixed(1)}%
            </span>
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create deal</DialogTitle>
            </DialogHeader>
            <CreateDealForm onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage) => {
          const stageDeals = (deals ?? []).filter((d) => d.stage === stage.key);
          const stageStats = pipeline?.stages.find((s) => s.stage === stage.key);
          return (
            <div
              key={stage.key}
              className={cn(
                "flex h-full flex-col rounded-lg border-2 border-dashed p-3",
                stage.color,
                draggedId !== null && "border-primary",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage.key)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{stage.label}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums shadow-sm">
                  {stageDeals.length}
                </span>
              </div>
              <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {formatCurrency(stageStats?.totalValue ?? 0)}
              </div>
              <div className="space-y-2">
                {stageDeals.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDraggedId(d.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className="cursor-move rounded-md border bg-card p-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{d.customerName}</div>
                        <div className="text-xs text-muted-foreground">{d.productType}</div>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 text-base font-bold tabular-nums text-primary">
                      {formatCurrency(d.value)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{d.salesOfficerName}</span>
                      <span>Close {d.expectedCloseDate}</span>
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="rounded-md border border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
                    Drop deals here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pipeline && (
        <Card>
          <CardHeader>
            <CardTitle>Quarterly snapshot</CardTitle>
            <CardDescription>
              {pipeline.closedThisQuarter} deals closed this quarter
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Snapshot label="Pipeline value" value={formatCurrency(pipeline.totalValue)} />
            <Snapshot label="Win rate" value={`${(pipeline.winRate * 100).toFixed(1)}%`} />
            <Snapshot label="Closed this quarter" value={String(pipeline.closedThisQuarter)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function CreateDealForm({ onClose }: { onClose: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productType, setProductType] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<"prospect" | "negotiation" | "won" | "lost">("prospect");
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateDeal();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutate(
          {
            data: {
              customerName,
              customerPhone,
              productType,
              value: Number(value),
              stage,
              expectedCloseDate,
              notes: notes || undefined,
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
          <Label>Customer</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Product</Label>
        <Input value={productType} onChange={(e) => setProductType(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Value (D)</Label>
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Stage</Label>
          <Select value={stage} onValueChange={(v) => setStage(v as typeof stage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Expected close date</Label>
        <Input
          type="date"
          value={expectedCloseDate}
          onChange={(e) => setExpectedCloseDate(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Create deal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
