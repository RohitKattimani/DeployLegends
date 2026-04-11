import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useListThreads, useVoteOnMessage } from "@workspace/api-client-react";
import type { ArchetypeThread, DebateMessage } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronUp, ChevronDown, MessageSquare, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Archetype display name lookup (mirrors threads route)
export const ARCHETYPE_DISPLAY: Record<string, string> = {
  transport_worker: "Transport Worker",
  informal_trader: "Informal Trader",
  student: "Student",
  urban_professional: "Urban Professional",
  household_manager: "Household Manager",
  small_business_owner: "Small Business Owner",
  civil_society: "Civil Society",
  senior_citizen: "Senior Citizen",
  daily_wage_worker: "Daily Wage Worker",
  salaried_professional: "Salaried Professional",
  // legacy
  auto_driver: "Transport Worker",
  street_vendor: "Informal Trader",
  software_engineer: "Urban Professional",
  homemaker: "Household Manager",
  activist: "Civil Society",
  retired_teacher: "Senior Citizen",
  construction_worker: "Daily Wage Worker",
  middle_class_professional: "Salaried Professional",
};

const SENTIMENT_COLORS: Record<string, string> = {
  strongly_support: "text-emerald-500",
  support: "text-green-400",
  neutral: "text-muted-foreground",
  oppose: "text-orange-400",
  strongly_oppose: "text-red-500",
};

const SENTIMENT_BG: Record<string, string> = {
  strongly_support: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  support: "bg-green-500/10 text-green-400 border-green-500/20",
  neutral: "bg-muted/50 text-muted-foreground border-border",
  oppose: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  strongly_oppose: "bg-red-500/10 text-red-400 border-red-500/20",
};

const SENTIMENT_LABEL: Record<string, string> = {
  strongly_support: "Strongly supports",
  support: "Supports",
  neutral: "Neutral",
  oppose: "Opposes",
  strongly_oppose: "Strongly opposes",
};

function sentimentIcon(score: number) {
  if (score > 0.3) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (score < -0.3) return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function relativeTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "recently";
  }
}

interface ExtendedMessage extends DebateMessage {
  simulationTitle?: string;
}

interface VoteState {
  [messageId: number]: {
    upvotes: number;
    downvotes: number;
    netScore: number;
    userVote: number | null;
  };
}

function ThreadMessageCard({
  message,
  voteState,
  onVote,
}: {
  message: ExtendedMessage;
  voteState: VoteState[number] | undefined;
  onVote: (id: number, value: -1 | 0 | 1) => void;
}) {
  const up = voteState?.upvotes ?? message.upvotes ?? 0;
  const down = voteState?.downvotes ?? message.downvotes ?? 0;
  const score = voteState?.netScore ?? message.netScore ?? up - down;
  const userVote = voteState?.userVote ?? message.userVote ?? null;

  const scoreColor = score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-muted-foreground";

  const handleVote = (val: 1 | -1) => {
    // Toggle off if same vote
    const newVal = userVote === val ? 0 : val;
    onVote(message.id, newVal as -1 | 0 | 1);
  };

  return (
    <div className="flex gap-3 py-4">
      {/* Vote column */}
      <div className="flex flex-col items-center gap-0.5 w-8 flex-shrink-0 pt-0.5">
        <button
          onClick={() => handleVote(1)}
          className={`p-0.5 rounded transition-colors ${
            userVote === 1
              ? "text-emerald-400"
              : "text-muted-foreground hover:text-emerald-400"
          }`}
          aria-label="Upvote"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <span className={`text-xs font-bold tabular-nums ${scoreColor}`}>{score}</span>
        <button
          onClick={() => handleVote(-1)}
          className={`p-0.5 rounded transition-colors ${
            userVote === -1
              ? "text-red-400"
              : "text-muted-foreground hover:text-red-400"
          }`}
          aria-label="Downvote"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-xs font-semibold text-foreground">{message.agentName}</span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${SENTIMENT_BG[message.sentiment] ?? "border-border"}`}
          >
            {SENTIMENT_LABEL[message.sentiment] ?? message.sentiment}
          </Badge>
          {(message as any).simulationTitle && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              in {(message as any).simulationTitle}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {relativeTime(message.createdAt)}
          </span>
        </div>

        {/* Message body */}
        <p className="text-sm leading-relaxed text-foreground/90">{message.content}</p>

        {/* Stats footer */}
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronUp className="h-3 w-3 text-emerald-400" />
            {up}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronDown className="h-3 w-3 text-red-400" />
            {down}
          </span>
          {message.replyToId && (
            <span className="text-xs text-muted-foreground">reply</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchetypeThreadSection({
  thread,
  isExpanded,
  onToggle,
  voteState,
  onVote,
}: {
  thread: ArchetypeThread;
  isExpanded: boolean;
  onToggle: () => void;
  voteState: VoteState;
  onVote: (id: number, value: -1 | 0 | 1) => void;
}) {
  const avgScore = thread.avgSentiment;

  return (
    <Card className="border-border overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/20 transition-colors py-4 px-5"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {sentimentIcon(avgScore)}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight">{thread.displayName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{thread.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>{thread.messageCount}</span>
              </div>
              <div
                className={`text-xs font-medium mt-0.5 ${
                  avgScore > 0.2
                    ? "text-emerald-400"
                    : avgScore < -0.2
                    ? "text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {avgScore > 0 ? "+" : ""}{(avgScore * 100).toFixed(0)}% sentiment
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-5 pb-4 pt-0">
          <Separator className="mb-2" />
          {thread.messageCount === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No debate messages yet. Run a simulation to see this archetype participate.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {(thread.recentMessages as ExtendedMessage[]).map((msg) => (
                <ThreadMessageCard
                  key={msg.id}
                  message={msg}
                  voteState={voteState[msg.id]}
                  onVote={onVote}
                />
              ))}
              {thread.messageCount > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-3 pb-1">
                  Showing 10 of {thread.messageCount} messages
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ThreadsPage() {
  const { data: threads, isLoading, error } = useListThreads();
  const { mutate: vote } = useVoteOnMessage();
  const queryClient = useQueryClient();
  const [expandedArchetypes, setExpandedArchetypes] = useState<Set<string>>(new Set());
  const [voteState, setVoteState] = useState<VoteState>({});
  const [, navigate] = useLocation();

  const toggleArchetype = useCallback((archetype: string) => {
    setExpandedArchetypes((prev) => {
      const next = new Set(prev);
      if (next.has(archetype)) next.delete(archetype);
      else next.add(archetype);
      return next;
    });
  }, []);

  const handleVote = useCallback(
    (messageId: number, value: -1 | 0 | 1) => {
      // Optimistic update
      setVoteState((prev) => {
        const current = prev[messageId];
        if (!current) return prev;
        let upvotes = current.upvotes;
        let downvotes = current.downvotes;
        // Remove old vote contribution
        if (current.userVote === 1) upvotes--;
        if (current.userVote === -1) downvotes--;
        // Apply new vote
        if (value === 1) upvotes++;
        if (value === -1) downvotes++;
        return {
          ...prev,
          [messageId]: {
            upvotes,
            downvotes,
            netScore: upvotes - downvotes,
            userVote: value === 0 ? null : value,
          },
        };
      });

      vote(
        { id: messageId, data: { value } },
        {
          onSuccess: (result) => {
            setVoteState((prev) => ({
              ...prev,
              [messageId]: {
                upvotes: result.upvotes,
                downvotes: result.downvotes,
                netScore: result.netScore,
                userVote: result.userVote ?? null,
              },
            }));
          },
          onError: () => {
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
          },
        }
      );
    },
    [vote, queryClient]
  );

  // Initialize vote state from thread data when loaded
  const initVoteStateForThreads = useCallback((threadsData: ArchetypeThread[]) => {
    const newState: VoteState = {};
    for (const thread of threadsData) {
      for (const msg of thread.recentMessages) {
        if (!voteState[msg.id]) {
          newState[msg.id] = {
            upvotes: msg.upvotes ?? 0,
            downvotes: msg.downvotes ?? 0,
            netScore: msg.netScore ?? (msg.upvotes ?? 0) - (msg.downvotes ?? 0),
            userVote: msg.userVote ?? null,
          };
        }
      }
    }
    if (Object.keys(newState).length > 0) {
      setVoteState((prev) => ({ ...newState, ...prev }));
    }
  }, [voteState]);

  // Run init whenever threads load
  if (threads && Object.keys(voteState).length === 0 && threads.some(t => t.messageCount > 0)) {
    initVoteStateForThreads(threads);
  }

  const totalMessages = threads?.reduce((sum, t) => sum + t.messageCount, 0) ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debate Threads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI citizen archetypes debate policy proposals across all simulations.
            {totalMessages > 0 && ` ${totalMessages} total messages.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/simulations/new")}
          className="gap-2 flex-shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          New Simulation
        </Button>
      </div>

      {/* Expand all / collapse all */}
      {threads && threads.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => setExpandedArchetypes(new Set(threads.filter(t => t.messageCount > 0).map(t => t.archetype)))}
          >
            Expand all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => setExpandedArchetypes(new Set())}
          >
            Collapse all
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">Failed to load threads. Please refresh.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && totalMessages === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-sm">No debate messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Run a simulation to see citizens debate policy proposals.
            </p>
            <Button size="sm" onClick={() => navigate("/simulations/new")}>
              Create your first simulation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Thread list */}
      {threads && totalMessages > 0 && (
        <div className="space-y-2">
          {threads.map((thread) => (
            <ArchetypeThreadSection
              key={thread.archetype}
              thread={thread}
              isExpanded={expandedArchetypes.has(thread.archetype)}
              onToggle={() => toggleArchetype(thread.archetype)}
              voteState={voteState}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
