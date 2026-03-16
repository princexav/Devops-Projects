export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  insuranceProvider: string;
  insuranceId: string;
  avatarUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  type: "checkup" | "follow-up" | "consultation" | "urgent";
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  location: string;
  notes?: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  category: string;
  date: string;
  status: "normal" | "abnormal" | "critical" | "pending";
  value: string;
  unit: string;
  referenceRange: string;
  orderedBy: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "patient" | "doctor" | "nurse" | "admin";
  recipientId: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  threadId: string;
}

export interface Notification {
  id: string;
  type: "appointment" | "lab" | "message" | "billing" | "system";
  title: string;
  description: string;
  date: string;
  read: boolean;
}
