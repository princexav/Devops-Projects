import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import type { Appointment } from "@/types";

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const statusVariant =
    appointment.status === "completed"
      ? "success"
      : appointment.status === "cancelled"
        ? "destructive"
        : "default";

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
        <span className="text-xs font-medium">
          {new Date(appointment.date).toLocaleDateString("en-US", {
            month: "short",
          })}
        </span>
        <span className="text-lg font-bold leading-tight">
          {new Date(appointment.date).getDate()}
        </span>
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{appointment.doctorName}</p>
          <Badge variant={statusVariant} className="capitalize">
            {appointment.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {appointment.doctorSpecialty} &middot;{" "}
          <span className="capitalize">{appointment.type}</span>
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(appointment.date)} at{" "}
            {formatTime(`2026-01-01T${appointment.time}`)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {appointment.location}
          </span>
        </div>

        {appointment.notes && (
          <div className="flex items-start gap-1 pt-1 text-sm text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {appointment.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppointmentsPage() {
  const [tab, setTab] = useState("upcoming");

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: api.getAppointments,
  });

  const upcoming = appointments.filter((a) => a.status === "scheduled");
  const past = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
          <p className="text-muted-foreground">
            Manage your appointments with your care team.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="upcoming" className="gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                <Clock className="h-4 w-4" />
                Past ({past.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              <CardDescription className="pt-2">
                Your scheduled upcoming visits
              </CardDescription>
              <CardContent className="space-y-3 px-0 pt-4">
                {upcoming.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
                {upcoming.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No upcoming appointments. Book one to get started.
                  </p>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="past">
              <CardDescription className="pt-2">
                Your visit history
              </CardDescription>
              <CardContent className="space-y-3 px-0 pt-4">
                {past.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </CardContent>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
