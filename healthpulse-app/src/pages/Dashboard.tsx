import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  FlaskConical,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";

export function DashboardPage() {
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", "upcoming"],
    queryFn: api.getUpcomingAppointments,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ["labResults"],
    queryFn: api.getLabResults,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["messages", "unread"],
    queryFn: api.getUnreadMessageCount,
  });

  const recentLabs = labResults.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Your health overview at a glance.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground">
              Next:{" "}
              {appointments[0]
                ? formatDate(appointments[0].date)
                : "None scheduled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Lab Results
            </CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labResults.length}</div>
            <p className="text-xs text-muted-foreground">
              {labResults.filter((l) => l.status === "abnormal").length}{" "}
              require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Unread Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              From your care team
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Your next scheduled visits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{apt.doctorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {apt.doctorSpecialty}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(apt.date)} at {formatTime(`2026-01-01T${apt.time}`)}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {apt.type}
                </Badge>
              </div>
            ))}
            {appointments.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No upcoming appointments
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Lab Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Lab Results</CardTitle>
            <CardDescription>
              Latest test results from your providers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentLabs.map((lab) => (
              <div
                key={lab.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  {lab.status === "normal" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : lab.status === "pending" ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{lab.testName}</p>
                  <p className="text-sm text-muted-foreground">
                    {lab.category} &middot; {formatDate(lab.date)}
                  </p>
                  {lab.status !== "pending" && (
                    <p className="mt-1 text-sm">
                      {lab.value} {lab.unit}{" "}
                      <span className="text-muted-foreground">
                        (ref: {lab.referenceRange})
                      </span>
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    lab.status === "normal"
                      ? "success"
                      : lab.status === "pending"
                        ? "warning"
                        : "destructive"
                  }
                  className="capitalize"
                >
                  {lab.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
