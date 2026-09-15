import assert from "node:assert/strict";
import test from "node:test";
import { normalizeShift, normalizeStaffProfile, normalizeTimeOff, shiftInputError, shiftsOverlap, timeOffInputError } from "../src/staff-management.js";

test("v5.11.85 staff profile normalizes hospitality employment fields without sensitive HR data", () => {
  const profile = normalizeStaffProfile({ jobTitle: "Housekeeping Supervisor", department: "Housekeeping", employmentType: "full_time", employmentStatus: "onboarding", preferredLanguage: "th", startDate: "2026-09-20" });
  assert.equal(profile.jobTitle, "Housekeeping Supervisor");
  assert.equal(profile.department, "Housekeeping");
  assert.equal(profile.employmentStatus, "onboarding");
  assert.equal(profile.preferredLanguage, "th");
  assert.equal(profile.startDate, "2026-09-20");
});

test("v5.11.85 shift validation blocks overlapping shifts for the same staff/date", () => {
  const a = normalizeShift({ userId: "u1", propertyId: "p1", shiftDate: "2026-09-21", startTime: "10:00", endTime: "18:00" });
  const b = normalizeShift({ userId: "u1", propertyId: "p1", shiftDate: "2026-09-21", startTime: "17:00", endTime: "22:00" });
  const c = normalizeShift({ userId: "u1", propertyId: "p1", shiftDate: "2026-09-21", startTime: "18:00", endTime: "22:00" });
  assert.equal(shiftInputError(a), "");
  assert.equal(shiftsOverlap(a, b), true);
  assert.equal(shiftsOverlap(a, c), false);
});

test("v5.11.85 time-off request validates an ordered date range", () => {
  const good = normalizeTimeOff({ fromDate: "2026-09-22", toDate: "2026-09-24", reason: "Family" });
  const bad = normalizeTimeOff({ fromDate: "2026-09-24", toDate: "2026-09-22" });
  assert.equal(timeOffInputError(good), "");
  assert.equal(timeOffInputError(bad), "time_off_dates_invalid");
});
