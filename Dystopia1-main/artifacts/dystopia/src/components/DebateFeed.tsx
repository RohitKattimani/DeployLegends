import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DebateMessage } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquareReply } from "lucide-react";

interface DebateFeedProps {
  messages: DebateMessage[];
  isLoading: boolean;
}

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

export function DebateFeed({ messages, isLoading }: DebateFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading && (!messages || messages.length === 0)) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center font-mono text-sm">
        Agents processing policy parameters...
        <span className="animate-pulse ml-1">_</span>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <MessageSquareReply className="w-12 h-12 mb-4 opacity-20" />
        <p>No debate messages yet.</p>
        <p className="text-sm">Run the simulation to generate agent responses.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-4 custom-scrollbar" ref={scrollRef}>
      <div className="space-y-4 py-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isSupport = msg.sentimentScore > 0.3;
            const isOppose = msg.sentimentScore < -0.3;
            const sentimentColor = isSupport ? "text-green-500 bg-green-500/10 border-green-500/20" : 
                                  isOppose ? "text-destructive bg-destructive/10 border-destructive/20" : 
                                  "text-primary bg-primary/10 border-primary/20";
            
            const badgeColor = isSupport ? "bg-green-500/20 text-green-500" :
                              isOppose ? "bg-destructive/20 text-destructive" :
                              "bg-primary/20 text-primary";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-lg border bg-card/50 backdrop-blur shadow-sm ${sentimentColor}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1 border border-border/50">
                    <AvatarFallback className="bg-background text-xs font-medium">
                      {msg.agentName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{msg.agentName}</span>
                        <Badge variant="secondary" className={`text-[10px] uppercase font-mono px-1.5 py-0 rounded ${badgeColor} border-none`}>
                          {msg.agentArchetype.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(msg.createdAt), 'HH:mm:ss')}
                      </span>
                    </div>
                    
                    {msg.replyToId && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 my-1 opacity-70">
                        <MessageSquareReply className="w-3 h-3" />
                        Replying to #{msg.replyToId}
                      </div>
                    )}
                    
                    <div className="text-sm leading-relaxed text-foreground/90 font-medium">
                      <TypewriterText text={msg.content} />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30">
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {msg.upvotes}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono opacity-80">
                        {msg.sentiment.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
