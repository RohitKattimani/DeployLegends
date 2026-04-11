import { useGetConsiliumDashboard, useGetRiskAlerts, useGetDemographicBreakdown } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Activity, Users, MessageSquare, BarChart3, TrendingUp, AlertCircle, ShieldAlert, Plus } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ConsiliumDashboard() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetConsiliumDashboard({
    query: { refetchInterval: 8000 },
  });
  const { data: alerts, isLoading: isLoadingAlerts } = useGetRiskAlerts({
    query: { refetchInterval: 8000 },
  });
  const { data: demographics, isLoading: isLoadingDemographics } = useGetDemographicBreakdown({
    query: { refetchInterval: 8000 },
  });

  if (isLoadingDashboard || isLoadingAlerts || isLoadingDemographics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Activity className="w-8 h-8 animate-pulse" />
          <p className="font-mono text-sm tracking-widest uppercase">Initializing Consilium uplink...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const hasData = dashboard.totalSimulations > 0;
  const hasSentimentData = (dashboard.sentimentTrend?.length ?? 0) > 0;
  const hasDemographicsData = demographics && demographics.some((d) => d.count > 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consilium Command</h1>
          <p className="text-muted-foreground mt-1">Real-time policy simulation telemetry</p>
        </div>
        <Link href="/simulations/new">
          <Button className="shadow-lg shadow-primary/20 gap-2">
            <Plus className="w-4 h-4" />
            Initialize Simulation
          </Button>
        </Link>
      </div>

      {/* Empty state for brand new users */}
      {!hasData && (
        <Card className="border-border/50 bg-card/30 backdrop-blur border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="w-12 h-12 text-primary/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No simulations yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Create your first policy simulation to see live debate data, protest risk indicators, and demographic sentiment here.
            </p>
            <Link href="/simulations/new">
              <Button className="shadow-lg shadow-primary/20 gap-2">
                <Plus className="w-4 h-4" />
                Start Your First Simulation
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Simulations"
          value={dashboard.totalSimulations.toString()}
          subtitle={`${dashboard.activeSimulations} currently running`}
          icon={Activity}
        />
        <MetricCard
          title="Protest Risk Alerts"
          value={dashboard.highRiskSimulations.toString()}
          subtitle={dashboard.highRiskSimulations > 0 ? "Policies with high risk" : "No active threats"}
          icon={AlertTriangle}
          trendDanger={dashboard.highRiskSimulations > 0}
          valueColor={dashboard.highRiskSimulations > 0 ? "text-destructive" : "text-green-500"}
        />
        <MetricCard
          title="Agent Population"
          value={dashboard.totalAgents.toLocaleString()}
          subtitle="Active citizen archetypes"
          icon={Users}
        />
        <MetricCard
          title="Avg Sentiment"
          value={
            hasData
              ? (dashboard.avgSentiment > 0 ? `+${dashboard.avgSentiment.toFixed(2)}` : dashboard.avgSentiment.toFixed(2))
              : "—"
          }
          subtitle={hasData ? "Across all your simulations" : "Run a simulation to see data"}
          icon={BarChart3}
          valueColor={dashboard.avgSentiment >= 0 ? "text-green-500" : "text-destructive"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Sentiment Trend */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Sentiment Trend
            </CardTitle>
            <CardDescription>
              {hasSentimentData
                ? "Real-time public reaction across your simulations"
                : "Run a simulation to populate this chart"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {hasSentimentData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.sentimentTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(val) => {
                        try { return format(new Date(val), 'HH:mm'); } catch { return val; }
                      }}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[-1, 1]}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      labelFormatter={(val) => {
                        try { return format(new Date(val), 'MMM d, HH:mm'); } catch { return val; }
                      }}
                      formatter={(val: number) => [val.toFixed(3), "Sentiment"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No sentiment data yet</p>
                  <Link href="/simulations/new">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Create Simulation
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Global Risk Alerts */}
        <Card className="border-border/50 bg-card/50 backdrop-blur flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Active Risk Alerts
            </CardTitle>
            <CardDescription>Critical anomalies demanding attention</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[300px] pr-2">
            <div className="space-y-4">
              {alerts && alerts.length > 0 ? alerts.map((alert) => (
                <div key={alert.id} className="flex gap-3 items-start border-l-2 border-destructive pl-3 py-1">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <Link href={`/simulations/${alert.simulationId}`}>
                      <h4 className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
                        {alert.simulationTitle}
                      </h4>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(alert.createdAt), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {hasData ? "No risk alerts triggered yet." : "Alerts will appear after you run a simulation."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Simulations */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Simulations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentSimulations.length > 0 ? (
              <>
                <div className="space-y-4">
                  {dashboard.recentSimulations.map((sim) => (
                    <div key={sim.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/50 transition-colors">
                      <div>
                        <Link href={`/simulations/${sim.id}`}>
                          <h4 className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
                            {sim.title}
                          </h4>
                        </Link>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {sim.agentCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {sim.messageCount}
                          </span>
                          <span>{sim.city}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono ${sim.overallSentiment >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {sim.messageCount > 0 ? (sim.overallSentiment > 0 ? "+" : "") + sim.overallSentiment.toFixed(2) : "—"}
                        </div>
                        <div className="text-[10px] uppercase mt-1 px-1.5 py-0.5 rounded bg-muted">
                          {sim.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link href="/simulations">
                    <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No simulations yet. Create one to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demographics Summary */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Demographic Polarization
            </CardTitle>
            <CardDescription>
              {hasDemographicsData ? "Average sentiment by citizen archetype" : "Run a simulation to see demographic data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {hasDemographicsData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demographics} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[-1, 1]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="demographic" type="category" width={110} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      formatter={(val: number) => [val.toFixed(3), "Avg Sentiment"]}
                    />
                    <Bar dataKey="sentimentScore" radius={[0, 4, 4, 0]}>
                      {
                        demographics!.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.sentimentScore >= 0 ? "hsl(var(--chart-4))" : "hsl(var(--destructive))"} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Users className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No demographic data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, trendDanger, valueColor = "text-foreground" }: any) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <div className={`text-2xl md:text-3xl font-bold font-mono tracking-tight ${valueColor}`}>{value}</div>
          {trend && (
            <div className={`text-xs font-medium ${trendDanger ? "text-destructive" : "text-green-500"}`}>
              {trend}
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
