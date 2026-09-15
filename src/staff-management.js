const EMPLOYMENT_TYPES = new Set(["full_time", "part_time", "casual", "contractor", "intern"]);
const EMPLOYMENT_STATUSES = new Set(["onboarding", "active", "offboarding", "inactive"]);
const SHIFT_STATUSES = new Set(["draft", "published", "acknowledged", "completed", "cancelled"]);
const TIME_OFF_TYPES = new Set(["time_off", "annual_leave", "sick_leave", "unavailable", "other"]);

function cleanText(value, maximum = 240) {
  return String(value || "").replace(/\u0000/g, "").trim().replace(/\s+/g, " ").slice(0, maximum);
}

export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export function validTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

export function normalizeStaffProfile(body = {}) {
  const employmentType = EMPLOYMENT_TYPES.has(body.employmentType) ? body.employmentType : "full_time";
  const employmentStatus = EMPLOYMENT_STATUSES.has(body.employmentStatus) ? body.employmentStatus : "active";
  const startDate = validDate(body.startDate) ? body.startDate : "";
  const endDate = validDate(body.endDate) ? body.endDate : "";
  return {
    employeeCode: cleanText(body.employeeCode, 60),
    jobTitle: cleanText(body.jobTitle, 120),
    department: cleanText(body.department, 100),
    homePropertyId: cleanText(body.homePropertyId, 100),
    employmentType,
    employmentStatus,
    phone: cleanText(body.phone, 80),
    preferredLanguage: cleanText(body.preferredLanguage, 24) || "en",
    startDate,
    endDate
  };
}

export function normalizeShift(body = {}) {
  const status = SHIFT_STATUSES.has(body.status) ? body.status : "draft";
  return {
    userId: cleanText(body.userId, 100),
    propertyId: cleanText(body.propertyId, 100),
    shiftDate: validDate(body.shiftDate) ? body.shiftDate : "",
    startTime: validTime(body.startTime) ? body.startTime : "",
    endTime: validTime(body.endTime) ? body.endTime : "",
    department: cleanText(body.department, 100),
    roleLabel: cleanText(body.roleLabel, 100),
    status,
    notes: cleanText(body.notes, 500)
  };
}

export function shiftInputError(shift = {}) {
  if (!shift.userId) return "staff_required";
  if (!shift.propertyId) return "property_required";
  if (!shift.shiftDate || !shift.startTime || !shift.endTime) return "shift_time_required";
  if (shift.startTime === shift.endTime) return "shift_time_invalid";
  return "";
}

export function shiftsOverlap(a = {}, b = {}) {
  if (a.userId !== b.userId || a.shiftDate !== b.shiftDate) return false;
  const toMinutes = (value) => {
    const [h, m] = String(value || "00:00").split(":").map(Number);
    return h * 60 + m;
  };
  const aStart = toMinutes(a.startTime);
  let aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  let bEnd = toMinutes(b.endTime);
  if (aEnd <= aStart) aEnd += 24 * 60;
  if (bEnd <= bStart) bEnd += 24 * 60;
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export function normalizeTimeOff(body = {}) {
  const requestType = TIME_OFF_TYPES.has(body.requestType) ? body.requestType : "time_off";
  return {
    propertyId: cleanText(body.propertyId, 100),
    fromDate: validDate(body.fromDate) ? body.fromDate : "",
    toDate: validDate(body.toDate) ? body.toDate : "",
    requestType,
    reason: cleanText(body.reason, 500)
  };
}

export function timeOffInputError(request = {}) {
  if (!request.fromDate || !request.toDate) return "time_off_dates_required";
  if (request.toDate < request.fromDate) return "time_off_dates_invalid";
  return "";
}

export function publicStaffProfile(user = {}, profile = {}) {
  return {
    userId: user.userId || profile.userId || "",
    displayName: user.displayName || "",
    email: user.email || "",
    role: user.role || "staff",
    membershipStatus: user.membershipStatus || user.status || "active",
    employeeCode: profile.employeeCode || "",
    jobTitle: profile.jobTitle || "",
    department: profile.department || "",
    homePropertyId: profile.homePropertyId || "",
    employmentType: profile.employmentType || "",
    employmentStatus: profile.employmentStatus || "not_configured",
    phone: profile.phone || "",
    preferredLanguage: profile.preferredLanguage || "",
    startDate: profile.startDate || "",
    endDate: profile.endDate || "",
    onboardingCompletedAt: profile.onboardingCompletedAt || "",
    offboardingCompletedAt: profile.offboardingCompletedAt || ""
  };
}

export function canSelfUpdateShift(action, shift, actorUserId) {
  if (!shift || shift.userId !== actorUserId) return false;
  return ["acknowledge", "clock_in", "clock_out"].includes(action);
}
