import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import {
  useGetSimulation,
  useListSimulationAgents,
  useListSimulationMessages,
  useGetSimulationAnalytics,
  useRunSimulation,
  getGetSimulationQueryKey,
  getListSimulationMessagesQueryKey,
  getGetSimulationAnalyticsQueryKey,
  getListSimulationAgentsQueryKey,
} from "@workspace/api-client-react";
import type { DebateMessage } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2, AlertTriangle, Activity, Map, Users, MessageSquare,
  TrendingUp, ChevronLeft, Play, RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AgentNodeGraph } from "@/components/AgentNodeGraph";
import { DebateFeed } from "@/components/DebateFeed";
import {
  Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ── Sentiment distribution helpers ────────────────────────────────────────────
const SENTIMENT_CATS = [
  { key: "strongly_support", label: "Strongly support", color: "#10b981", bg: "bg-emerald-500" },
  { key: "support",          label: "Support",          color: "#22c55e", bg: "bg-green-400" },
  { key: "neutral",          label: "Neutral",          color: "#6b7280", bg: "bg-gray-500" },
  { key: "oppose",           label: "Oppose",           color: "#f97316", bg: "bg-orange-400" },
  { key: "strongly_oppose",  label: "Strongly oppose",  color: "#ef4444", bg: "bg-red-500" },
] as const;

function useSentimentDistribution(messages: DebateMessage[]) {
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of SENTIMENT_CATS) counts[cat.key] = 0;
    for (const m of messages) {
      if (counts[m.sentiment] !== undefined) counts[m.sentiment]++;
    }
    const total = messages.length || 1;
    return SENTIMENT_CATS.map((cat) => ({
      ...cat,
      count: counts[cat.key],
      pct: (counts[cat.key] / total) * 100,
    }));
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

function SentimentDistributionBar({ messages }: { messages: DebateMessage[] }) {
  const dist = useSentimentDistribution(messages);
  const total = messages.length;

  if (total === 0) return null;

  return (
    <div className="bg-background/60 backdrop-blur rounded-lg border border-border/50 px-4 py-3 col-span-2 md:col-span-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Sentiment Breakdown
        </span>
        <span className="text-[10px] text-muted-foreground">{total} messages</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <div className="flex h-3 rounded-full overflow-hidden cursor-pointer hover:brightness-110 transition-all gap-px">
            {dist.map((d) =>
              d.pct > 0 ? (
                <div
                  key={d.key}
                  className={`${d.bg} h-full transition-all`}
                  style={{ width: `${d.pct}%` }}
                  title={`${d.label}: ${d.count}`}
                />
              ) : null
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-3">
          <p className="text-xs font-semibold mb-2 text-foreground">Sentiment Distribution</p>
          <div className="space-y-2">
            {dist.map((d) => (
              <div key={d.key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-muted-foreground flex-1">{d.label}</span>
                <span className="text-xs font-mono font-medium text-foreground">{d.count}</span>
                <span className="text-[10px] text-muted-foreground w-10 text-right">{d.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Labels below bar */}
      <div className="flex gap-3 mt-2 flex-wrap">
        {dist.filter(d => d.pct > 0).map((d) => (
          <div key={d.key} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[10px] text-muted-foreground">{d.label} {d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SimulationDetail() {
  const [, params] = useRoute("/simulations/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("demographics");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: simulation, isLoading: isSimLoading } = useGetSimulation(id, {
    query: { enabled: !!id, refetchInterval: isGenerating ? 2000 : 8000 },
  });
  const { data: agents } = useListSimulationAgents(id, {
    query: { enabled: !!id },
  });
  const { data: messages, isLoading: isMessagesLoading } = useListSimulationMessages(id, {
    query: { enabled: !!id, refetchInterval: isGenerating ? 2000 : 6000 },
  });
  const { data: analytics } = useGetSimulationAnalytics(id, {
    query: { enabled: !!id, refetchInterval: isGenerating ? 2000 : 8000 },
  });

  const runSimulation = useRunSimulation();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetSimulationQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListSimulationMessagesQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetSimulationAnalyticsQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListSimulationAgentsQueryKey(id) });
  };

  const handleRun = () => {
    setIsGenerating(true);
    runSimulation.mutate({ id }, {
      onSuccess: (data) => {
        toast({
          title: "Simulation Complete",
          description: `${data.messagesGenerated} messages generated from ${data.agentsActivated} citizen archetypes.`,
        });
        invalidateAll();
        setIsGenerating(false);
      },
      onError: () => {
        toast({ title: "Run Failed", description: "Could not execute simulation. Try again.", variant: "destructive" });
        setIsGenerating(false);
      },
    });
  };

  if (isSimLoading || !simulation) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Activity className="w-8 h-8 animate-pulse" />
          <p className="font-mono text-sm tracking-widest uppercase">Loading simulation data...</p>
        </div>
      </div>
    );
  }

  const hasMessages = (messages?.length ?? 0) > 0;
  const protestRisk = simulation.protestRisk ?? 0;

  const statusColor: Record<string, string> = {
    running: "bg-primary/10 text-primary border-primary/20 animate-pulse",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    draft: "bg-muted/50 text-muted-foreground",
  };

  return (
    <div className="flex flex-col gap-5 pb-10 animate-in fade-in duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/simulations">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight truncate">{simulation.title}</h1>
              <Badge variant="outline" className={`font-mono text-[10px] uppercase shrink-0 ${statusColor[simulation.status] ?? statusColor.draft}`}>
                {simulation.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
              <Map className="w-3 h-3 shrink-0" /> {simulation.city} &bull; {format(new Date(simulation.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {!hasMessages ? (
            <Button
              onClick={handleRun}
              disabled={isGenerating || runSimulation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 flex-1 sm:flex-none gap-2"
            >
              {isGenerating || runSimulation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                : <><Play className="w-4 h-4 fill-current" /> Run Simulation</>}
            </Button>
          ) : (
            <Button
              onClick={handleRun}
              disabled={isGenerating || runSimulation.isPending}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 flex-1 sm:flex-none gap-2"
            >
              {isGenerating || runSimulation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                : <><RefreshCw className="w-4 h-4" /> Re-run Analysis</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── Metrics Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox
          label="Sentiment"
          value={simulation.overallSentiment > 0
            ? `+${simulation.overallSentiment.toFixed(2)}`
            : simulation.overallSentiment.toFixed(2)}
          color={simulation.overallSentiment >= 0 ? "text-emerald-400" : "text-destructive"}
        />
        <MetricBox
          label="Protest Risk"
          value={`${(protestRisk * 100).toFixed(0)}%`}
          color={protestRisk > 0.7 ? "text-destructive" : protestRisk > 0.4 ? "text-primary" : "text-emerald-400"}
          icon={protestRisk > 0.7 ? <AlertTriangle className="w-3.5 h-3.5 inline ml-1 animate-pulse text-destructive" /> : null}
        />
        <MetricBox label="Agents" value={simulation.agentCount.toString()} />
        <MetricBox
          label="Messages"
          value={simulation.messageCount.toString()}
          color={simulation.messageCount > 0 ? "text-primary" : "text-muted-foreground"}
        />
        <SentimentDistributionBar messages={messages ?? []} />
      </div>

      {/* ── Main content: Two-column on lg ── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left column: Node Graph + Analytics ── */}
        <div className="flex flex-col gap-5 flex-1 min-w-0">

          {/* Three.js Agent Node Graph */}
          <div className="rounded-xl overflow-hidden border border-border/50 h-[360px] md:h-[420px] shrink-0 relative">
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 bg-background/50 px-2 py-0.5 rounded">
                Agent Network
              </span>
            </div>
            <AgentNodeGraph
              agents={agents ?? []}
              messages={messages ?? []}
              protestRisk={protestRisk}
              hasData={hasMessages}
            />
          </div>

          {/* Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card/50 backdrop-blur border border-border/50 w-full justify-start h-auto p-1 flex-wrap">
              <TabsTrigger value="demographics" className="py-1.5 text-xs">Demographics</TabsTrigger>
              <TabsTrigger value="timeline" className="py-1.5 text-xs">Sentiment Timeline</TabsTrigger>
              <TabsTrigger value="coalitions" className="py-1.5 text-xs">Coalitions</TabsTrigger>
              <TabsTrigger value="concerns" className="py-1.5 text-xs">Top Concerns</TabsTrigger>
            </TabsList>

            <div className="mt-3 rounded-xl bg-card/30 border border-border/50 p-4">

              <TabsContent value="demographics" className="m-0">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Sentiment by Archetype</h3>
                <div className="h-[260px]">
                  {analytics?.sentimentByDemographic && analytics.sentimentByDemographic.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.sentimentByDemographic} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
                        <XAxis type="number" domain={[-1, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis dataKey="demographic" type="category" width={130} stroke="hsl(var(--foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                          formatter={(val: number) => [val.toFixed(3), "Sentiment"]}
                        />
                        <Bar dataKey="sentimentScore" radius={[0, 4, 4, 0]}>
                          {analytics.sentimentByDemographic.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.sentimentScore >= 0 ? "hsl(var(--chart-4))" : "hsl(var(--destructive))"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="Run the simulation to see demographic data" />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="m-0">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Sentiment Over Time</h3>
                <div className="h-[260px]">
                  {analytics?.sentimentOverTime && analytics.sentimentOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.sentimentOverTime} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                        <XAxis dataKey="timestamp" tickFormatter={(val) => { try { return format(new Date(val), 'HH:mm'); } catch { return val; } }} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={[-1, 1]} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                          labelFormatter={(val) => { try { return format(new Date(val), 'HH:mm:ss'); } catch { return val; } }}
                          formatter={(val: number) => [val.toFixed(3), "Sentiment"]}
                        />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSentiment)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="Run the simulation to generate timeline data" />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="coalitions" className="m-0">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Coalition Formation</h3>
                <div className="h-[260px] flex items-center justify-center">
                  {analytics?.coalitionFormation && analytics.coalitionFormation.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={analytics.coalitionFormation}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Radar name="Strength" dataKey="strength" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No coalitions formed yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="concerns" className="m-0">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Top Concerns</h3>
                <div className="h-[260px]">
                  {analytics?.topConcerns && analytics.topConcerns.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topConcerns} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis dataKey="concern" type="category" width={140} stroke="hsl(var(--foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                        <Bar dataKey="sentimentImpact" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="Impact" />
                        <Bar dataKey="frequency" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Frequency" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="Run the simulation to see top concerns" />
                  )}
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>

        {/* ── Right column: Debate Feed ── */}
        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col rounded-xl border border-border/50 bg-card/30 backdrop-blur overflow-hidden" style={{ minHeight: 480 }}>
          <div className="p-4 border-b border-border/50 bg-background/50 backdrop-blur shrink-0">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-primary" />
              Live Reaction Feed
            </h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Simulated public discourse</p>
              {hasMessages && (
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {messages?.length ?? 0} posts
                </Badge>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <DebateFeed messages={messages ?? []} isLoading={isGenerating || isMessagesLoading} />
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricBox({ label, value, color = "text-foreground", icon }: {
  label: string; value: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-background/60 backdrop-blur p-3 md:p-4 rounded-lg border border-border/50">
      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl md:text-2xl font-bold font-mono ${color}`}>
        {value} {icon}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <TrendingUp className="w-8 h-8 opacity-20" />
      <p className="text-sm text-center">{label}</p>
    </div>
  );
}
