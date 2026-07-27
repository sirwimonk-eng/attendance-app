import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// -------------------------------------------------------------------
// GPS TARGET CONFIGURATION
// -------------------------------------------------------------------
const TARGET_LAT = 3.9022054;
const TARGET_LNG = 100.6110066;
const MAX_RADIUS_METERS = 100;

// Helper to calculate exact Haversine geofenced distance
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// -------------------------------------------------------------------
// DATABASE LOAD / SAVE (JSON-based durable local file storage)
// -------------------------------------------------------------------
interface User {
  id: number;
  username: string;
  password?: string;
  name: string;
  rank: string;
  role: "ผู้บังคับบัญชา" | "เจ้าหน้าที่ธุรการ" | "ข้าราชการ";
  status: "มา" | "สาย" | "ขาด" | "ลา";
  leaveReason?: string;
}

interface Attendance {
  id: number;
  userId: number;
  username: string;
  name: string;
  rank: string;
  time: string;
  type: "checkin" | "checkout";
  status: "มา" | "สาย" | "ขาด" | "ลา";
  latitude: number;
  longitude: number;
  distance: number;
}

interface FaceData {
  userId: number;
  descriptor: number[];
}

interface DatabaseSchema {
  users: User[];
  attendance: Attendance[];
  face_data: FaceData[];
}

const DEFAULT_USERS: User[] = [
  {
    id: 1,
    username: "commander",
    password: "password123",
    name: "สมเจตน์ เก่งกาจ",
    rank: "พันโท (พ.ท.)",
    role: "ผู้บังคับบัญชา",
    status: "มา"
  },
  {
    id: 2,
    username: "admin",
    password: "password123",
    name: "สมพงษ์ ทำงานดี",
    rank: "จ่าสิบเอก (จ.ส.อ.)",
    role: "เจ้าหน้าที่ธุรการ",
    status: "มา"
  },
  {
    id: 3,
    username: "officer1",
    password: "password123",
    name: "รักชาติ ยิ่งชีพ",
    rank: "สิบเอก (ส.อ.)",
    role: "ข้าราชการ",
    status: "มา"
  },
  {
    id: 4,
    username: "officer2",
    password: "password123",
    name: "มานะ ขยันยิ่ง",
    rank: "พลทหาร (พท.)",
    role: "ข้าราชการ",
    status: "ขาด"
  },
  {
    id: 5,
    username: "officer3",
    password: "password123",
    name: "สมบัติ รักดี",
    rank: "พลทหาร (พท.)",
    role: "ข้าราชการ",
    status: "ลา",
    leaveReason: "ลากิจเสร็จธุระที่บ้าน"
  },
  {
    id: 6,
    username: "officer4",
    password: "password123",
    name: "วิชัย นุ่มประเทือง",
    rank: "สิบตรี (ส.ต.)",
    role: "ข้าราชการ",
    status: "สาย"
  }
];

const DEFAULT_ATTENDANCES: Attendance[] = [
  {
    id: 1,
    userId: 3,
    username: "officer1",
    name: "รักชาติ ยิ่งชีพ",
    rank: "สิบเอก (ส.อ.)",
    time: "08:12:15",
    type: "checkin",
    status: "มา",
    latitude: 3.9022100,
    longitude: 100.6110100,
    distance: 1.5
  },
  {
    id: 2,
    userId: 6,
    username: "officer4",
    name: "วิชัย นุ่มประเทือง",
    rank: "สิบตรี (ส.ต.)",
    time: "08:42:01",
    type: "checkin",
    status: "สาย",
    latitude: 3.9023100,
    longitude: 100.6111000,
    distance: 15.6
  }
];

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error loading JSON database, resetting files:", err);
  }
  const defaultDb: DatabaseSchema = {
    users: [...DEFAULT_USERS],
    attendance: [...DEFAULT_ATTENDANCES],
    face_data: []
  };
  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving JSON database:", err);
  }
}

// Global DB instance
const db = loadDatabase();

// -------------------------------------------------------------------
// BACKEND MIDDLEWARE
// -------------------------------------------------------------------
app.use(express.json());

// -------------------------------------------------------------------
// API ENDPOINTS (Thai responsive API feedback)
// -------------------------------------------------------------------

// 1. JWT / Password Login API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }

  const user = db.users.find((u) => u.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  // Create a fast mock base64 token
  const payload = { id: user.id, username: user.username, role: user.role };
  const mockToken = Buffer.from(JSON.stringify(payload)).toString("base64") + ".MOCK_JWT_SIGNATURE";

  return res.json({
    success: true,
    message: "เข้าสู่ระบบสำเร็จ",
    token: mockToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      rank: user.rank,
      role: user.role,
      status: user.status,
      leaveReason: user.leaveReason
    }
  });
});

// 2. Fetch Dashboard Statistics
app.get("/api/dashboard", (req, res) => {
  // Recalculating dynamically from stored db states
  const total = db.users.filter(u => u.role === "ข้าราชการ").length;
  const present = db.users.filter(u => u.role === "ข้าราชการ" && u.status === "มา").length;
  const late = db.users.filter(u => u.role === "ข้าราชการ" && u.status === "สาย").length;
  const absent = db.users.filter(u => u.role === "ข้าราชการ" && u.status === "ขาด").length;
  const leave = db.users.filter(u => u.role === "ข้าราชการ" && u.status === "ลา").length;

  res.json({
    stats: {
      totalPersonnel: total,
      presentCount: present,
      lateCount: late,
      absentCount: absent,
      leaveCount: leave
    },
    personnel: db.users.filter(u => u.role === "ข้าราชการ").map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      rank: u.rank,
      status: u.status,
      leaveReason: u.leaveReason || "",
      isFaceRegistered: db.face_data.some(f => f.userId === u.id)
    })),
    recentLogs: db.attendance.slice(-15).reverse(), // Last 15 events sorted descending
    targetGps: {
      latitude: TARGET_LAT,
      longitude: TARGET_LNG,
      allowedRadiusMeters: MAX_RADIUS_METERS
    }
  });
});

// 3. Registered Geofenced Check-in (GPS & Biometric Verification)
app.post("/api/checkin", (req, res) => {
  const { userId, latitude, longitude, faceDescriptor } = req.body;

  if (!userId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: "ข้อมูลพิกัดหรือข้อมูลกำลังพลไม่ครบถ้วน" });
  }

  const user = db.users.find(u => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ success: false, message: "ไม่พบข้อมูลกำลังพลในระบบ" });
  }

  // A. GPS Distance calculations
  const distance = getDistanceInMeters(latitude, longitude, TARGET_LAT, TARGET_LNG);
  if (distance > MAX_RADIUS_METERS) {
    return res.status(403).json({
      success: false,
      message: `คุณอยู่นอกพื้นที่ที่กำหนด ไม่สามารถเช็คชื่อได้ (ปัจจุบันห่างจากจุดรวมพล ${Math.round(distance)} เมตร, รัศมีเปิดรับลงเวลาคือไม่เกิน 100 เมตร)`
    });
  }

  // B. Biometric Face Validation
  const userFace = db.face_data.find(f => f.userId === user.id);
  if (!userFace) {
    return res.status(400).json({
      success: false,
      message: "ไม่สามารถสแกนนิ้วมือหรือสแกนใบหน้าได้ เนื่องจากคุณยังไม่ได้ลงทะเบียนใบในระบบ กรุณาลงทะเบียนใบหน้าก่อนลงเวลา!"
    });
  }

  // In standard practice we check similarity of floats. We simulate a high-quality math model.
  if (faceDescriptor && Array.isArray(faceDescriptor)) {
    // Basic verification - check if the Euclidean distance between signature matches is within limit
    let sumDiff = 0;
    const targetDescriptor = userFace.descriptor;
    const len = Math.min(targetDescriptor.length, faceDescriptor.length);
    for (let i = 0; i < len; i++) {
      sumDiff += Math.pow(targetDescriptor[i] - faceDescriptor[i], 2);
    }
    const faceDistance = Math.sqrt(sumDiff);
    // If distance is too high, facial verification fails (face mismatch simulator)
    if (faceDistance > 0.6) {
      return res.status(401).json({
        success: false,
        message: "ระบบตรวจจับไม่ผ่าน: ข้อมูลสแกนใบหน้าไม่ตรงกับฐานข้อมูลยืนยันตัวตนคนเดิม"
      });
    }
  }

  // C. Calculate Attendance Status dynamically based on Thai local standard time
  // Work-hour limit check. Let's parse current local Thai hour:
  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", { hour12: false });
  const hour = now.getHours();
  const minute = now.getMinutes();

  let attendanceStatus: "มา" | "สาย" = "มา";
  // Suppose military lineup shifts past 08:30 AM are "สาย" (Late)
  if (hour > 8 || (hour === 8 && minute > 30)) {
    attendanceStatus = "สาย";
  }

  // Update user state status in DB
  user.status = attendanceStatus;

  // Append logs
  const newLog: Attendance = {
    id: db.attendance.length ? Math.max(...db.attendance.map(a => a.id)) + 1 : 1,
    userId: user.id,
    username: user.username,
    name: user.name,
    rank: user.rank,
    time: timeStr,
    type: "checkin",
    status: attendanceStatus,
    latitude,
    longitude,
    distance: Math.round(distance * 10) / 10
  };

  db.attendance.push(newLog);
  saveDatabase(db);

  return res.json({
    success: true,
    message: `ลงชื่อเข้ารวมแถวเรียบร้อยแล้ว: ยืนยันตัวตนสำเร็จ (${attendanceStatus === "สาย" ? "มาสายเกินกำหนด 08:30 น." : "ทันเวลาเข้าแถวปกติ"})`,
    log: newLog
  });
});

// 4. GPS Geofenced Check-out API
app.post("/api/checkout", (req, res) => {
  const { userId, latitude, longitude, faceDescriptor } = req.body;

  if (!userId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: "ข้อมูลพิกัดไม่ครบถ้วน" });
  }

  const user = db.users.find(u => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ success: false, message: "ไม่พบข้อมูลข้าราชการคนนี้" });
  }

  // Compare Distance
  const distance = getDistanceInMeters(latitude, longitude, TARGET_LAT, TARGET_LNG);
  if (distance > MAX_RADIUS_METERS) {
    return res.status(403).json({
      success: false,
      message: `คุณอยู่นอกพื้นที่ที่กำหนด ไม่สามารถลงชื่อออกได้ (ห่างจากจุดรวมพล ${Math.round(distance)} เมตร)`
    });
  }

  // Face checking
  const userFace = db.face_data.find(f => f.userId === user.id);
  if (!userFace) {
    return res.status(400).json({
      success: false,
      message: "ไม่พบข้อมูลลงทะเบียนใบหน้า กรุณาลงทะเบียนใบหน้าเพื่อทำการบันทึกขากลับ!"
    });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("th-TH", { hour12: false });

  const newLog: Attendance = {
    id: db.attendance.length ? Math.max(...db.attendance.map(a => a.id)) + 1 : 1,
    userId: user.id,
    username: user.username,
    name: user.name,
    rank: user.rank,
    time: timeStr,
    type: "checkout",
    status: user.status, // Preserve their check-in status (มา / สาย)
    latitude,
    longitude,
    distance: Math.round(distance * 10) / 10
  };

  db.attendance.push(newLog);
  saveDatabase(db);

  return res.json({
    success: true,
    message: "บันทึกเวลาเลิกปฏิบัติงาน/เลิกแถวขากลับเรียบร้อยแล้ว ยินดีต้อนรับกลับบ้าน!",
    log: newLog
  });
});

// 5. Submit Face Biometrics Registration API
app.post("/api/face/register", (req, res) => {
  const { userId, descriptor } = req.body;
  if (!userId || !descriptor || !Array.isArray(descriptor)) {
    return res.status(400).json({ success: false, message: "ข้อมูลโครงหน้าไม่สมบูรณ์สำหรับการลงทะเบียน" });
  }

  const user = db.users.find(u => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ success: false, message: "ไม่พบข้าราชการเป้าหมายที่จะจับคู่ใบหน้า" });
  }

  // Remove existing if any, and add new
  db.face_data = db.face_data.filter(f => f.userId !== user.id);
  db.face_data.push({
    userId: user.id,
    descriptor
  });

  saveDatabase(db);

  return res.json({
    success: true,
    message: `ลงทะเบียนจำลองและสแกนใบหน้าของ ${user.rank} ${user.name} ในศูนย์สารสนเทศเรียบร้อยแล้ว!`
  });
});

// 6. Admin Personnel addition API
app.post("/api/personnel", (req, res) => {
  const { username, password, name, rank, role } = req.body;
  if (!username || !password || !name || !rank || !role) {
    return res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลส่วนบุคคลให้ครบถ้วน" });
  }

  const exists = db.users.some(u => u.username === username);
  if (exists) {
    return res.status(400).json({ success: false, message: "ชื่อบัญชีผู้ใช้นี้ซ้ำอยู่ในระบบแล้ว" });
  }

  const newUser: User = {
    id: db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    username,
    password,
    name,
    rank,
    role,
    status: "ขาด" // Default to Absent on registry prior enrollment check-in
  };

  db.users.push(newUser);
  saveDatabase(db);

  return res.json({
    success: true,
    message: `บันทึกข้อมูลกำลังพลคนใหม่ (${rank} ${name}) เรียบร้อยแล้ว`,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      rank: newUser.rank,
      role: newUser.role,
      status: newUser.status
    }
  });
});

// 7. Delete Personnel database record
app.delete("/api/personnel/:id", (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === 1 || targetId === 2) {
    return res.status(403).json({ success: false, message: "ไม่สามารถลบบัญชีกองบัญชาการหรือแอดมินเริ่มต้นของระบบได้" });
  }

  const index = db.users.findIndex(u => u.id === targetId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "ไม่พบกำลังพลที่คุณระบุต้องการลบ" });
  }

  const deletedUser = db.users[index];
  db.users.splice(index, 1);
  db.face_data = db.face_data.filter(f => f.userId !== targetId);
  db.attendance = db.attendance.filter(a => a.userId !== targetId);

  saveDatabase(db);

  return res.json({
    success: true,
    message: `ลบข้อมูล ${deletedUser.rank} ${deletedUser.name} สิ้นสุดการจำกัดสิทธิ์เรียบร้อย`
  });
});

// 8. Admin Override Daily Personnel Status (e.g. Set to Leave, Sick, Absent, Present)
app.post("/api/personnel/status", (req, res) => {
  const { userId, status, leaveReason } = req.body;
  if (!userId || !status) {
    return res.status(400).json({ success: false, message: "ไม่พบบัญชีผู้ใช้หรือสถานะที่จะแก้ไข" });
  }

  const user = db.users.find(u => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ success: false, message: "ไม่พบข้อมูลกำลังพลในระบบ" });
  }

  user.status = status;
  if (status === "ลา") {
    user.leaveReason = leaveReason || "ลากิจราชการ/ลาป่วยได้รับการอนุมัติ";
  } else {
    delete user.leaveReason;
  }

  saveDatabase(db);

  return res.json({
    success: true,
    message: `อัปเดตสถานะของ ${user.rank} ${user.name} เป็น [${status}] เรียบร้อยแล้ว`
  });
});


// -------------------------------------------------------------------
// VITE CLIENT BUILD / DEVELOPMENT ROUTING
// -------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Thai Military Line-up Attendance backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
