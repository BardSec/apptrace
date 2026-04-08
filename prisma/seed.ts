import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomDate(daysBack: number): Date {
  const now = Date.now();
  return new Date(now - Math.random() * daysBack * 24 * 60 * 60 * 1000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Cleaning database...");

  // Delete in reverse dependency order
  await prisma.evidenceArtifact.deleteMany();
  await prisma.privacyReview.deleteMany();
  await prisma.webAppDataCategory.deleteMany();
  await prisma.dataCollectionSignal.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.domainAlias.deleteMany();
  await prisma.webApp.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.device.deleteMany();
  await prisma.studentGradeLevel.deleteMany();
  await prisma.student.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.school.deleteMany();

  console.log("🏫 Creating schools...");

  // ─── 1. Schools ─────────────────────────────────────────────────────────

  const lincolnElementary = await prisma.school.create({
    data: {
      name: "Lincoln Elementary School",
      shortCode: "LES",
      address: "450 Oak Street, Springfield, IL 62701",
    },
  });

  const washingtonMiddle = await prisma.school.create({
    data: {
      name: "Washington Middle School",
      shortCode: "WMS",
      address: "1200 Maple Avenue, Springfield, IL 62702",
    },
  });

  const jeffersonHigh = await prisma.school.create({
    data: {
      name: "Jefferson High School",
      shortCode: "JHS",
      address: "800 Pine Boulevard, Springfield, IL 62703",
    },
  });

  const rooseveltAcademy = await prisma.school.create({
    data: {
      name: "Roosevelt Academy",
      shortCode: "RA",
      address: "350 Elm Drive, Springfield, IL 62704",
    },
  });

  const schools = [lincolnElementary, washingtonMiddle, jeffersonHigh, rooseveltAcademy];

  console.log("📚 Creating grade levels...");

  // ─── 2. Grade Levels ───────────────────────────────────────────────────

  const gradeNames = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const gradeLevels: Record<string, { id: string; name: string; sortOrder: number }> = {};

  for (let i = 0; i < gradeNames.length; i++) {
    const gl = await prisma.gradeLevel.create({
      data: { name: gradeNames[i], sortOrder: i },
    });
    gradeLevels[gradeNames[i]] = gl;
  }

  console.log("👩‍🎓 Creating students...");

  // ─── 3. Students ────────────────────────────────────────────────────────

  const firstNames = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "Lucas", "Mia", "Aiden", "Charlotte", "Jackson", "Amelia",
    "Sebastian", "Harper", "Mateo", "Evelyn", "Jack", "Luna", "Owen",
    "Camila", "Alexander", "Gianna", "Henry", "Abigail", "Jacob", "Emily",
    "Daniel", "Ella", "Michael", "Elizabeth", "Benjamin", "Sofia", "William",
    "Avery", "James", "Scarlett", "Leo", "Grace", "Elijah", "Chloe",
    "Julian", "Victoria", "Gabriel", "Riley", "Jayden", "Aria", "David",
    "Lily", "Nolan", "Zoey", "Adrian", "Penelope", "Kai", "Layla",
  ];

  const lastNames = [
    "Garcia", "Martinez", "Johnson", "Williams", "Brown", "Jones", "Miller",
    "Davis", "Rodriguez", "Hernandez", "Lopez", "Gonzalez", "Wilson",
    "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
    "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez",
    "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
    "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
    "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
    "Roberts", "Chen", "Kim", "Patel", "Singh", "Park", "Tanaka",
  ];

  interface StudentRecord {
    id: string;
    schoolId: string;
    gradeKey: string;
    districtStudentId: string;
  }

  const studentRecords: StudentRecord[] = [];
  let studentCounter = 10001;

  // Elementary: K-5 (15 students)
  const elementaryGrades = ["K", "1", "2", "3", "4", "5"];
  for (let i = 0; i < 15; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const grade = elementaryGrades[i % elementaryGrades.length];
    const dsid = `S${studentCounter++}`;
    const student = await prisma.student.create({
      data: {
        districtStudentId: dsid,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@springfield.k12.us`,
        schoolId: lincolnElementary.id,
      },
    });
    await prisma.studentGradeLevel.create({
      data: { studentId: student.id, gradeLevelId: gradeLevels[grade].id },
    });
    studentRecords.push({ id: student.id, schoolId: lincolnElementary.id, gradeKey: grade, districtStudentId: dsid });
  }

  // Middle: 6-8 (12 students)
  const middleGrades = ["6", "7", "8"];
  for (let i = 0; i < 12; i++) {
    const fn = firstNames[(i + 15) % firstNames.length];
    const ln = lastNames[(i + 15) % lastNames.length];
    const grade = middleGrades[i % middleGrades.length];
    const dsid = `S${studentCounter++}`;
    const student = await prisma.student.create({
      data: {
        districtStudentId: dsid,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@springfield.k12.us`,
        schoolId: washingtonMiddle.id,
      },
    });
    await prisma.studentGradeLevel.create({
      data: { studentId: student.id, gradeLevelId: gradeLevels[grade].id },
    });
    studentRecords.push({ id: student.id, schoolId: washingtonMiddle.id, gradeKey: grade, districtStudentId: dsid });
  }

  // High: 9-12 (15 students)
  const highGrades = ["9", "10", "11", "12"];
  for (let i = 0; i < 15; i++) {
    const fn = firstNames[(i + 27) % firstNames.length];
    const ln = lastNames[(i + 27) % lastNames.length];
    const grade = highGrades[i % highGrades.length];
    const dsid = `S${studentCounter++}`;
    const student = await prisma.student.create({
      data: {
        districtStudentId: dsid,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@springfield.k12.us`,
        schoolId: jeffersonHigh.id,
      },
    });
    await prisma.studentGradeLevel.create({
      data: { studentId: student.id, gradeLevelId: gradeLevels[grade].id },
    });
    studentRecords.push({ id: student.id, schoolId: jeffersonHigh.id, gradeKey: grade, districtStudentId: dsid });
  }

  // Roosevelt: mixed K-12 (10 students)
  const allGrades = [...gradeNames];
  for (let i = 0; i < 10; i++) {
    const fn = firstNames[(i + 42) % firstNames.length];
    const ln = lastNames[(i + 42) % lastNames.length];
    const grade = allGrades[i % allGrades.length];
    const dsid = `S${studentCounter++}`;
    const student = await prisma.student.create({
      data: {
        districtStudentId: dsid,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@springfield.k12.us`,
        schoolId: rooseveltAcademy.id,
      },
    });
    await prisma.studentGradeLevel.create({
      data: { studentId: student.id, gradeLevelId: gradeLevels[grade].id },
    });
    studentRecords.push({ id: student.id, schoolId: rooseveltAcademy.id, gradeKey: grade, districtStudentId: dsid });
  }

  // Convenience groupings
  const elementaryStudents = studentRecords.filter((s) => s.schoolId === lincolnElementary.id);
  const middleStudents = studentRecords.filter((s) => s.schoolId === washingtonMiddle.id);
  const highStudents = studentRecords.filter((s) => s.schoolId === jeffersonHigh.id);
  const rooseveltStudents = studentRecords.filter((s) => s.schoolId === rooseveltAcademy.id);

  console.log("💻 Creating devices...");

  // ─── 4. Devices ─────────────────────────────────────────────────────────

  interface DeviceRecord {
    id: string;
    schoolId: string;
    studentId: string | null;
  }

  const deviceRecords: DeviceRecord[] = [];

  // Elementary: iPads
  for (let i = 0; i < 12; i++) {
    const serial = `IPAD-LES-${String(i + 1).padStart(3, "0")}`;
    const studentId = i < elementaryStudents.length ? elementaryStudents[i].id : null;
    const device = await prisma.device.create({
      data: {
        serialNumber: serial,
        deviceType: "IPAD",
        modelName: "iPad (10th generation)",
        osVersion: "iPadOS 17.4",
        mdmManaged: true,
        studentId,
        schoolId: lincolnElementary.id,
      },
    });
    deviceRecords.push({ id: device.id, schoolId: lincolnElementary.id, studentId });
  }

  // Middle: iPads
  for (let i = 0; i < 10; i++) {
    const serial = `IPAD-WMS-${String(i + 1).padStart(3, "0")}`;
    const studentId = i < middleStudents.length ? middleStudents[i].id : null;
    const device = await prisma.device.create({
      data: {
        serialNumber: serial,
        deviceType: "IPAD",
        modelName: "iPad Air (5th generation)",
        osVersion: "iPadOS 17.4",
        mdmManaged: true,
        studentId,
        schoolId: washingtonMiddle.id,
      },
    });
    deviceRecords.push({ id: device.id, schoolId: washingtonMiddle.id, studentId });
  }

  // High: MacBooks
  for (let i = 0; i < 12; i++) {
    const serial = `MB-JHS-${String(i + 1).padStart(3, "0")}`;
    const studentId = i < highStudents.length ? highStudents[i].id : null;
    const device = await prisma.device.create({
      data: {
        serialNumber: serial,
        deviceType: "MACBOOK",
        modelName: "MacBook Air (M2, 2023)",
        osVersion: "macOS 14.4",
        mdmManaged: true,
        studentId,
        schoolId: jeffersonHigh.id,
      },
    });
    deviceRecords.push({ id: device.id, schoolId: jeffersonHigh.id, studentId });
  }

  // Roosevelt: mix of iPads and MacBooks
  for (let i = 0; i < 8; i++) {
    const isIpad = i < 5;
    const serial = isIpad
      ? `IPAD-RA-${String(i + 1).padStart(3, "0")}`
      : `MB-RA-${String(i - 4).padStart(3, "0")}`;
    const studentId = i < rooseveltStudents.length ? rooseveltStudents[i].id : null;
    const device = await prisma.device.create({
      data: {
        serialNumber: serial,
        deviceType: isIpad ? "IPAD" : "MACBOOK",
        modelName: isIpad ? "iPad (10th generation)" : "MacBook Air (M2, 2023)",
        osVersion: isIpad ? "iPadOS 17.4" : "macOS 14.4",
        mdmManaged: true,
        studentId,
        schoolId: rooseveltAcademy.id,
      },
    });
    deviceRecords.push({ id: device.id, schoolId: rooseveltAcademy.id, studentId });
  }

  // Build lookup: schoolId -> devices
  const devicesBySchool: Record<string, DeviceRecord[]> = {};
  for (const d of deviceRecords) {
    if (!devicesBySchool[d.schoolId]) devicesBySchool[d.schoolId] = [];
    devicesBySchool[d.schoolId].push(d);
  }

  console.log("🏢 Creating vendors...");

  // ─── 5. Vendors ─────────────────────────────────────────────────────────

  const vendorDefs = [
    { name: "Google LLC", website: "https://google.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "Google Workspace for Education signed DPA with district." },
    { name: "Instructure Inc", website: "https://instructure.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "Canvas LMS provider. SDPC signatory." },
    { name: "Clever Inc", website: "https://clever.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "SSO middleware. Data limited to directory sync." },
    { name: "ClassLink", website: "https://classlink.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "SSO and analytics dashboard." },
    { name: "Seesaw Learning Inc", website: "https://seesaw.me", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "K-5 focused digital portfolio platform." },
    { name: "Khan Academy", website: "https://khanacademy.org", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "501(c)(3) nonprofit. Free educational platform." },
    { name: "IXL Learning", website: "https://ixl.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "Adaptive learning platform for K-12." },
    { name: "Kahoot! ASA", website: "https://kahoot.com", headquartersCountry: "NO", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "Norwegian edtech company. Game-based learning." },
    { name: "Quizlet Inc", website: "https://quizlet.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: null, notes: "Flashcard and study tool. FERPA compliance under review." },
    { name: "Renaissance Learning (Nearpod)", website: "https://nearpod.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "Interactive lesson platform acquired by Renaissance." },
    { name: "Canva Pty Ltd", website: "https://canva.com", headquartersCountry: "AU", hasStudentPrivacyPolicy: true, coppaCompliant: null, ferpaCompliant: null, notes: "Australian design platform. Education tier available but compliance documentation incomplete." },
    { name: "ByteDance Ltd", website: "https://bytedance.com", headquartersCountry: "CN", hasStudentPrivacyPolicy: false, coppaCompliant: false, ferpaCompliant: false, notes: "Parent company of TikTok. No student data protections. Significant COPPA violations history." },
    { name: "Meta Platforms Inc", website: "https://meta.com", headquartersCountry: "US", hasStudentPrivacyPolicy: false, coppaCompliant: false, ferpaCompliant: false, notes: "Instagram parent company. Under-13 policy but no K-12 student data agreement." },
    { name: "Snap Inc", website: "https://snap.com", headquartersCountry: "US", hasStudentPrivacyPolicy: false, coppaCompliant: false, ferpaCompliant: false, notes: "Snapchat parent company. No educational agreements." },
    { name: "Discord Inc", website: "https://discord.com", headquartersCountry: "US", hasStudentPrivacyPolicy: false, coppaCompliant: false, ferpaCompliant: false, notes: "Chat platform. Minimum age 13. No K-12 agreements." },
    { name: "Padlet Inc", website: "https://padlet.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: null, ferpaCompliant: null, notes: "Collaborative board platform. Privacy review pending." },
    { name: "Cloudflare Inc", website: "https://cloudflare.com", headquartersCountry: "US", hasStudentPrivacyPolicy: false, coppaCompliant: null, ferpaCompliant: null, notes: "CDN and security infrastructure provider. Does not directly collect student data." },
    { name: "Apple Inc", website: "https://apple.com", headquartersCountry: "US", hasStudentPrivacyPolicy: true, coppaCompliant: true, ferpaCompliant: true, notes: "Device and platform vendor. Apple School Manager integration active." },
  ];

  const vendors: Record<string, { id: string }> = {};
  for (const v of vendorDefs) {
    const created = await prisma.vendor.create({ data: v });
    vendors[v.name] = created;
  }

  console.log("🌐 Creating web apps...");

  // ─── 6. WebApps ─────────────────────────────────────────────────────────

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  interface WebAppDef {
    name: string;
    primaryDomain: string;
    vendorName: string;
    category: string;
    approvalStatus: string;
    riskScore: number;
    collectsData: string;
    dataConfidence: number;
    description: string;
    totalObservations: number;
  }

  const webAppDefs: WebAppDef[] = [
    // Approved
    { name: "Google Classroom", primaryDomain: "classroom.google.com", vendorName: "Google LLC", category: "LMS", approvalStatus: "APPROVED", riskScore: 15, collectsData: "YES", dataConfidence: 0.95, description: "Learning management system for assignment distribution and grading.", totalObservations: 0 },
    { name: "Canvas LMS", primaryDomain: "canvas.instructure.com", vendorName: "Instructure Inc", category: "LMS", approvalStatus: "APPROVED", riskScore: 20, collectsData: "YES", dataConfidence: 0.92, description: "Full-featured LMS used for course management and gradebook.", totalObservations: 0 },
    { name: "Clever", primaryDomain: "clever.com", vendorName: "Clever Inc", category: "SSO_IDP", approvalStatus: "APPROVED", riskScore: 10, collectsData: "YES", dataConfidence: 0.98, description: "Single sign-on platform for K-12 application access.", totalObservations: 0 },
    { name: "ClassLink", primaryDomain: "classlink.com", vendorName: "ClassLink", category: "SSO_IDP", approvalStatus: "APPROVED", riskScore: 10, collectsData: "YES", dataConfidence: 0.95, description: "SSO and rostering solution for district-wide app access.", totalObservations: 0 },
    { name: "Khan Academy", primaryDomain: "khanacademy.org", vendorName: "Khan Academy", category: "ASSESSMENT", approvalStatus: "APPROVED", riskScore: 25, collectsData: "YES", dataConfidence: 0.90, description: "Free online courses and practice exercises.", totalObservations: 0 },
    { name: "IXL Learning", primaryDomain: "ixl.com", vendorName: "IXL Learning", category: "ASSESSMENT", approvalStatus: "APPROVED", riskScore: 20, collectsData: "YES", dataConfidence: 0.88, description: "Adaptive math and ELA practice platform.", totalObservations: 0 },
    { name: "Seesaw", primaryDomain: "seesaw.me", vendorName: "Seesaw Learning Inc", category: "LMS", approvalStatus: "APPROVED", riskScore: 25, collectsData: "YES", dataConfidence: 0.90, description: "Student-driven digital portfolio and parent communication tool.", totalObservations: 0 },
    { name: "Google Docs", primaryDomain: "docs.google.com", vendorName: "Google LLC", category: "PRODUCTIVITY", approvalStatus: "APPROVED", riskScore: 15, collectsData: "YES", dataConfidence: 0.95, description: "Collaborative document editing in Google Workspace.", totalObservations: 0 },
    { name: "Apple Schoolwork", primaryDomain: "schoolwork.apple.com", vendorName: "Apple Inc", category: "LMS", approvalStatus: "APPROVED", riskScore: 10, collectsData: "YES", dataConfidence: 0.85, description: "Apple's classroom assignment and progress tracking app.", totalObservations: 0 },

    // Pending Review
    { name: "Kahoot!", primaryDomain: "kahoot.com", vendorName: "Kahoot! ASA", category: "ASSESSMENT", approvalStatus: "PENDING_REVIEW", riskScore: 35, collectsData: "YES", dataConfidence: 0.80, description: "Game-based learning and trivia platform.", totalObservations: 0 },
    { name: "Padlet", primaryDomain: "padlet.com", vendorName: "Padlet Inc", category: "CREATIVE", approvalStatus: "PENDING_REVIEW", riskScore: 40, collectsData: "YES", dataConfidence: 0.75, description: "Collaborative digital bulletin board for sharing content.", totalObservations: 0 },
    { name: "Nearpod", primaryDomain: "nearpod.com", vendorName: "Renaissance Learning (Nearpod)", category: "ASSESSMENT", approvalStatus: "PENDING_REVIEW", riskScore: 30, collectsData: "YES", dataConfidence: 0.82, description: "Interactive slide-based lesson platform.", totalObservations: 0 },
    { name: "Quizlet", primaryDomain: "quizlet.com", vendorName: "Quizlet Inc", category: "REFERENCE", approvalStatus: "PENDING_REVIEW", riskScore: 35, collectsData: "YES", dataConfidence: 0.78, description: "Flashcard and spaced-repetition study tool.", totalObservations: 0 },
    { name: "Canva", primaryDomain: "canva.com", vendorName: "Canva Pty Ltd", category: "CREATIVE", approvalStatus: "PENDING_REVIEW", riskScore: 30, collectsData: "YES", dataConfidence: 0.72, description: "Graphic design platform with education templates.", totalObservations: 0 },
    { name: "Edpuzzle", primaryDomain: "edpuzzle.com", vendorName: "Renaissance Learning (Nearpod)", category: "VIDEO", approvalStatus: "PENDING_REVIEW", riskScore: 35, collectsData: "UNKNOWN", dataConfidence: 0.65, description: "Interactive video lesson platform for formative assessment.", totalObservations: 0 },

    // Restricted / Blocked
    { name: "TikTok", primaryDomain: "tiktok.com", vendorName: "ByteDance Ltd", category: "SOCIAL_MEDIA", approvalStatus: "BLOCKED", riskScore: 85, collectsData: "YES", dataConfidence: 0.95, description: "Short-form video social media app.", totalObservations: 0 },
    { name: "Instagram", primaryDomain: "instagram.com", vendorName: "Meta Platforms Inc", category: "SOCIAL_MEDIA", approvalStatus: "BLOCKED", riskScore: 80, collectsData: "YES", dataConfidence: 0.92, description: "Photo and video sharing social media platform.", totalObservations: 0 },
    { name: "Snapchat", primaryDomain: "snapchat.com", vendorName: "Snap Inc", category: "SOCIAL_MEDIA", approvalStatus: "RESTRICTED", riskScore: 80, collectsData: "YES", dataConfidence: 0.90, description: "Ephemeral messaging and multimedia social app.", totalObservations: 0 },
    { name: "Discord", primaryDomain: "discord.com", vendorName: "Discord Inc", category: "COMMUNICATION", approvalStatus: "RESTRICTED", riskScore: 75, collectsData: "YES", dataConfidence: 0.88, description: "Voice, video, and text chat platform.", totalObservations: 0 },

    // Unknown / Newly discovered
    { name: "Blooket", primaryDomain: "blooket.com", vendorName: "Google LLC", category: "GAMING", approvalStatus: "UNKNOWN", riskScore: 45, collectsData: "UNKNOWN", dataConfidence: 0.50, description: "Gamified quiz platform popular with students.", totalObservations: 0 },
    { name: "Gimkit", primaryDomain: "gimkit.com", vendorName: "Google LLC", category: "GAMING", approvalStatus: "UNKNOWN", riskScore: 40, collectsData: "UNKNOWN", dataConfidence: 0.45, description: "Student-created game-based learning platform.", totalObservations: 0 },
    { name: "Scratch", primaryDomain: "scratch.mit.edu", vendorName: "Google LLC", category: "CREATIVE", approvalStatus: "UNKNOWN", riskScore: 20, collectsData: "YES", dataConfidence: 0.70, description: "Block-based visual programming language by MIT.", totalObservations: 0 },
    { name: "CoolMathGames", primaryDomain: "coolmathgames.com", vendorName: "Google LLC", category: "GAMING", approvalStatus: "UNKNOWN", riskScore: 55, collectsData: "UNKNOWN", dataConfidence: 0.40, description: "Browser-based math and logic game site.", totalObservations: 0 },
    { name: "Desmos", primaryDomain: "desmos.com", vendorName: "Google LLC", category: "REFERENCE", approvalStatus: "UNKNOWN", riskScore: 25, collectsData: "UNKNOWN", dataConfidence: 0.55, description: "Online graphing calculator and math activities.", totalObservations: 0 },

    // Infrastructure
    { name: "Cloudflare CDN", primaryDomain: "cloudflare.com", vendorName: "Cloudflare Inc", category: "CDN_INFRASTRUCTURE", approvalStatus: "APPROVED", riskScore: 5, collectsData: "NO", dataConfidence: 0.90, description: "Content delivery network and DDoS protection.", totalObservations: 0 },
    { name: "Google APIs", primaryDomain: "googleapis.com", vendorName: "Google LLC", category: "CDN_INFRASTRUCTURE", approvalStatus: "APPROVED", riskScore: 5, collectsData: "NO", dataConfidence: 0.85, description: "Google API infrastructure endpoints.", totalObservations: 0 },
    { name: "Apple CDN", primaryDomain: "apple.com", vendorName: "Apple Inc", category: "CDN_INFRASTRUCTURE", approvalStatus: "APPROVED", riskScore: 5, collectsData: "NO", dataConfidence: 0.90, description: "Apple content delivery and update infrastructure.", totalObservations: 0 },
    { name: "Akamai CDN", primaryDomain: "akamai.com", vendorName: "Cloudflare Inc", category: "CDN_INFRASTRUCTURE", approvalStatus: "APPROVED", riskScore: 5, collectsData: "NO", dataConfidence: 0.85, description: "Global content delivery network infrastructure.", totalObservations: 0 },
  ];

  const webApps: Record<string, { id: string; name: string; primaryDomain: string; approvalStatus: string; category: string }> = {};

  for (const def of webAppDefs) {
    const app = await prisma.webApp.create({
      data: {
        name: def.name,
        primaryDomain: def.primaryDomain,
        vendorId: vendors[def.vendorName].id,
        description: def.description,
        category: def.category as any,
        approvalStatus: def.approvalStatus as any,
        riskScore: def.riskScore,
        collectsData: def.collectsData as any,
        dataConfidence: def.dataConfidence,
        totalObservations: def.totalObservations,
        firstSeenAt: randomDate(90),
        lastSeenAt: randomDate(7),
      },
    });
    webApps[def.name] = { id: app.id, name: def.name, primaryDomain: def.primaryDomain, approvalStatus: def.approvalStatus, category: def.category };
  }

  console.log("🔗 Creating domain aliases...");

  // ─── 7. Domain Aliases ──────────────────────────────────────────────────

  const domainAliasDefs: { appName: string; domain: string; domainType: string; isPrimary: boolean; isCanonical: boolean }[] = [
    // Google Classroom
    { appName: "Google Classroom", domain: "classroom.google.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Google Classroom", domain: "accounts.google.com", domainType: "LOGIN", isPrimary: false, isCanonical: false },
    { appName: "Google Classroom", domain: "lh3.googleusercontent.com", domainType: "CDN", isPrimary: false, isCanonical: false },
    { appName: "Google Classroom", domain: "classroom-googleapis.com", domainType: "API", isPrimary: false, isCanonical: false },

    // Canvas
    { appName: "Canvas LMS", domain: "canvas.instructure.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Canvas LMS", domain: "springfield.instructure.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Canvas LMS", domain: "instructure-uploads.s3.amazonaws.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    // Clever
    { appName: "Clever", domain: "clever.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Clever", domain: "schools.clever.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Clever", domain: "api.clever.com", domainType: "API", isPrimary: false, isCanonical: false },

    // ClassLink
    { appName: "ClassLink", domain: "classlink.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "ClassLink", domain: "launchpad.classlink.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "ClassLink", domain: "analytics.classlink.com", domainType: "API", isPrimary: false, isCanonical: false },

    // Khan Academy
    { appName: "Khan Academy", domain: "khanacademy.org", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Khan Academy", domain: "www.khanacademy.org", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Khan Academy", domain: "cdn.kastatic.org", domainType: "CDN", isPrimary: false, isCanonical: false },

    // IXL
    { appName: "IXL Learning", domain: "ixl.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "IXL Learning", domain: "www.ixl.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Seesaw
    { appName: "Seesaw", domain: "seesaw.me", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Seesaw", domain: "app.seesaw.me", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Seesaw", domain: "api.seesaw.me", domainType: "API", isPrimary: false, isCanonical: false },

    // Google Docs
    { appName: "Google Docs", domain: "docs.google.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Google Docs", domain: "drive.google.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Apple Schoolwork
    { appName: "Apple Schoolwork", domain: "schoolwork.apple.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Apple Schoolwork", domain: "school.apple.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Kahoot
    { appName: "Kahoot!", domain: "kahoot.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Kahoot!", domain: "kahoot.it", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Kahoot!", domain: "play.kahoot.it", domainType: "APP", isPrimary: false, isCanonical: false },

    // Padlet
    { appName: "Padlet", domain: "padlet.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Padlet", domain: "padlet-uploads.storage.googleapis.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    // Nearpod
    { appName: "Nearpod", domain: "nearpod.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Nearpod", domain: "app.nearpod.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Quizlet
    { appName: "Quizlet", domain: "quizlet.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Quizlet", domain: "assets.quizlet.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    // Canva
    { appName: "Canva", domain: "canva.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Canva", domain: "www.canva.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Canva", domain: "media.canva.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    // Edpuzzle
    { appName: "Edpuzzle", domain: "edpuzzle.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Edpuzzle", domain: "cdn.edpuzzle.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    // TikTok
    { appName: "TikTok", domain: "tiktok.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "TikTok", domain: "www.tiktok.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "TikTok", domain: "musical.ly", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "TikTok", domain: "tiktokcdn.com", domainType: "CDN", isPrimary: false, isCanonical: false },
    { appName: "TikTok", domain: "byteoversea.com", domainType: "TRACKING", isPrimary: false, isCanonical: false },
    { appName: "TikTok", domain: "tiktokv.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    // Instagram
    { appName: "Instagram", domain: "instagram.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Instagram", domain: "www.instagram.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Instagram", domain: "cdninstagram.com", domainType: "CDN", isPrimary: false, isCanonical: false },
    { appName: "Instagram", domain: "graph.instagram.com", domainType: "API", isPrimary: false, isCanonical: false },

    // Snapchat
    { appName: "Snapchat", domain: "snapchat.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Snapchat", domain: "web.snapchat.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Snapchat", domain: "sc-static.net", domainType: "CDN", isPrimary: false, isCanonical: false },

    // Discord
    { appName: "Discord", domain: "discord.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Discord", domain: "cdn.discordapp.com", domainType: "CDN", isPrimary: false, isCanonical: false },
    { appName: "Discord", domain: "gateway.discord.gg", domainType: "API", isPrimary: false, isCanonical: false },

    // Blooket
    { appName: "Blooket", domain: "blooket.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Blooket", domain: "www.blooket.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Gimkit
    { appName: "Gimkit", domain: "gimkit.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Gimkit", domain: "www.gimkit.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Scratch
    { appName: "Scratch", domain: "scratch.mit.edu", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Scratch", domain: "cdn.scratch.mit.edu", domainType: "CDN", isPrimary: false, isCanonical: false },

    // CoolMathGames
    { appName: "CoolMathGames", domain: "coolmathgames.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "CoolMathGames", domain: "www.coolmathgames.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Desmos
    { appName: "Desmos", domain: "desmos.com", domainType: "APP", isPrimary: true, isCanonical: true },
    { appName: "Desmos", domain: "www.desmos.com", domainType: "APP", isPrimary: false, isCanonical: false },
    { appName: "Desmos", domain: "teacher.desmos.com", domainType: "APP", isPrimary: false, isCanonical: false },

    // Infrastructure
    { appName: "Cloudflare CDN", domain: "cloudflare.com", domainType: "CDN", isPrimary: true, isCanonical: true },
    { appName: "Cloudflare CDN", domain: "cdnjs.cloudflare.com", domainType: "CDN", isPrimary: false, isCanonical: false },

    { appName: "Google APIs", domain: "googleapis.com", domainType: "API", isPrimary: true, isCanonical: true },
    { appName: "Google APIs", domain: "www.googleapis.com", domainType: "API", isPrimary: false, isCanonical: false },

    { appName: "Apple CDN", domain: "apple.com", domainType: "CDN", isPrimary: true, isCanonical: true },
    { appName: "Apple CDN", domain: "cdn.apple.com", domainType: "CDN", isPrimary: false, isCanonical: false },
    { appName: "Apple CDN", domain: "configuration.apple.com", domainType: "API", isPrimary: false, isCanonical: false },

    { appName: "Akamai CDN", domain: "akamai.com", domainType: "CDN", isPrimary: true, isCanonical: true },
    { appName: "Akamai CDN", domain: "akamaized.net", domainType: "CDN", isPrimary: false, isCanonical: false },
  ];

  // Build a lookup of domain -> appName for observations later
  const domainToApp: Record<string, string> = {};
  const appDomains: Record<string, string[]> = {};

  for (const da of domainAliasDefs) {
    await prisma.domainAlias.create({
      data: {
        domain: da.domain,
        webAppId: webApps[da.appName].id,
        isPrimary: da.isPrimary,
        isCanonical: da.isCanonical,
        domainType: da.domainType as any,
      },
    });
    domainToApp[da.domain] = da.appName;
    if (!appDomains[da.appName]) appDomains[da.appName] = [];
    appDomains[da.appName].push(da.domain);
  }

  console.log("📊 Creating observations...");

  // ─── 8. Observations ────────────────────────────────────────────────────

  // Define which apps each school tier uses and relative frequency weights
  const elementaryApps = [
    { name: "Google Classroom", weight: 20 },
    { name: "Seesaw", weight: 18 },
    { name: "Clever", weight: 15 },
    { name: "Khan Academy", weight: 12 },
    { name: "IXL Learning", weight: 12 },
    { name: "Google Docs", weight: 10 },
    { name: "Apple Schoolwork", weight: 8 },
    { name: "Kahoot!", weight: 6 },
    { name: "Scratch", weight: 5 },
    { name: "Blooket", weight: 4 },
    { name: "CoolMathGames", weight: 3 },
    { name: "Nearpod", weight: 4 },
    { name: "Cloudflare CDN", weight: 8 },
    { name: "Google APIs", weight: 8 },
    { name: "Apple CDN", weight: 6 },
  ];

  const middleApps = [
    { name: "Google Classroom", weight: 18 },
    { name: "Canvas LMS", weight: 12 },
    { name: "Clever", weight: 14 },
    { name: "ClassLink", weight: 10 },
    { name: "Khan Academy", weight: 10 },
    { name: "IXL Learning", weight: 8 },
    { name: "Google Docs", weight: 14 },
    { name: "Kahoot!", weight: 8 },
    { name: "Quizlet", weight: 6 },
    { name: "Nearpod", weight: 5 },
    { name: "Canva", weight: 5 },
    { name: "Blooket", weight: 6 },
    { name: "Gimkit", weight: 4 },
    { name: "Desmos", weight: 5 },
    { name: "Padlet", weight: 3 },
    { name: "CoolMathGames", weight: 4 },
    { name: "Edpuzzle", weight: 3 },
    { name: "Cloudflare CDN", weight: 6 },
    { name: "Google APIs", weight: 6 },
  ];

  const highApps = [
    { name: "Google Classroom", weight: 16 },
    { name: "Canvas LMS", weight: 16 },
    { name: "ClassLink", weight: 12 },
    { name: "Google Docs", weight: 18 },
    { name: "Khan Academy", weight: 8 },
    { name: "Quizlet", weight: 10 },
    { name: "Canva", weight: 8 },
    { name: "Desmos", weight: 8 },
    { name: "Kahoot!", weight: 5 },
    { name: "Edpuzzle", weight: 5 },
    { name: "Padlet", weight: 4 },
    { name: "Nearpod", weight: 3 },
    // Social media - high school students try to access these
    { name: "TikTok", weight: 6 },
    { name: "Instagram", weight: 5 },
    { name: "Snapchat", weight: 4 },
    { name: "Discord", weight: 5 },
    { name: "Cloudflare CDN", weight: 5 },
    { name: "Google APIs", weight: 5 },
    { name: "Akamai CDN", weight: 3 },
  ];

  const rooseveltApps = [
    { name: "Google Classroom", weight: 15 },
    { name: "Clever", weight: 12 },
    { name: "Google Docs", weight: 12 },
    { name: "Khan Academy", weight: 10 },
    { name: "Seesaw", weight: 6 },
    { name: "IXL Learning", weight: 8 },
    { name: "Apple Schoolwork", weight: 8 },
    { name: "Scratch", weight: 5 },
    { name: "Kahoot!", weight: 5 },
    { name: "Blooket", weight: 4 },
    { name: "Desmos", weight: 3 },
    { name: "CoolMathGames", weight: 3 },
    { name: "Cloudflare CDN", weight: 5 },
    { name: "Apple CDN", weight: 5 },
  ];

  function weightedPick(items: { name: string; weight: number }[]): string {
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * totalWeight;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item.name;
    }
    return items[items.length - 1].name;
  }

  function pickSourceType(): string {
    const r = Math.random();
    if (r < 0.60) return "DNS_LOG";
    if (r < 0.80) return "SSO_LOG";
    if (r < 0.90) return "MOCK";
    return "BROWSER_TELEMETRY";
  }

  interface ObsBatch {
    timestamp: Date;
    domain: string;
    fullUrl: string | null;
    studentId: string | null;
    deviceId: string | null;
    schoolId: string | null;
    webAppId: string | null;
    sourceType: string;
    sessionDurationSec: number | null;
  }

  const observationBatch: ObsBatch[] = [];

  function generateObservations(
    students: StudentRecord[],
    schoolId: string,
    appWeights: { name: string; weight: number }[],
    count: number
  ) {
    const schoolDevices = devicesBySchool[schoolId] || [];
    for (let i = 0; i < count; i++) {
      const student = pick(students);
      const appName = weightedPick(appWeights);
      const app = webApps[appName];
      const domains = appDomains[appName] || [app.primaryDomain];
      const domain = pick(domains);
      const device = schoolDevices.length > 0 ? pick(schoolDevices) : null;

      observationBatch.push({
        timestamp: randomDate(90),
        domain,
        fullUrl: Math.random() > 0.5 ? `https://${domain}/` : null,
        studentId: student.id,
        deviceId: device?.id ?? null,
        schoolId,
        webAppId: app.id,
        sourceType: pickSourceType(),
        sessionDurationSec: Math.random() > 0.3 ? randomInt(30, 2400) : null,
      });
    }
  }

  // Elementary: ~220, Middle: ~180, High: ~280, Roosevelt: ~120 = ~800
  generateObservations(elementaryStudents, lincolnElementary.id, elementaryApps, 220);
  generateObservations(middleStudents, washingtonMiddle.id, middleApps, 180);
  generateObservations(highStudents, jeffersonHigh.id, highApps, 280);
  generateObservations(rooseveltStudents, rooseveltAcademy.id, rooseveltApps, 120);

  // Insert in batches of 100
  for (let i = 0; i < observationBatch.length; i += 100) {
    const batch = observationBatch.slice(i, i + 100);
    await prisma.observation.createMany({
      data: batch.map((obs) => ({
        timestamp: obs.timestamp,
        domain: obs.domain,
        fullUrl: obs.fullUrl,
        studentId: obs.studentId,
        deviceId: obs.deviceId,
        schoolId: obs.schoolId,
        webAppId: obs.webAppId,
        sourceType: obs.sourceType as any,
        sessionDurationSec: obs.sessionDurationSec,
      })),
    });
  }

  // Update totalObservations counts on WebApps
  const obsCounts: Record<string, number> = {};
  for (const obs of observationBatch) {
    if (obs.webAppId) {
      obsCounts[obs.webAppId] = (obsCounts[obs.webAppId] || 0) + 1;
    }
  }
  for (const [webAppId, count] of Object.entries(obsCounts)) {
    await prisma.webApp.update({ where: { id: webAppId }, data: { totalObservations: count } });
  }

  console.log("🔍 Creating data collection signals...");

  // ─── 9. Data Collection Signals ─────────────────────────────────────────

  interface SignalDef {
    appName: string;
    signalType: string;
    confidence: number;
    evidence: string;
    sourceType: string;
  }

  const signalDefs: SignalDef[] = [
    // Google Classroom
    { appName: "Google Classroom", signalType: "login_required", confidence: 0.95, evidence: "Google OAuth login required for all users. 52 unique student logins observed over 90 days.", sourceType: "SSO_LOG" },
    { appName: "Google Classroom", signalType: "sso_observed", confidence: 0.90, evidence: "SSO authentication events detected via Clever for 47 students across 4 schools.", sourceType: "SSO_LOG" },
    { appName: "Google Classroom", signalType: "assignment_content_collected", confidence: 0.88, evidence: "Students submit assignments directly through Google Classroom. Document content stored in Google Drive.", sourceType: "BROWSER_TELEMETRY" },

    // Canvas LMS
    { appName: "Canvas LMS", signalType: "login_required", confidence: 0.95, evidence: "Canvas requires authentication via district SSO. 38 unique student sessions observed.", sourceType: "SSO_LOG" },
    { appName: "Canvas LMS", signalType: "sso_observed", confidence: 0.92, evidence: "ClassLink SSO integration detected. SAML assertions observed for 35 students.", sourceType: "SSO_LOG" },
    { appName: "Canvas LMS", signalType: "assignment_content_collected", confidence: 0.90, evidence: "Student assignment submissions including essays, files, and quiz responses stored in Canvas.", sourceType: "LMS_LAUNCH" },
    { appName: "Canvas LMS", signalType: "form_submission", confidence: 0.85, evidence: "Discussion board posts and quiz form submissions detected from 28 students.", sourceType: "BROWSER_TELEMETRY" },

    // Clever
    { appName: "Clever", signalType: "login_required", confidence: 0.98, evidence: "Clever SSO portal is the primary login method for the district. 52 students authenticated.", sourceType: "SSO_LOG" },
    { appName: "Clever", signalType: "sso_observed", confidence: 0.95, evidence: "Clever acts as identity provider. OAuth tokens issued to 14 downstream applications.", sourceType: "SSO_LOG" },

    // ClassLink
    { appName: "ClassLink", signalType: "login_required", confidence: 0.95, evidence: "ClassLink LaunchPad requires district credentials. 41 unique student logins.", sourceType: "SSO_LOG" },
    { appName: "ClassLink", signalType: "sso_observed", confidence: 0.90, evidence: "ClassLink OneRoster API syncs roster data. SAML authentication to 8 downstream apps.", sourceType: "SSO_LOG" },

    // Khan Academy
    { appName: "Khan Academy", signalType: "login_required", confidence: 0.90, evidence: "Khan Academy requires login for progress tracking. 44 students with active accounts.", sourceType: "SSO_LOG" },
    { appName: "Khan Academy", signalType: "sso_observed", confidence: 0.85, evidence: "Clever SSO integration observed. Students access via Clever portal.", sourceType: "SSO_LOG" },
    { appName: "Khan Academy", signalType: "form_submission", confidence: 0.82, evidence: "Student exercise responses and mastery data collected for 44 students.", sourceType: "BROWSER_TELEMETRY" },

    // IXL
    { appName: "IXL Learning", signalType: "login_required", confidence: 0.90, evidence: "IXL requires student login. 36 active student accounts detected.", sourceType: "SSO_LOG" },
    { appName: "IXL Learning", signalType: "sso_observed", confidence: 0.88, evidence: "Clever SSO integration active. Roster sync via Clever Secure Sync.", sourceType: "SSO_LOG" },
    { appName: "IXL Learning", signalType: "form_submission", confidence: 0.85, evidence: "Student math and ELA practice responses tracked. Detailed skill-level analytics collected.", sourceType: "BROWSER_TELEMETRY" },

    // Seesaw
    { appName: "Seesaw", signalType: "login_required", confidence: 0.92, evidence: "Seesaw uses class codes for younger students and Google SSO for older students. 28 active users.", sourceType: "SSO_LOG" },
    { appName: "Seesaw", signalType: "assignment_content_collected", confidence: 0.88, evidence: "Students upload photos, drawings, and voice recordings as portfolio entries.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Seesaw", signalType: "form_submission", confidence: 0.80, evidence: "Student work artifacts including handwriting samples and voice notes collected.", sourceType: "BROWSER_TELEMETRY" },

    // Google Docs
    { appName: "Google Docs", signalType: "login_required", confidence: 0.95, evidence: "Google Workspace login required. 52 students with active Google accounts.", sourceType: "SSO_LOG" },
    { appName: "Google Docs", signalType: "assignment_content_collected", confidence: 0.92, evidence: "Student documents stored in Google Drive. Essay content, research papers, and notes.", sourceType: "BROWSER_TELEMETRY" },

    // Apple Schoolwork
    { appName: "Apple Schoolwork", signalType: "login_required", confidence: 0.85, evidence: "Managed Apple IDs required. 25 students with Apple School Manager accounts.", sourceType: "MDM_INVENTORY" },
    { appName: "Apple Schoolwork", signalType: "assignment_content_collected", confidence: 0.80, evidence: "Assignment handouts and student progress data synced via Apple Schoolwork.", sourceType: "MDM_INVENTORY" },

    // Kahoot
    { appName: "Kahoot!", signalType: "login_required", confidence: 0.75, evidence: "Teacher accounts require login. Students can join via game PIN without accounts.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Kahoot!", signalType: "form_submission", confidence: 0.70, evidence: "Student quiz responses collected during live game sessions. Nicknames used as identifiers.", sourceType: "BROWSER_TELEMETRY" },

    // Padlet
    { appName: "Padlet", signalType: "login_required", confidence: 0.70, evidence: "Some padlets are public, others require Google SSO login. Mixed authentication observed.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Padlet", signalType: "form_submission", confidence: 0.75, evidence: "Students post text, images, and links to shared boards. 15 unique contributors detected.", sourceType: "BROWSER_TELEMETRY" },

    // Nearpod
    { appName: "Nearpod", signalType: "login_required", confidence: 0.80, evidence: "Nearpod uses join codes for students. Teacher accounts authenticated via Google SSO.", sourceType: "SSO_LOG" },
    { appName: "Nearpod", signalType: "form_submission", confidence: 0.78, evidence: "Student responses to polls, quizzes, and open-ended questions collected during lessons.", sourceType: "BROWSER_TELEMETRY" },

    // Quizlet
    { appName: "Quizlet", signalType: "login_required", confidence: 0.80, evidence: "Quizlet accounts required for saving progress. 22 students with active accounts.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Quizlet", signalType: "form_submission", confidence: 0.72, evidence: "Student study activity and quiz performance data collected.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Quizlet", signalType: "behavioral_tracking", confidence: 0.65, evidence: "Study session duration and flashcard interaction patterns tracked.", sourceType: "BROWSER_TELEMETRY" },

    // Canva
    { appName: "Canva", signalType: "login_required", confidence: 0.75, evidence: "Canva for Education requires Google SSO login. 18 active student accounts.", sourceType: "SSO_LOG" },
    { appName: "Canva", signalType: "form_submission", confidence: 0.70, evidence: "Student design projects stored in Canva cloud. Presentation and poster content collected.", sourceType: "BROWSER_TELEMETRY" },

    // TikTok
    { appName: "TikTok", signalType: "behavioral_tracking", confidence: 0.95, evidence: "Extensive behavioral tracking detected. Watch time, scroll patterns, and engagement metrics collected on every interaction.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "TikTok", signalType: "device_fingerprinting", confidence: 0.92, evidence: "Device fingerprinting scripts detected. Hardware identifiers, screen resolution, and battery status collected.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "TikTok", signalType: "login_required", confidence: 0.60, evidence: "App can be browsed without login but full features require account creation.", sourceType: "BROWSER_TELEMETRY" },

    // Instagram
    { appName: "Instagram", signalType: "behavioral_tracking", confidence: 0.92, evidence: "Feed interaction patterns, story views, and engagement metrics extensively tracked.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Instagram", signalType: "device_fingerprinting", confidence: 0.88, evidence: "Meta Pixel and device fingerprinting detected across sessions.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Instagram", signalType: "login_required", confidence: 0.85, evidence: "Instagram requires account login for most features. 12 student access attempts detected.", sourceType: "BROWSER_TELEMETRY" },

    // Snapchat
    { appName: "Snapchat", signalType: "behavioral_tracking", confidence: 0.90, evidence: "Location-based features and snap interaction patterns tracked.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Snapchat", signalType: "device_fingerprinting", confidence: 0.85, evidence: "Device identifiers collected during web access attempts.", sourceType: "BROWSER_TELEMETRY" },

    // Discord
    { appName: "Discord", signalType: "behavioral_tracking", confidence: 0.85, evidence: "Message frequency, server participation, and voice channel usage tracked.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Discord", signalType: "login_required", confidence: 0.90, evidence: "Discord requires account login. 8 students attempted access during school hours.", sourceType: "BROWSER_TELEMETRY" },

    // Scratch
    { appName: "Scratch", signalType: "login_required", confidence: 0.65, evidence: "Scratch can be used without login but saving projects requires an account.", sourceType: "BROWSER_TELEMETRY" },
    { appName: "Scratch", signalType: "form_submission", confidence: 0.60, evidence: "Student coding projects shared publicly on Scratch community.", sourceType: "BROWSER_TELEMETRY" },

    // Edpuzzle
    { appName: "Edpuzzle", signalType: "login_required", confidence: 0.72, evidence: "Students join via class codes. Teacher accounts use Google SSO.", sourceType: "SSO_LOG" },
    { appName: "Edpuzzle", signalType: "form_submission", confidence: 0.68, evidence: "Student video watch progress and embedded question responses collected.", sourceType: "BROWSER_TELEMETRY" },
  ];

  for (const sig of signalDefs) {
    await prisma.dataCollectionSignal.create({
      data: {
        webAppId: webApps[sig.appName].id,
        signalType: sig.signalType,
        confidence: sig.confidence,
        evidence: sig.evidence,
        detectedAt: randomDate(60),
        sourceType: sig.sourceType as any,
      },
    });
  }

  console.log("📋 Creating web app data categories...");

  // ─── 10. WebApp Data Categories ─────────────────────────────────────────

  interface DataCatDef {
    appName: string;
    dataCategory: string;
    confidence: number;
    evidence: string;
  }

  const dataCatDefs: DataCatDef[] = [
    // Google Classroom
    { appName: "Google Classroom", dataCategory: "NAME", confidence: 0.98, evidence: "Student full names displayed in class rosters and assignment submissions." },
    { appName: "Google Classroom", dataCategory: "EMAIL", confidence: 0.98, evidence: "Google Workspace email addresses used as primary identifiers." },
    { appName: "Google Classroom", dataCategory: "STUDENT_ID", confidence: 0.85, evidence: "District student IDs synced via Clever roster integration." },
    { appName: "Google Classroom", dataCategory: "CLASS_ENROLLMENT", confidence: 0.95, evidence: "Full class rosters including teacher assignments and period information." },
    { appName: "Google Classroom", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.92, evidence: "Student essays, documents, and submitted assignment files stored in Google Drive." },

    // Canvas LMS
    { appName: "Canvas LMS", dataCategory: "NAME", confidence: 0.95, evidence: "Student names from SIS roster sync displayed in all course contexts." },
    { appName: "Canvas LMS", dataCategory: "EMAIL", confidence: 0.95, evidence: "District email used for login and course notifications." },
    { appName: "Canvas LMS", dataCategory: "STUDENT_ID", confidence: 0.90, evidence: "SIS student IDs mapped via ClassLink OneRoster sync." },
    { appName: "Canvas LMS", dataCategory: "CLASS_ENROLLMENT", confidence: 0.95, evidence: "Complete course enrollment data including sections and terms." },
    { appName: "Canvas LMS", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.95, evidence: "All assignment submissions, quiz responses, and discussion posts stored." },
    { appName: "Canvas LMS", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.70, evidence: "Page view analytics and time-on-task data collected for teacher dashboards." },

    // Clever
    { appName: "Clever", dataCategory: "NAME", confidence: 0.98, evidence: "Student names synced from district SIS for SSO directory." },
    { appName: "Clever", dataCategory: "EMAIL", confidence: 0.98, evidence: "Student email addresses used for SSO authentication." },
    { appName: "Clever", dataCategory: "STUDENT_ID", confidence: 0.98, evidence: "District student IDs are primary identifiers in Clever Secure Sync." },
    { appName: "Clever", dataCategory: "CLASS_ENROLLMENT", confidence: 0.95, evidence: "Section and teacher assignments synced for rostering downstream apps." },

    // ClassLink
    { appName: "ClassLink", dataCategory: "NAME", confidence: 0.95, evidence: "Student names displayed in LaunchPad and synced to apps." },
    { appName: "ClassLink", dataCategory: "EMAIL", confidence: 0.95, evidence: "Email addresses used for SAML authentication." },
    { appName: "ClassLink", dataCategory: "STUDENT_ID", confidence: 0.92, evidence: "OneRoster API exposes student IDs to connected applications." },
    { appName: "ClassLink", dataCategory: "CLASS_ENROLLMENT", confidence: 0.90, evidence: "Course and section data synced via OneRoster to downstream LMS." },

    // Khan Academy
    { appName: "Khan Academy", dataCategory: "NAME", confidence: 0.90, evidence: "Student names from Clever SSO displayed on profiles." },
    { appName: "Khan Academy", dataCategory: "EMAIL", confidence: 0.88, evidence: "District email associated with Khan Academy accounts." },
    { appName: "Khan Academy", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.85, evidence: "Exercise completion, mastery progress, and time-on-task tracked per student." },

    // IXL
    { appName: "IXL Learning", dataCategory: "NAME", confidence: 0.90, evidence: "Student names synced via Clever for teacher reporting." },
    { appName: "IXL Learning", dataCategory: "EMAIL", confidence: 0.88, evidence: "Email from Clever SSO used as account identifier." },
    { appName: "IXL Learning", dataCategory: "STUDENT_ID", confidence: 0.85, evidence: "District student IDs mapped via Clever roster sync." },
    { appName: "IXL Learning", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.88, evidence: "Detailed skill practice data, time spent, and diagnostic scores tracked." },

    // Seesaw
    { appName: "Seesaw", dataCategory: "NAME", confidence: 0.90, evidence: "Student first names displayed in class journals." },
    { appName: "Seesaw", dataCategory: "CLASS_ENROLLMENT", confidence: 0.85, evidence: "Students organized into teacher-managed class groups." },
    { appName: "Seesaw", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.90, evidence: "Student drawings, photos, and voice recordings stored as portfolio items." },
    { appName: "Seesaw", dataCategory: "PHOTOS", confidence: 0.82, evidence: "Students capture and upload photos of physical work via iPad camera." },
    { appName: "Seesaw", dataCategory: "AUDIO_VIDEO", confidence: 0.80, evidence: "Voice recordings and video explanations created by students in journal entries." },
    { appName: "Seesaw", dataCategory: "PARENT_CONTACT", confidence: 0.75, evidence: "Parent email addresses collected for family engagement notifications." },

    // Google Docs
    { appName: "Google Docs", dataCategory: "NAME", confidence: 0.95, evidence: "Document ownership and edit history shows student names." },
    { appName: "Google Docs", dataCategory: "EMAIL", confidence: 0.95, evidence: "Google Workspace email used for document sharing and collaboration." },
    { appName: "Google Docs", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.95, evidence: "Full document content including essays, research papers, and notes." },

    // Apple Schoolwork
    { appName: "Apple Schoolwork", dataCategory: "NAME", confidence: 0.85, evidence: "Managed Apple IDs display student names in Schoolwork." },
    { appName: "Apple Schoolwork", dataCategory: "CLASS_ENROLLMENT", confidence: 0.82, evidence: "Class roster synced from Apple School Manager." },
    { appName: "Apple Schoolwork", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.78, evidence: "Handout completion data and app activity progress tracked." },

    // Kahoot
    { appName: "Kahoot!", dataCategory: "NAME", confidence: 0.60, evidence: "Students use nicknames but some enter real names during game sessions." },
    { appName: "Kahoot!", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.72, evidence: "Quiz response accuracy and speed tracked per participant." },

    // Padlet
    { appName: "Padlet", dataCategory: "NAME", confidence: 0.70, evidence: "Posts attributed to student names when logged in via Google SSO." },
    { appName: "Padlet", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.75, evidence: "Student-posted text, images, and links on collaborative boards." },

    // Nearpod
    { appName: "Nearpod", dataCategory: "NAME", confidence: 0.75, evidence: "Student names displayed when joining via class code with SSO." },
    { appName: "Nearpod", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.70, evidence: "Poll responses, quiz scores, and open-ended answers collected during lessons." },

    // Quizlet
    { appName: "Quizlet", dataCategory: "NAME", confidence: 0.78, evidence: "Student names on Quizlet profiles visible to class members." },
    { appName: "Quizlet", dataCategory: "EMAIL", confidence: 0.75, evidence: "Email addresses used for account creation and notifications." },
    { appName: "Quizlet", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.72, evidence: "Study session data, flashcard performance, and learning streaks tracked." },

    // Canva
    { appName: "Canva", dataCategory: "NAME", confidence: 0.72, evidence: "Student names from Google SSO displayed on Canva for Education profiles." },
    { appName: "Canva", dataCategory: "EMAIL", confidence: 0.72, evidence: "Google Workspace email used for Canva Education account." },
    { appName: "Canva", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.68, evidence: "Student design projects, presentations, and infographics stored in Canva." },

    // TikTok
    { appName: "TikTok", dataCategory: "NAME", confidence: 0.70, evidence: "User profiles may contain real names. Some students use identifiable usernames." },
    { appName: "TikTok", dataCategory: "EMAIL", confidence: 0.65, evidence: "Email required for account registration." },
    { appName: "TikTok", dataCategory: "DEVICE_IDENTIFIERS", confidence: 0.95, evidence: "IDFA, device model, OS version, and hardware identifiers collected." },
    { appName: "TikTok", dataCategory: "LOCATION", confidence: 0.90, evidence: "GPS, IP-based location, and SIM card region data collected." },
    { appName: "TikTok", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.95, evidence: "Video watch time, scroll behavior, likes, comments, and shares extensively tracked." },
    { appName: "TikTok", dataCategory: "AUDIO_VIDEO", confidence: 0.88, evidence: "User-created video content including face and voice data." },

    // Instagram
    { appName: "Instagram", dataCategory: "NAME", confidence: 0.72, evidence: "User profiles contain real names and profile photos." },
    { appName: "Instagram", dataCategory: "EMAIL", confidence: 0.70, evidence: "Email required for account creation." },
    { appName: "Instagram", dataCategory: "DEVICE_IDENTIFIERS", confidence: 0.90, evidence: "Meta SDK collects device identifiers for ad targeting." },
    { appName: "Instagram", dataCategory: "LOCATION", confidence: 0.85, evidence: "Location tags on posts and stories. IP-based location tracking." },
    { appName: "Instagram", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.92, evidence: "Feed interactions, story views, and engagement patterns tracked for algorithmic content delivery." },
    { appName: "Instagram", dataCategory: "PHOTOS", confidence: 0.90, evidence: "User-uploaded photos and stories containing personal imagery." },

    // Snapchat
    { appName: "Snapchat", dataCategory: "NAME", confidence: 0.70, evidence: "Display names and Bitmoji avatars on user profiles." },
    { appName: "Snapchat", dataCategory: "DEVICE_IDENTIFIERS", confidence: 0.88, evidence: "Device fingerprinting for ad targeting and snap map features." },
    { appName: "Snapchat", dataCategory: "LOCATION", confidence: 0.92, evidence: "Snap Map feature tracks precise GPS location of users." },
    { appName: "Snapchat", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.85, evidence: "Snap streaks, story views, and messaging frequency tracked." },
    { appName: "Snapchat", dataCategory: "PHOTOS", confidence: 0.88, evidence: "Photos and videos sent via snaps and posted to stories." },

    // Discord
    { appName: "Discord", dataCategory: "NAME", confidence: 0.65, evidence: "Usernames and display names which may contain real names." },
    { appName: "Discord", dataCategory: "EMAIL", confidence: 0.80, evidence: "Email required for account registration." },
    { appName: "Discord", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.82, evidence: "Message content, voice channel participation, and server activity logged." },
    { appName: "Discord", dataCategory: "AUDIO_VIDEO", confidence: 0.75, evidence: "Voice and video call content in Discord channels." },

    // Scratch
    { appName: "Scratch", dataCategory: "NAME", confidence: 0.55, evidence: "Usernames only. Real names not required but sometimes used." },
    { appName: "Scratch", dataCategory: "ASSIGNMENT_CONTENT", confidence: 0.65, evidence: "Student coding projects shared publicly on Scratch community." },

    // Edpuzzle
    { appName: "Edpuzzle", dataCategory: "NAME", confidence: 0.68, evidence: "Student names from class code join displayed to teachers." },
    { appName: "Edpuzzle", dataCategory: "BEHAVIORAL_ACTIVITY", confidence: 0.65, evidence: "Video watch progress and question response timing tracked." },
  ];

  for (const dc of dataCatDefs) {
    await prisma.webAppDataCategory.create({
      data: {
        webAppId: webApps[dc.appName].id,
        dataCategory: dc.dataCategory as any,
        confidence: dc.confidence,
        evidence: dc.evidence,
      },
    });
  }

  console.log("🔒 Creating privacy reviews...");

  // ─── 11. Privacy Reviews ────────────────────────────────────────────────

  interface ReviewDef {
    appName: string;
    reviewerName: string;
    status: string;
    notes: string;
    riskAssessment: string;
    recommendedAction: string;
    daysAgo: number;
  }

  const reviewDefs: ReviewDef[] = [
    // Approved apps
    {
      appName: "Google Classroom",
      reviewerName: "Sarah Chen",
      status: "APPROVED",
      notes: "Google Workspace for Education has a signed DPA with the district. FERPA and COPPA compliant. Data stored in US data centers. Annual compliance audit completed March 2026.",
      riskAssessment: "LOW - Established vendor with strong privacy commitments and signed data processing agreement.",
      recommendedAction: "Approve for district-wide use. Ensure all teachers complete Google Workspace privacy training.",
      daysAgo: 45,
    },
    {
      appName: "Canvas LMS",
      reviewerName: "Sarah Chen",
      status: "APPROVED",
      notes: "Instructure is a Student Data Privacy Consortium signatory. Canvas meets FERPA requirements. Data encrypted at rest and in transit. District DPA signed and on file.",
      riskAssessment: "LOW - Enterprise LMS with comprehensive privacy controls and district-level admin settings.",
      recommendedAction: "Approve for grades 6-12. Continue monitoring data retention policies.",
      daysAgo: 60,
    },
    {
      appName: "Clever",
      reviewerName: "Mike Rodriguez",
      status: "APPROVED",
      notes: "Clever processes only directory data (names, emails, class rosters) for SSO. No student-generated content stored. SDPC signatory. SOC 2 Type II certified.",
      riskAssessment: "LOW - Limited data scope. Acts as middleware only. Strong security certifications.",
      recommendedAction: "Approve as district SSO provider. Review connected apps quarterly.",
      daysAgo: 90,
    },
    {
      appName: "ClassLink",
      reviewerName: "Mike Rodriguez",
      status: "APPROVED",
      notes: "ClassLink LaunchPad and OneRoster sync reviewed. Data limited to authentication and rostering. Annual penetration testing conducted. DPA signed.",
      riskAssessment: "LOW - SSO-focused platform with minimal data footprint.",
      recommendedAction: "Approve for district-wide SSO. Audit connected application permissions annually.",
      daysAgo: 75,
    },
    {
      appName: "Khan Academy",
      reviewerName: "Sarah Chen",
      status: "APPROVED",
      notes: "Nonprofit organization. Free platform with strong privacy stance. Clever SSO integration limits data shared. No advertising to students.",
      riskAssessment: "LOW - Nonprofit with educational mission. Collects learning data for progress tracking only.",
      recommendedAction: "Approve for all grade levels. Recommend Clever SSO over direct account creation.",
      daysAgo: 55,
    },
    {
      appName: "IXL Learning",
      reviewerName: "Sarah Chen",
      status: "APPROVED",
      notes: "IXL has signed district DPA. Clever rostering active. Student data used only for educational purposes. Diagnostic and practice data shared with teachers via reports.",
      riskAssessment: "LOW-MEDIUM - Collects detailed performance data but well within educational use bounds.",
      recommendedAction: "Approve for K-8 math and ELA. Review data retention schedule annually.",
      daysAgo: 50,
    },
    {
      appName: "Seesaw",
      reviewerName: "Mike Rodriguez",
      status: "APPROVED",
      notes: "Seesaw for Schools reviewed. Collects student work samples including photos and voice recordings. Parent communication features reviewed. COPPA compliant. DPA signed.",
      riskAssessment: "MEDIUM-LOW - Collects multimedia content from young students. Strong parental consent mechanisms in place.",
      recommendedAction: "Approve for K-5 only. Ensure parent consent forms distributed before use. Disable public sharing.",
      daysAgo: 40,
    },
    {
      appName: "Google Docs",
      reviewerName: "Sarah Chen",
      status: "APPROVED",
      notes: "Part of Google Workspace for Education suite. Covered under existing Google DPA. Student documents stored in district-managed Google Drive.",
      riskAssessment: "LOW - Covered under existing Google Workspace agreement.",
      recommendedAction: "Approve as part of Google Workspace suite. Ensure sharing defaults are set to district-only.",
      daysAgo: 45,
    },
    {
      appName: "Apple Schoolwork",
      reviewerName: "Mike Rodriguez",
      status: "APPROVED",
      notes: "Apple Schoolwork uses Managed Apple IDs. Data processed under Apple School Manager agreement. Student progress data minimal and teacher-controlled.",
      riskAssessment: "LOW - Apple's strong privacy stance and Managed Apple ID framework limit data exposure.",
      recommendedAction: "Approve for iPad-equipped classrooms. Ensure Apple School Manager enrollment is current.",
      daysAgo: 35,
    },

    // Pending reviews
    {
      appName: "Kahoot!",
      reviewerName: "Sarah Chen",
      status: "PENDING_REVIEW",
      notes: "Kahoot for Schools tier under evaluation. Free tier allows student participation without accounts. Concerned about data collection on free tier vs. school-licensed tier. Norwegian company - GDPR compliant but FERPA status unclear.",
      riskAssessment: "MEDIUM - Game PIN model is privacy-friendly but analytics dashboard collects engagement data. Need to verify school license terms.",
      recommendedAction: "Request Kahoot for Schools DPA before approving. Teachers should use school-licensed version only.",
      daysAgo: 15,
    },
    {
      appName: "Padlet",
      reviewerName: "Mike Rodriguez",
      status: "PENDING_REVIEW",
      notes: "Teachers using Padlet for collaborative boards. Some boards are publicly accessible. Student content includes text and images. Padlet Backpack (school version) has better privacy controls. Currently teachers using free tier.",
      riskAssessment: "MEDIUM-HIGH - Public board sharing exposes student content. Need to upgrade to Padlet Backpack for admin controls.",
      recommendedAction: "Do not approve free tier. Evaluate Padlet Backpack pricing. If adopted, ensure all boards default to class-only visibility.",
      daysAgo: 10,
    },
    {
      appName: "Nearpod",
      reviewerName: "Sarah Chen",
      status: "PENDING_REVIEW",
      notes: "Nearpod acquired by Renaissance Learning. Privacy policy being updated post-acquisition. Interactive lesson data collected. Student responses to polls and open-ended questions stored.",
      riskAssessment: "MEDIUM - Post-acquisition privacy policy changes pending review. Core functionality appears compliant.",
      recommendedAction: "Await updated privacy policy from Renaissance. Tentatively approve for teacher-led lessons only.",
      daysAgo: 20,
    },
    {
      appName: "Quizlet",
      reviewerName: "Mike Rodriguez",
      status: "PENDING_REVIEW",
      notes: "Popular with high school students for exam prep. Free tier includes advertising. Quizlet Plus removes ads. Study activity data and user-created content collected. FERPA compliance documentation requested but not yet received.",
      riskAssessment: "MEDIUM - Advertising on free tier is concerning for student privacy. Study behavior tracking needs evaluation.",
      recommendedAction: "Request FERPA compliance documentation. If approved, require Quizlet Teacher tier (ad-free) for classroom use.",
      daysAgo: 8,
    },
    {
      appName: "Canva",
      reviewerName: "Sarah Chen",
      status: "PENDING_REVIEW",
      notes: "Canva for Education is free for schools. Australian company with data stored globally. Privacy policy is broad and covers consumer and education tiers together. COPPA and FERPA compliance documentation incomplete.",
      riskAssessment: "MEDIUM - Education tier exists but privacy documentation needs strengthening. Data residency concerns with Australian parent company.",
      recommendedAction: "Request specific Canva for Education DPA. Verify US data residency for student accounts before approving.",
      daysAgo: 12,
    },

    // Blocked / Restricted reviews
    {
      appName: "TikTok",
      reviewerName: "Sarah Chen",
      status: "BLOCKED",
      notes: "TikTok poses significant student privacy and security risks. Extensive data collection including device identifiers, location, and behavioral patterns. No student privacy agreement available. Chinese parent company (ByteDance) subject to data access concerns. FTC COPPA enforcement action in 2019.",
      riskAssessment: "CRITICAL - Extensive data harvesting, no educational purpose, foreign data jurisdiction, COPPA violation history.",
      recommendedAction: "Block on all district networks and managed devices. Add to content filter blocklist. Notify parents of policy.",
      daysAgo: 30,
    },
    {
      appName: "Instagram",
      reviewerName: "Mike Rodriguez",
      status: "BLOCKED",
      notes: "Instagram has no student data privacy agreement. Meta's advertising-driven business model is incompatible with student privacy requirements. Under-13 ban is self-reported only. Meta Pixel tracking detected across web properties.",
      riskAssessment: "HIGH - Advertising-driven data collection. No educational use case. Extensive behavioral tracking.",
      recommendedAction: "Block on district networks. Include in digital citizenship curriculum as example of data-harvesting platforms.",
      daysAgo: 30,
    },
    {
      appName: "Snapchat",
      reviewerName: "Sarah Chen",
      status: "RESTRICTED",
      notes: "Snapchat collects precise location data via Snap Map. No student privacy policy. Minimum age 13 but not enforced. Some teachers have expressed interest in using for school communications - denied.",
      riskAssessment: "HIGH - Location tracking, ephemeral content makes monitoring impossible, no educational agreement.",
      recommendedAction: "Restrict access. Block on elementary and middle school networks. High school filtered but not fully blocked.",
      daysAgo: 28,
    },
    {
      appName: "Discord",
      reviewerName: "Mike Rodriguez",
      status: "RESTRICTED",
      notes: "Discord used by some student clubs and gaming communities. Voice chat and screen sharing features raise monitoring concerns. Minimum age 13. No educational tier or student privacy agreement.",
      riskAssessment: "HIGH - Unmonitored communication channels. Content moderation challenges. No educational data agreement.",
      recommendedAction: "Restrict access on school networks. Allow limited use for supervised after-school clubs only with parental consent.",
      daysAgo: 25,
    },
  ];

  for (const rev of reviewDefs) {
    await prisma.privacyReview.create({
      data: {
        webAppId: webApps[rev.appName].id,
        reviewerName: rev.reviewerName,
        status: rev.status as any,
        notes: rev.notes,
        riskAssessment: rev.riskAssessment,
        recommendedAction: rev.recommendedAction,
        reviewedAt: new Date(now.getTime() - rev.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("📎 Creating evidence artifacts...");

  // ─── 12. Evidence Artifacts ─────────────────────────────────────────────

  interface ArtifactDef {
    appName: string;
    artifactType: string;
    title: string;
    description: string;
    url: string | null;
    content: string | null;
    daysAgo: number;
  }

  const artifactDefs: ArtifactDef[] = [
    // Google Classroom
    {
      appName: "Google Classroom",
      artifactType: "privacy_policy",
      title: "Google Workspace for Education Privacy Notice",
      description: "Google's privacy notice specific to education customers covering data handling for Classroom, Drive, Docs, and related services.",
      url: "https://workspace.google.com/terms/education_privacy.html",
      content: null,
      daysAgo: 45,
    },
    {
      appName: "Google Classroom",
      artifactType: "data_processing_agreement",
      title: "Google Workspace for Education DPA",
      description: "Signed data processing agreement between Springfield USD and Google LLC covering all Workspace for Education services.",
      url: null,
      content: "DPA signed on 2025-08-15 by District Technology Director. Covers Google Classroom, Google Drive, Google Docs, Gmail, and all Core Services. Data processing limited to educational purposes. Annual review scheduled for August 2026.",
      daysAgo: 45,
    },
    {
      appName: "Google Classroom",
      artifactType: "sso_scope_documentation",
      title: "Google Classroom OAuth Scopes",
      description: "Documentation of OAuth scopes requested by Google Classroom via Clever SSO integration.",
      url: null,
      content: "OAuth scopes: classroom.courses.readonly, classroom.rosters.readonly, classroom.profile.emails, classroom.profile.photos. Scopes reviewed and approved - minimum necessary for LMS functionality.",
      daysAgo: 44,
    },

    // Canvas LMS
    {
      appName: "Canvas LMS",
      artifactType: "privacy_policy",
      title: "Instructure Privacy Policy",
      description: "Instructure's privacy policy covering Canvas LMS data handling practices.",
      url: "https://www.instructure.com/privacy",
      content: null,
      daysAgo: 60,
    },
    {
      appName: "Canvas LMS",
      artifactType: "data_processing_agreement",
      title: "Canvas LMS District DPA",
      description: "Data processing agreement between Springfield USD and Instructure Inc for Canvas LMS.",
      url: null,
      content: "DPA executed on 2025-06-01. Student data limited to educational records. Data retention: active during enrollment plus 1 year after departure. Instructure is SDPC signatory. SOC 2 Type II audit report on file.",
      daysAgo: 60,
    },
    {
      appName: "Canvas LMS",
      artifactType: "data_flow_analysis",
      title: "Canvas LMS Data Flow Diagram",
      description: "Analysis of data flows between Canvas, ClassLink SSO, and district SIS.",
      url: null,
      content: "Data flow: SIS (PowerSchool) -> ClassLink OneRoster API -> Canvas. Student records synced nightly: name, email, student ID, course enrollments, section assignments. Canvas stores assignment submissions, grades, and discussion posts. Grade passback to SIS via LTI.",
      daysAgo: 58,
    },

    // Clever
    {
      appName: "Clever",
      artifactType: "privacy_policy",
      title: "Clever Privacy Policy",
      description: "Clever's privacy policy and Trust Center documentation.",
      url: "https://clever.com/privacy",
      content: null,
      daysAgo: 90,
    },
    {
      appName: "Clever",
      artifactType: "sso_scope_documentation",
      title: "Clever SSO Data Sharing Scope",
      description: "Documentation of data fields shared by Clever with connected applications.",
      url: null,
      content: "Clever Secure Sync shares: student name, email, student ID, school, grade, section enrollments, teacher assignments. NO academic records, NO behavioral data, NO health records shared. Each connected app requires individual district approval.",
      daysAgo: 88,
    },

    // Khan Academy
    {
      appName: "Khan Academy",
      artifactType: "privacy_policy",
      title: "Khan Academy Privacy Policy",
      description: "Khan Academy's children's privacy policy and educational use terms.",
      url: "https://www.khanacademy.org/about/privacy-policy",
      content: null,
      daysAgo: 55,
    },

    // IXL
    {
      appName: "IXL Learning",
      artifactType: "privacy_policy",
      title: "IXL Privacy Policy",
      description: "IXL Learning's privacy policy covering student data in K-12 settings.",
      url: "https://www.ixl.com/privacypolicy",
      content: null,
      daysAgo: 50,
    },
    {
      appName: "IXL Learning",
      artifactType: "data_processing_agreement",
      title: "IXL District License Agreement",
      description: "District license agreement with IXL including data processing terms.",
      url: null,
      content: "License agreement signed 2025-09-01 for K-8 math and ELA. Student data used solely for educational purposes. IXL will not sell student data. Data deletion available upon district request. Clever rostering authorized.",
      daysAgo: 50,
    },

    // Seesaw
    {
      appName: "Seesaw",
      artifactType: "privacy_policy",
      title: "Seesaw Privacy Policy for Schools",
      description: "Seesaw's school-specific privacy policy covering student portfolios and parent communication.",
      url: "https://web.seesaw.me/privacy-policy",
      content: null,
      daysAgo: 40,
    },
    {
      appName: "Seesaw",
      artifactType: "data_flow_analysis",
      title: "Seesaw Data Collection Analysis",
      description: "Analysis of student data collected through Seesaw digital portfolios.",
      url: null,
      content: "Seesaw collects: student first name, class code, portfolio entries (photos, drawings, voice recordings, videos). Parent contact info collected for family messaging. All content teacher-moderated before family visibility. Data stored in US (AWS). Concern: multimedia content from K-2 students includes identifiable images.",
      daysAgo: 38,
    },

    // TikTok
    {
      appName: "TikTok",
      artifactType: "privacy_policy",
      title: "TikTok Privacy Policy Analysis",
      description: "District review of TikTok's privacy policy highlighting student data concerns.",
      url: "https://www.tiktok.com/legal/privacy-policy",
      content: null,
      daysAgo: 30,
    },
    {
      appName: "TikTok",
      artifactType: "data_flow_analysis",
      title: "TikTok Data Collection Technical Analysis",
      description: "Technical analysis of TikTok's data collection practices observed on district devices.",
      url: null,
      content: "DNS analysis reveals connections to: tiktok.com, tiktokcdn.com, byteoversea.com (tracking), musical.ly (legacy), tiktokv.com (video CDN). Device fingerprinting detected: collects IDFA, device model, OS version, screen resolution, battery status, carrier info. Behavioral tracking: watch time, scroll speed, replay behavior, interaction patterns. Location data: GPS coordinates, WiFi network names, IP geolocation. Data transmitted to servers in US and Singapore with potential access from China-based engineers.",
      daysAgo: 29,
    },

    // Instagram
    {
      appName: "Instagram",
      artifactType: "privacy_policy",
      title: "Meta Privacy Policy Review",
      description: "Review of Meta's data policy as it applies to Instagram use by students.",
      url: "https://privacycenter.instagram.com/policy",
      content: null,
      daysAgo: 30,
    },
    {
      appName: "Instagram",
      artifactType: "data_flow_analysis",
      title: "Instagram Tracking Analysis",
      description: "Analysis of Meta Pixel and tracking infrastructure detected from student devices.",
      url: null,
      content: "Meta Pixel detected on 47 third-party websites visited by students. Cross-site tracking enables behavioral profiling. Instagram SDK collects: device identifiers, contact lists (if permitted), location data, browsing history. Ad targeting data used to build interest profiles on minors. No mechanism to limit data collection for K-12 users.",
      daysAgo: 29,
    },

    // Snapchat
    {
      appName: "Snapchat",
      artifactType: "data_flow_analysis",
      title: "Snapchat Location Data Assessment",
      description: "Assessment of Snap Map and location data collection features.",
      url: null,
      content: "Snap Map feature shares precise GPS location with friends by default. Ghost Mode must be manually enabled. Location data used for geofilters, advertising, and content recommendations. Students' school locations clearly identifiable on Snap Map during school hours. No educational use case identified.",
      daysAgo: 28,
    },

    // Discord
    {
      appName: "Discord",
      artifactType: "data_flow_analysis",
      title: "Discord Communication Risk Assessment",
      description: "Assessment of Discord's communication features and student safety concerns.",
      url: null,
      content: "Discord allows unmonitored text, voice, and video communication. Direct messaging between users cannot be supervised by district. Screen sharing feature could expose sensitive content. Server moderation tools exist but require active management. Bot ecosystem introduces additional data sharing risks. No FERPA or COPPA compliance documentation available.",
      daysAgo: 25,
    },

    // Canva
    {
      appName: "Canva",
      artifactType: "privacy_policy",
      title: "Canva for Education Privacy Policy",
      description: "Review of Canva's education-specific privacy terms.",
      url: "https://www.canva.com/policies/privacy-policy/",
      content: null,
      daysAgo: 12,
    },

    // Quizlet
    {
      appName: "Quizlet",
      artifactType: "privacy_policy",
      title: "Quizlet Privacy Policy",
      description: "Review of Quizlet's privacy policy for student accounts.",
      url: "https://quizlet.com/privacy",
      content: null,
      daysAgo: 8,
    },

    // Kahoot
    {
      appName: "Kahoot!",
      artifactType: "privacy_policy",
      title: "Kahoot for Schools Privacy Documentation",
      description: "Privacy documentation for Kahoot's school-licensed tier.",
      url: "https://kahoot.com/privacy-policy/",
      content: null,
      daysAgo: 15,
    },

    // ClassLink
    {
      appName: "ClassLink",
      artifactType: "privacy_policy",
      title: "ClassLink Privacy Policy",
      description: "ClassLink's privacy policy covering LaunchPad and OneRoster services.",
      url: "https://www.classlink.com/privacy",
      content: null,
      daysAgo: 75,
    },
    {
      appName: "ClassLink",
      artifactType: "sso_scope_documentation",
      title: "ClassLink SAML Assertion Scope",
      description: "Documentation of SAML attributes shared by ClassLink to connected apps.",
      url: null,
      content: "SAML assertion attributes: givenName, surname, emailAddress, studentId, schoolCode, gradeLevels, sectionEnrollments. No academic or behavioral data included in SSO assertions. Individual app data sharing governed by per-app DPAs.",
      daysAgo: 73,
    },

    // Apple Schoolwork
    {
      appName: "Apple Schoolwork",
      artifactType: "privacy_policy",
      title: "Apple Education Privacy Overview",
      description: "Apple's privacy documentation for Apple School Manager and Schoolwork.",
      url: "https://www.apple.com/privacy/",
      content: null,
      daysAgo: 35,
    },
  ];

  for (const art of artifactDefs) {
    await prisma.evidenceArtifact.create({
      data: {
        webAppId: webApps[art.appName].id,
        artifactType: art.artifactType,
        title: art.title,
        description: art.description,
        url: art.url,
        content: art.content,
        capturedAt: new Date(now.getTime() - art.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ─── Summary ────────────────────────────────────────────────────────────

  const totalStudents = studentRecords.length;
  const totalDevices = deviceRecords.length;
  const totalVendors = vendorDefs.length;
  const totalApps = webAppDefs.length;
  const totalObs = observationBatch.length;

  console.log("");
  console.log("=== Seed Complete ===");
  console.log(`  Schools:              ${schools.length}`);
  console.log(`  Grade Levels:         ${gradeNames.length}`);
  console.log(`  Students:             ${totalStudents}`);
  console.log(`  Devices:              ${totalDevices}`);
  console.log(`  Vendors:              ${totalVendors}`);
  console.log(`  Web Apps:             ${totalApps}`);
  console.log(`  Domain Aliases:       ${domainAliasDefs.length}`);
  console.log(`  Observations:         ${totalObs}`);
  console.log(`  Data Signals:         ${signalDefs.length}`);
  console.log(`  Data Categories:      ${dataCatDefs.length}`);
  console.log(`  Privacy Reviews:      ${reviewDefs.length}`);
  console.log(`  Evidence Artifacts:   ${artifactDefs.length}`);
  console.log("");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
