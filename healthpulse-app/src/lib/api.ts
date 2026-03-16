import type {
  User,
  Appointment,
  LabResult,
  Message,
} from "@/types";
import {
  currentUser,
  appointments,
  labResults,
  messages,
} from "./mock-data";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getUser: async (): Promise<User> => {
    await delay(300);
    return currentUser;
  },

  getAppointments: async (): Promise<Appointment[]> => {
    await delay(400);
    return appointments;
  },

  getUpcomingAppointments: async (): Promise<Appointment[]> => {
    await delay(300);
    return appointments.filter((a) => a.status === "scheduled");
  },

  getLabResults: async (): Promise<LabResult[]> => {
    await delay(400);
    return labResults;
  },

  getMessages: async (): Promise<Message[]> => {
    await delay(350);
    return messages;
  },

  getUnreadMessageCount: async (): Promise<number> => {
    await delay(200);
    return messages.filter((m) => !m.read).length;
  },

  healthCheck: async (): Promise<{ status: string; version: string }> => {
    return {
      status: "healthy",
      version: import.meta.env.VITE_APP_VERSION || "1.0.0",
    };
  },
};
