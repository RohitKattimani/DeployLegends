import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListSimulations, useDeleteSimulation, getListSimulationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Plus, Search, Trash2, Users, MessageSquare, AlertTriangle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SimulationsList() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: simulations, isLoading } = useListSimulations();
  const deleteSimulation = useDeleteSimulation();

  const handleDelete = (id: number) => {
    deleteSimulation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Simulation deleted", description: "The simulation has been permanently removed." });
        queryClient.invalidateQueries({ queryKey: getListSimulationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete simulation.", variant: "destructive" });
      }
    });
  };

  const filteredSimulations = simulations?.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulations</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor active policy models</p>
        </div>
        <Link href="/simulations/new">
          <Button className="shadow-lg shadow-primary/20 gap-2">
            <Plus className="w-4 h-4" />
            New Simulation
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by title or city..." 
          className="pl-9 bg-card/50 backdrop-blur border-border/50 focus-visible:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-primary">
            <Activity className="w-8 h-8 animate-pulse" />
            <p className="font-mono text-sm tracking-widest uppercase">Loading simulations...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSimulations?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card/30 rounded-xl border border-border/50 border-dashed">
              No simulations found. Create a new one to begin.
            </div>
          ) : (
            filteredSimulations?.map((sim) => (
              <Card key={sim.id} className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 transition-colors flex flex-col cursor-pointer group" onClick={() => setLocation(`/simulations/${sim.id}`)}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${
                      sim.status === 'running' ? 'bg-primary/10 text-primary border-primary/20' : 
                      sim.status === 'completed' ? 'bg-chart-4/10 text-chart-4 border-chart-4/20' :
                      sim.status === 'paused' ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' :
                      'bg-muted/50 text-muted-foreground'
                    }`}>
                      {sim.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(sim.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">{sim.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    {sim.city}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {sim.policyDescription}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sentiment</p>
                      <div className={`text-lg font-mono font-bold ${sim.overallSentiment >= 0 ? "text-green-500" : "text-destructive"}`}>
                        {sim.overallSentiment > 0 ? "+" : ""}{sim.overallSentiment.toFixed(2)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Protest Risk</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`text-lg font-mono font-bold ${sim.protestRisk > 0.7 ? "text-destructive" : sim.protestRisk > 0.4 ? "text-primary" : "text-green-500"}`}>
                          {(sim.protestRisk * 100).toFixed(0)}%
                        </div>
                        {sim.protestRisk > 0.7 && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {sim.agentCount}</span>
                    <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {sim.messageCount}</span>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Simulation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the simulation model and all associated agent history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-muted text-foreground border-0 hover:bg-muted/80">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(sim.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors" onClick={() => setLocation(`/simulations/${sim.id}`)}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
