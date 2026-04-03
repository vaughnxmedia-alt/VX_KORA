import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { toast } from "sonner";
import { supabase, supabaseUrl, supabasePublishableKey } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}
const CHAT_URL = `${supabaseUrl}/functions/v1/pr-assistant-chat`;
const SUGGESTED_PROMPTS = [{
  title: "Create a Script",
  description: "True to my brand voice",
  prompt: "Create a 60-second video script for my brand that captures my authentic voice and resonates with my target audience. Ask me about my brand first."
}, {
  title: "Shot List Template",
  description: "For my next content shoot",
  prompt: "Create a comprehensive shot list template for a brand content shoot. Include B-roll ideas, hero shots, and behind-the-scenes moments that tell my brand story."
}, {
  title: "Content Calendar",
  description: "Weekly posting strategy",
  prompt: "Help me create a weekly content calendar with specific post ideas, optimal posting times, and content pillars that align with my brand positioning."
}, {
  title: "Caption Framework",
  description: "Engaging social copy",
  prompt: "Give me a caption framework I can use for Instagram and LinkedIn that drives engagement while staying true to my brand voice. Include hook formulas and CTAs."
}, {
  title: "Brand Messaging",
  description: "Refine my positioning",
  prompt: "Help me refine my brand messaging. I want to articulate my unique value proposition and differentiate myself in my industry. Ask me questions to understand my brand better."
}, {
  title: "Press Release",
  description: "Announcement template",
  prompt: "Create a press release template for announcing a major milestone or launch. Include the proper structure, quotes section, and boilerplate."
}];
export function PRAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;
    const userMessage: Message = {
      role: "user",
      content: text
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    let assistantContent = "";
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Please sign in to use K.O.R.A.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabasePublishableKey,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add funds to continue.");
        } else {
          toast.error(errorData.error || "Failed to get response");
        }
        setIsLoading(false);
        return;
      }
      if (!response.body) {
        throw new Error("No response body");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: ""
      }]);
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, {
          stream: true
        });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent
                };
                return updated;
              });
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };
  return <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? <div className="flex flex-col items-center px-4 py-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground mb-1 text-center">
              K.O.R.A
            </h2>
            <p className="text-xs text-muted-foreground mb-1 text-center">
              Knowledge Oriented Retrieval Assistant
            </p>
            <p className="text-sm text-muted-foreground max-w-md text-center mb-4">
              Your strategic AI partner for content creation, brand positioning, and posting strategy.
            </p>

            {/* Suggested Prompts Grid */}
            <div className="w-full max-w-2xl">
              <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                Get started with a template:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUGGESTED_PROMPTS.map((item, index) => <button key={index} onClick={() => handlePromptClick(item.prompt)} className="group text-left p-3 rounded-lg border border-border bg-card hover:bg-primary hover:border-primary transition-all duration-200">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 group-hover:text-white/80 transition-colors">
                      {item.description}
                    </p>
                  </button>)}
              </div>
            </div>
          </div> : <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message, index) => <div key={index} className={cn("flex gap-4", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>}
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-3", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {message.role === "assistant" ? <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{message.content || "..."}</ReactMarkdown>
                    </div> : <p className="text-sm">{message.content}</p>}
                </div>
              </div>)}
            {isLoading && messages[messages.length - 1]?.role === "user" && <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>}
            <div ref={messagesEndRef} />
          </div>}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <Input ref={inputRef} placeholder="Ask K.O.R.A about content, scripts, or strategy..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isLoading} autoComplete="off" className="flex-1 h-12 text-base rounded-xl border-muted-foreground/20" />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} size="icon" className="h-12 w-12 rounded-xl">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Powered by VaughnX Technology </p>
        </div>
      </div>
    </div>;
}