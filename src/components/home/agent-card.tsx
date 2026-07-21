import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/agent";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { icon: Icon, status } = agent;
  const available = status === "available";

  const card = (
    <Card
      className={cn(
        "h-full transition-all",
        available
          ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          : "border-dashed bg-muted/30"
      )}
    >
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              available
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              available
                ? "bg-emerald-50 text-emerald-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            {available ? "이용 가능" : "준비중"}
          </span>
        </div>
        <div className="space-y-1.5">
          <CardTitle
            className={cn(
              "flex items-center gap-1 text-base",
              !available && "text-muted-foreground"
            )}
          >
            {agent.name}
            {available && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {agent.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {agent.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (!available) {
    return <div className="cursor-default select-none opacity-70">{card}</div>;
  }

  return (
    <Link
      href={agent.href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}
