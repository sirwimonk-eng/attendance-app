export type Role = "ผู้บังคับบัญชา" | "เจ้าหน้าที่ธุรการ" | "ข้าราชการ";
export type Status = "มา" | "สาย" | "ขาด" | "ลา";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  rank: string;
  role: Role;
  status: Status;
  leaveReason?: string;
}

export interface PersonnelRow {
  id: number;
  username: string;
  name: string;
  rank: string;
  status: Status;
  leaveReason: string;
  isFaceRegistered: boolean;
}

export interface AttendanceLog {
  id: number;
  userId: number;
  username: string;
  name: string;
  rank: string;
  time: string;
  type: "checkin" | "checkout";
  status: Status;
  latitude: number;
  longitude: number;
  distance: number;
}

export interface DashboardResponse {
  stats: {
    totalPersonnel: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    leaveCount: number;
  };
  personnel: PersonnelRow[];
  recentLogs: AttendanceLog[];
  targetGps: {
    latitude: number;
    longitude: number;
    allowedRadiusMeters: number;
  };
}

export interface ApiOk<T> {
  success: true;
  message: string;
  [key: string]: unknown;
}

export interface ApiErr {
  success: false;
  message: string;
}
