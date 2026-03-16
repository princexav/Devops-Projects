import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Send, Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { formatDate, formatTime, getInitials } from "@/lib/utils";

export function MessagesPage() {
  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: api.getMessages,
  });

  const unreadCount = messages.filter((m) => !m.read).length;

  const threads = messages.reduce<Record<string, typeof messages>>(
    (acc, msg) => {
      const key = msg.threadId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key]!.push(msg);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
          <p className="text-muted-foreground">
            Secure messaging with your healthcare providers.
          </p>
        </div>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      {unreadCount > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">
            You have {unreadCount} unread message{unreadCount !== 1 && "s"}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
          <CardDescription>
            {Object.keys(threads).length} conversation
            {Object.keys(threads).length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(threads).map(([threadId, threadMessages], index) => {
            const latest = threadMessages[threadMessages.length - 1]!;
            const hasUnread = threadMessages.some((m) => !m.read);
            const otherParty = threadMessages.find(
              (m) => m.senderRole !== "patient",
            );

            return (
              <div key={threadId}>
                {index > 0 && <Separator className="my-1" />}
                <div className="cursor-pointer rounded-lg p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5 h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(
                          otherParty?.senderName ?? latest.senderName,
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {otherParty?.senderName ?? latest.senderName}
                          </p>
                          {hasUnread && (
                            <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(latest.date)}{" "}
                          {formatTime(latest.date)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{latest.subject}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {latest.body}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {otherParty?.senderRole ?? latest.senderRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {threadMessages.length} message
                          {threadMessages.length !== 1 && "s"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
