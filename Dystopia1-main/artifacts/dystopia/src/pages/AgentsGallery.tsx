import { useState } from "react";
import { useListAgents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, Activity, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AgentsGallery() {
  const [search, setSearch] = useState("");
  const { data: agents, isLoading } = useListAgents();

  const filteredAgents = agents?.filter(agent => 
    agent.name.toLowerCase().includes(search.toLowerCase()) || 
    agent.archetype.toLowerCase().includes(search.toLowerCase()) ||
    agent.neighborhood.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Archetypes</h1>
          <p className="text-muted-foreground mt-1">Directory of digital citizen models used in simulations</p>
        </div>
        <div className="flex items-center gap-2 bg-card/50 border border-border/50 px-4 py-2 rounded-lg">
          <Users className="w-5 h-5 text-primary" />
          <div className="text-sm font-medium">
            <span className="text-2xl font-bold mr-2">{agents?.length || 0}</span>
            Active Profiles
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name, archetype, or neighborhood..." 
          className="pl-9 bg-card/50 backdrop-blur border-border/50 focus-visible:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-primary">
            <Activity className="w-8 h-8 animate-pulse" />
            <p className="font-mono text-sm tracking-widest uppercase">Loading citizen profiles...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAgents?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card/30 rounded-xl border border-border/50 border-dashed">
              No profiles found matching your search.
            </div>
          ) : (
            filteredAgents?.map((agent) => {
              const isSupport = agent.sentimentScore > 0.3;
              const isOppose = agent.sentimentScore < -0.3;
              
              const badgeColor = isSupport ? "bg-green-500/20 text-green-500" :
                                isOppose ? "bg-destructive/20 text-destructive" :
                                "bg-primary/20 text-primary";

              return (
                <Card key={agent.id} className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${badgeColor} border-none`}>
                        {agent.archetype.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">ID: {agent.id.toString().padStart(4, '0')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarFallback className="bg-background text-sm font-medium">
                          {agent.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{agent.name}, {agent.age}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5 text-xs">
                          <MapPin className="w-3 h-3" /> {agent.neighborhood}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                      "{agent.bio}"
                    </p>
                    
                    <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Primary Concerns</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.concerns.slice(0, 3).map((concern, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] bg-background/50 text-muted-foreground font-normal">
                              {concern}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Base Sentiment</p>
                          <p className="text-xs font-mono uppercase mt-0.5">{agent.sentiment.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Status</p>
                          <p className="text-xs font-mono uppercase mt-0.5 text-primary">
                            {agent.isActive ? 'Active' : 'Dormant'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
