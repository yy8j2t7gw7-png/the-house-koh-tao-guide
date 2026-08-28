import catalog from "../public/data/diving-courses.json" with { type: "json" };

export const DIVING_COURSE_CATALOG = Object.freeze(catalog);
export const DIVING_ACTIVITY_CHOICES = Object.freeze(catalog.activities.map((item) => item.displayLabel));
export const DIVING_AGENCY_CHOICES = Object.freeze([...catalog.agencies.map((item) => item.code), "No preference"]);

const activityByCode = new Map(catalog.activities.map((item) => [item.code, item]));
const agencyByCode = new Map(catalog.agencies.map((item) => [item.code, item]));

function normalized(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsAlias(source, alias) {
  const cleanAlias = normalized(alias);
  return cleanAlias && (` ${source} `).includes(` ${cleanAlias} `);
}

export function activityLabel(code) {
  return activityByCode.get(String(code || ""))?.displayLabel || "";
}

export function activityCode(label) {
  const source = normalized(label);
  return catalog.activities.find((item) => normalized(item.displayLabel) === source)?.code || "";
}

export function matchDivingAgency(value) {
  const source = normalized(value);
  if (/\bno (?:agency )?preference\b|\bany agency\b|\bwhichever agency\b/.test(source)) return "No preference";
  const matches = catalog.agencies.filter((agency) => new RegExp(`\\b${agency.code.toLowerCase()}\\b`).test(source));
  return matches.length === 1 ? matches[0].code : "";
}

export function matchDivingActivity(value) {
  const source = normalized(value);
  if (!source) return "";
  if (/\b(?:not sure|unsure|do not know|don t know)\b/.test(source)) return "Not Sure";
  if (/\b(?:fun div(?:e|es|ing)|certified div(?:e|es|ing))\b/.test(source)) return "Fun Diving";
  if (/\b(?:try div(?:e|es|ing)|discover scuba|intro(?:ductory)? dive|first dive)\b/.test(source)) return "Try Diving";
  if (/\b(?:professional training|become (?:a )?(?:dive professional|divemaster|instructor)|divemaster|dive master|assistant instructor|instructor development|instructor training|instructor evaluation|\bidc\b|\bitc\b|\bidp\b)\b/.test(source)) return "Professional Training";
  if (/\b(?:learn|take a course|diving course|scuba course|open water|advanced|explorer 30|master rescue|rescue diver|stress and rescue|specialt(?:y|ies)|specialit(?:y|ies))\b/.test(source)) return "Learn / Take a Course";
  return "";
}

export function coursesForAgency(agency, { professional = false } = {}) {
  return (agencyByCode.get(String(agency || ""))?.courses || [])
    .filter((course) => Boolean(course.professional) === Boolean(professional));
}

export function matchDivingCourse(value, agency, { professional = false } = {}) {
  if (!agencyByCode.has(String(agency || ""))) return null;
  const source = normalized(value);
  if (!source) return null;
  const matches = coursesForAgency(agency, { professional }).filter((course) =>
    [course.displayLabel, ...(course.aliases || [])].some((alias) => containsAlias(source, alias))
  );
  if (!matches.length) return null;
  matches.sort((left, right) => normalized(right.displayLabel).length - normalized(left.displayLabel).length);
  return matches[0];
}

export function matchGeneralCourse(value, { professional = false } = {}) {
  const source = normalized(value);
  if (!source) return "";
  if (professional) {
    if (/\b(?:divemaster|dive master)\b/.test(source)) return "Divemaster";
    if (/\bassistant instructor\b/.test(source)) return "Assistant Instructor";
    if (/\binstructor\b|\bidc\b|\bitc\b|\bidp\b/.test(source)) return "Instructor training";
    return "";
  }
  if (/\bscuba diver\b/.test(source)) return "Scuba Diver";
  if (/\badvanced\b/.test(source)) return "Advanced course";
  if (/\brescue\b/.test(source)) return "Rescue course";
  if (/\bspecialt(?:y|ies)\b|\bspecialit(?:y|ies)\b/.test(source)) return "Specialty Course";
  if (/\bopen water\b|\bowd\b/.test(source)) return "Open Water Diver";
  return "";
}

export function courseForSelection(agency, courseLabel, { professional = false } = {}) {
  if (agency === "No preference") {
    const label = matchGeneralCourse(courseLabel, { professional });
    if (!label) return null;
    return {
      code: `no_preference_${normalized(label).replace(/ /g, "_")}`,
      displayLabel: label,
      professional,
      specialty: label === "Specialty Course",
      requiresCurrentCertification: !["Scuba Diver", "Open Water Diver"].includes(label)
    };
  }
  return matchDivingCourse(courseLabel, agency, { professional });
}

export function courseRequiresCertification(agency, courseLabel, { professional = false } = {}) {
  return Boolean(courseForSelection(agency, courseLabel, { professional })?.requiresCurrentCertification);
}

export function isSpecialtyCourse(agency, courseLabel, { professional = false } = {}) {
  return Boolean(courseForSelection(agency, courseLabel, { professional })?.specialty);
}

export function courseChoiceLabels(agency, { professional = false } = {}) {
  if (agency === "No preference") {
    return professional
      ? ["Divemaster", "Assistant Instructor", "Instructor training"]
      : ["Scuba Diver", "Open Water Diver", "Advanced course", "Rescue course", "Specialty Course"];
  }
  return coursesForAgency(agency, { professional }).map((course) => course.displayLabel);
}

export function matchDivingSpecialty(value) {
  const source = normalized(value);
  if (!source) return "";
  const matches = catalog.specialties.filter((specialty) =>
    [specialty.displayLabel, ...(specialty.aliases || [])].some((alias) => containsAlias(source, alias))
  );
  if (!matches.length) return "";
  matches.sort((left, right) => normalized(right.displayLabel).length - normalized(left.displayLabel).length);
  return matches[0].displayLabel;
}

export function specialtyChoiceLabels() {
  return catalog.specialties.map((specialty) => specialty.displayLabel);
}

export function validDivingGroup(group) {
  const count = Number(group?.count);
  if (!Number.isInteger(count) || count < 1 || count > 99 || !DIVING_ACTIVITY_CHOICES.includes(group?.activityType)) return false;
  if (group.activityType === "Fun Diving") return Boolean(String(group.currentCertification || "").trim());
  if (["Learn / Take a Course", "Professional Training"].includes(group.activityType)) {
    const professional = group.activityType === "Professional Training";
    if (!DIVING_AGENCY_CHOICES.includes(group.agency)) return false;
    const course = courseForSelection(group.agency, group.course, { professional });
    if (!course) return false;
    if (course.specialty && !String(group.specialty || "").trim()) return false;
    if (course.specialty
      && ["Other Specialty", "Technical / Extended Range / Other"].includes(group.specialty)
      && !String(group.specialtyDetail || "").trim()) return false;
    if (course.requiresCurrentCertification && !String(group.currentCertification || "").trim()) return false;
  }
  if (group.activityType === "Not Sure") return Boolean(String(group.goal || "").trim());
  return true;
}

export function divingGroupSummary(group) {
  const count = Number(group?.count) || 0;
  if (group?.activityType === "Fun Diving") return `${count} × Fun Diving — ${group.currentCertification} certified`;
  if (group?.activityType === "Try Diving") return `${count} × Try Diving`;
  if (["Learn / Take a Course", "Professional Training"].includes(group?.activityType)) {
    const agency = group.agency === "No preference" ? "No agency preference" : group.agency;
    const specialtyValue = group.specialtyDetail || group.specialty;
    const specialty = specialtyValue ? ` — ${specialtyValue}` : "";
    const qualification = group.currentCertification ? ` — current: ${group.currentCertification}` : "";
    return `${count} × ${agency} ${group.course}${specialty}${qualification}`;
  }
  const certification = group?.currentCertification ? ` — current: ${group.currentCertification}` : "";
  return `${count} × Not Sure — ${group?.goal || "booking team guidance requested"}${certification}`;
}

export function divingBookingSummary(request, { includeNotes = true } = {}) {
  const count = Number(request?.guestCount) || 0;
  const lines = [
    `Diving request — ${count} ${count === 1 ? "guest" : "guests"}`,
    `Preferred start / diving date: ${String(request?.preferredDate || "Not provided")}`,
    ...(Array.isArray(request?.groups) ? request.groups.map(divingGroupSummary) : [])
  ];
  if (request?.preferredProvider) lines.push(`Preferred provider: ${request.preferredProvider}`);
  if (includeNotes && request?.notes) lines.push(`Notes: ${request.notes}`);
  return lines.join("\n");
}

export function roctopusGuidance(agency = "") {
  if (agency === "PADI" || agency === "SSI") {
    return `We recommend RAID training because of its focus on dive safety and buoyancy control. Roctopus Dive offers RAID training; if you prefer ${agency}, our booking team will check an appropriate provider for you.`;
  }
  return "We recommend RAID training because of its focus on dive safety and buoyancy control, and we normally recommend Roctopus Dive for RAID training, Fun Diving, or requests with no agency preference. The booking team will confirm the suitable provider and current availability.";
}
