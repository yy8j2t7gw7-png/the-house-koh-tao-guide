/**
 * The House – Koh Tao: Airbnb reservation synchronizer
 *
 * Install this as a standalone Google Apps Script under the same Google account
 * that receives Airbnb host emails and owns the existing Airbnb iCal feeds.
 * Script Properties required:
 *   HOUSE_WORKER_ORIGIN
 *   RESERVATION_SYNC_TOKEN
 *   AIRBNB_ICAL_ROOM_1 ... AIRBNB_ICAL_ROOM_6
 *   AIRBNB_ICAL_ROOM_8 ... AIRBNB_ICAL_ROOM_11
 *
 * Never commit Script Property values to Git.
 */

var HOUSE_AIRBNB_LISTINGS = {
  "1": "1376393324098439141",
  "2": "1349840459014476583",
  "3": "1384302186705645424",
  "4": "1375985816338609953",
  "5": "1504732379219115485",
  "6": "1504212652507496103",
  "8": "1376397702280299752",
  "9": "1357684595355823468",
  "10": "1617732490715138330",
  "11": "1384311481900170410"
};

var HOUSE_SYNC_SETTINGS = {
  timeZone: "Asia/Bangkok",
  fullGmailLookbackDays: 400,
  recentGmailLookbackDays: 2,
  recentMessageOverlapMinutes: 20,
  routineCalendarHours: 1,
  fullAuditHours: 24,
  futureDays: 400,
  calendarPastDays: 14,
  maximumFullThreads: 500,
  maximumRecentThreads: 100,
  codePattern: /\bHM[A-Z0-9]{6,18}\b/gi,
  datePattern: /^\d{4}-\d{2}-\d{2}$/
};

function syncHouseReservations() {
  syncHouseReservationsInternal_(false);
}

function runFullHouseReservationAudit() {
  syncHouseReservationsInternal_(true);
}

function syncHouseReservationsInternal_(forceFullAudit) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var properties = PropertiesService.getScriptProperties();
    var origin = cleanOrigin_(properties.getProperty("HOUSE_WORKER_ORIGIN"));
    var syncToken = String(properties.getProperty("RESERVATION_SYNC_TOKEN") || "").trim();
    if (!origin || !syncToken) {
      throw new Error("HOUSE_WORKER_ORIGIN and RESERVATION_SYNC_TOKEN are required Script Properties.");
    }

    var now = new Date();
    var lastSyncAt = validDate_(properties.getProperty("HOUSE_AIRBNB_LAST_SYNC_AT"));
    var lastCalendarSyncAt = validDate_(properties.getProperty("HOUSE_AIRBNB_LAST_CALENDAR_AT"))
      || validDate_(properties.getProperty("HOUSE_AIRBNB_LAST_CALENDAR_SYNC_AT"));
    var lastAuditAt = validDate_(properties.getProperty("HOUSE_AIRBNB_LAST_AUDIT_AT"));
    var fullAuditDue = forceFullAudit === true
      || !lastAuditAt
      || now.getTime() - lastAuditAt.getTime() >= HOUSE_SYNC_SETTINGS.fullAuditHours * 3600000;
    var emailReservations = readAirbnbReservationEmails_({
      fullAudit: fullAuditDue,
      since: lastSyncAt
    });
    var emailCodes = Object.keys(emailReservations);

    // Fast path for last-minute bookings: if the Airbnb email contains a
    // confirmation code, listing and dates, write that reservation to the
    // Worker immediately. This does not wait for Airbnb iCal propagation.
    // complete=false guarantees an email-only partial update can never cancel
    // an existing reservation.
    if (emailCodes.length) {
      var fastPathPosted = postEmailReservations_(origin, syncToken, emailReservations);
      if (fastPathPosted > 0) properties.setProperty("HOUSE_AIRBNB_LAST_FAST_PATH_AT", now.toISOString());
    }

    // Safety net: reconcile all ten iCal feeds at least hourly even when the
    // Gmail detector sees nothing. A detected Airbnb message also forces an
    // immediate calendar reconciliation, while the daily full audit is the
    // only path allowed to mark a feed complete for absence-based cancellation.
    var calendarReconcileDue = fullAuditDue
      || emailCodes.length > 0
      || !lastCalendarSyncAt
      || now.getTime() - lastCalendarSyncAt.getTime() >= HOUSE_SYNC_SETTINGS.routineCalendarHours * 3600000;
    if (!calendarReconcileDue) {
      properties.setProperty("HOUSE_AIRBNB_LAST_SYNC_AT", now.toISOString());
      return;
    }

    var diagnostics = [];
    Object.keys(HOUSE_AIRBNB_LISTINGS).forEach(function (room) {
      var propertyName = "AIRBNB_ICAL_ROOM_" + room;
      var calendarUrl = String(properties.getProperty(propertyName) || "").trim();
      if (!calendarUrl) {
        diagnostics.push(propertyName + " is missing");
        return;
      }
      var calendar = readRoomCalendar_(calendarUrl, room, emailReservations, fullAuditDue);
      diagnostics = diagnostics.concat(calendar.diagnostics);
      postRoomSync_(
        origin,
        syncToken,
        room,
        HOUSE_AIRBNB_LISTINGS[room],
        calendar.records,
        fullAuditDue && calendar.complete
      );
    });
    properties.setProperty("HOUSE_AIRBNB_LAST_SYNC_AT", now.toISOString());
    properties.setProperty("HOUSE_AIRBNB_LAST_CALENDAR_AT", now.toISOString());
    // Keep the earlier development property updated for a smooth migration.
    properties.setProperty("HOUSE_AIRBNB_LAST_CALENDAR_SYNC_AT", now.toISOString());
    if (fullAuditDue) {
      properties.setProperty("HOUSE_AIRBNB_LAST_AUDIT_AT", now.toISOString());
      properties.setProperty("HOUSE_AIRBNB_LAST_DIAGNOSTICS", diagnostics.slice(0, 80).join("\n"));
    }
  } finally {
    lock.releaseLock();
  }
}

function installHouseReservationTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "syncHouseReservations") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("syncHouseReservations").timeBased().everyMinutes(5).create();
  runFullHouseReservationAudit();
}

function readAirbnbReservationEmails_(options) {
  options = options || {};
  var fullAudit = options.fullAudit === true;
  var since = options.since instanceof Date && !isNaN(options.since.getTime())
    ? new Date(options.since.getTime() - HOUSE_SYNC_SETTINGS.recentMessageOverlapMinutes * 60000)
    : null;
  // Search all recent Airbnb mail instead of relying on specific subject/body
  // wording. Airbnb can change labels without warning; the code parser below
  // remains the authoritative filter.
  var query = [
    "newer_than:" + (fullAudit ? HOUSE_SYNC_SETTINGS.fullGmailLookbackDays : HOUSE_SYNC_SETTINGS.recentGmailLookbackDays) + "d",
    "from:airbnb.com"
  ].join(" ");
  var threads = GmailApp.search(
    query,
    0,
    fullAudit ? HOUSE_SYNC_SETTINGS.maximumFullThreads : HOUSE_SYNC_SETTINGS.maximumRecentThreads
  );
  var byCode = {};
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      var from = String(message.getFrom() || "").toLowerCase();
      if (from.indexOf("airbnb") < 0) return;
      if (!fullAudit && since && message.getDate().getTime() < since.getTime()) return;
      var subject = String(message.getSubject() || "");
      var body = String(message.getPlainBody() || "");
      var combined = subject + "\n" + body;
      var codes = unique_(combined.match(HOUSE_SYNC_SETTINGS.codePattern) || []).map(function (value) {
        return String(value).toUpperCase();
      });
      if (!codes.length) return;
      var listing = listingFromText_(combined);
      var dates = datesFromEmail_(combined, message.getDate());
      var cancelled = /\b(?:cancelled|canceled|reservation was cancelled|booking was cancelled)\b/i.test(combined);
      codes.forEach(function (code) {
      var record = {
          confirmationCode: code,
          guestFirstName: guestFirstNameFromEmail_(subject, body),
          listingId: listing,
          checkInDate: dates.checkInDate,
          checkOutDate: dates.checkOutDate,
          status: cancelled ? "cancelled" : "confirmed",
          sourceRef: "gmail:" + message.getId(),
          messageTime: message.getDate().getTime()
        };
        if (!byCode[code] || byCode[code].messageTime <= record.messageTime) byCode[code] = record;
      });
    });
  });
  return byCode;
}

function roomFromListingId_(listingId) {
  var rooms = Object.keys(HOUSE_AIRBNB_LISTINGS);
  for (var index = 0; index < rooms.length; index += 1) {
    if (HOUSE_AIRBNB_LISTINGS[rooms[index]] === String(listingId || "")) return rooms[index];
  }
  return "";
}

function postEmailReservations_(origin, token, emailsByCode) {
  var byRoom = {};
  Object.keys(emailsByCode || {}).forEach(function (code) {
    var item = emailsByCode[code] || {};
    var room = roomFromListingId_(item.listingId);
    if (!room || !item.checkInDate || !item.checkOutDate) return;
    if (!byRoom[room]) byRoom[room] = [];
    byRoom[room].push({
      confirmationCode: code,
      guestFirstName: item.guestFirstName || "",
      checkInDate: item.checkInDate,
      checkOutDate: item.checkOutDate,
      status: item.status === "cancelled" ? "cancelled" : "confirmed",
      sourceRef: item.sourceRef || ""
    });
  });
  var posted = 0;
  Object.keys(byRoom).forEach(function (room) {
    var records = dedupeRecords_(byRoom[room]);
    if (!records.length) return;
    postRoomSync_(origin, token, room, HOUSE_AIRBNB_LISTINGS[room], records, false);
    posted += records.length;
  });
  return posted;
}

function readRoomCalendar_(calendarUrl, room, emailsByCode, fullAudit) {
  var response = UrlFetchApp.fetch(calendarUrl, { muteHttpExceptions: true, followRedirects: true });
  if (response.getResponseCode() !== 200) {
    throw new Error("Airbnb iCal for Room " + room + " returned HTTP " + response.getResponseCode() + ".");
  }
  var unfolded = response.getContentText().replace(/\r?\n[ \t]/g, "");
  if (unfolded.indexOf("BEGIN:VCALENDAR") < 0 || unfolded.indexOf("END:VCALENDAR") < 0) {
    throw new Error("Airbnb iCal for Room " + room + " did not contain a complete VCALENDAR document.");
  }
  var events = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  var records = [];
  var diagnostics = [];
  var today = Utilities.formatDate(new Date(), HOUSE_SYNC_SETTINGS.timeZone, "yyyy-MM-dd");
  var futureCutoff = Utilities.formatDate(
    new Date(Date.now() + HOUSE_SYNC_SETTINGS.futureDays * 86400000),
    HOUSE_SYNC_SETTINGS.timeZone,
    "yyyy-MM-dd"
  );
  events.forEach(function (eventText) {
    var checkInDate = icalDate_(eventText, "DTSTART");
    var checkOutDate = icalDate_(eventText, "DTEND");
    if (!checkInDate || !checkOutDate || checkOutDate < today || checkInDate > futureCutoff) return;
    var summary = icalValue_(eventText, "SUMMARY");
    if (/\b(?:not available|blocked|airbnb \(not available\))\b/i.test(summary)) return;
    var code = firstConfirmationCode_(eventText);
    var emailMatch = code ? emailsByCode[code] : matchEmailToCalendar_(emailsByCode, HOUSE_AIRBNB_LISTINGS[room], checkInDate, checkOutDate);
    if (!code && emailMatch) code = emailMatch.confirmationCode;
    if (!code) {
      if (fullAudit) {
        diagnostics.push("Room " + room + " has an Airbnb reservation " + checkInDate + " to " + checkOutDate + " without a recognized confirmation code.");
      }
      return;
    }
    records.push({
      confirmationCode: code,
      guestFirstName: emailMatch && emailMatch.guestFirstName || "",
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      status: emailMatch && emailMatch.status === "cancelled" ? "cancelled" : "confirmed",
      sourceRef: icalValue_(eventText, "UID") || (emailMatch && emailMatch.sourceRef) || ""
    });
  });

  Object.keys(emailsByCode).forEach(function (code) {
    var item = emailsByCode[code];
    if (item.listingId !== HOUSE_AIRBNB_LISTINGS[room] || !item.checkInDate || !item.checkOutDate) return;
    if (!records.some(function (record) { return record.confirmationCode === code; })) {
      records.push({
        confirmationCode: code,
        guestFirstName: item.guestFirstName || "",
        checkInDate: item.checkInDate,
        checkOutDate: item.checkOutDate,
        status: item.status,
        sourceRef: item.sourceRef
      });
    }
  });
  // Only allow the Worker to cancel absent reservations when every Airbnb
  // reservation in this feed was matched to a confirmation code. A partial
  // parser result may add or update stays, but can never cancel good records.
  return {
    records: dedupeRecords_(records),
    complete: fullAudit === true && diagnostics.length === 0,
    diagnostics: diagnostics
  };
}

function postRoomSync_(origin, token, room, listingId, records, complete) {
  var response = UrlFetchApp.fetch(origin + "/api/reservations/sync", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify({ room: room, listingId: listingId, records: records, complete: complete === true }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error("Room " + room + " sync failed: HTTP " + response.getResponseCode() + " " + response.getContentText().slice(0, 300));
  }
}

function listingFromText_(text) {
  var source = String(text || "");
  var roomMatch = source.match(/\bRoom\s*(1|2|3|4|5|6|8|9|10|11)\b[^\n\r]{0,100}\bThe House\b/i)
    || source.match(/\bThe House\b[^\n\r]{0,100}\bRoom\s*(1|2|3|4|5|6|8|9|10|11)\b/i);
  if (roomMatch) return HOUSE_AIRBNB_LISTINGS[roomMatch[1]] || "";
  var listingIds = Object.keys(HOUSE_AIRBNB_LISTINGS);
  for (var index = 0; index < listingIds.length; index += 1) {
    if (source.indexOf(listingIds[index]) >= 0) return listingIds[index];
  }
  return "";
}

function datesFromEmail_(text, referenceDate) {
  var source = String(text || "");
  var reference = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  var checkIn = source.match(/(?:check[- ]?in|arrival)[^\n\r]{0,80}?(\d{4}-\d{2}-\d{2})/i);
  var checkOut = source.match(/(?:check[- ]?out|departure)[^\n\r]{0,80}?(\d{4}-\d{2}-\d{2})/i);
  var checkInDate = checkIn && HOUSE_SYNC_SETTINGS.datePattern.test(checkIn[1]) ? checkIn[1] : "";
  var checkOutDate = checkOut && HOUSE_SYNC_SETTINGS.datePattern.test(checkOut[1]) ? checkOut[1] : "";
  if (!checkInDate) checkInDate = labeledEnglishDate_(source, /(?:check[- ]?in|arrival)/i, reference);
  if (!checkOutDate) checkOutDate = labeledEnglishDate_(source, /(?:check[- ]?out|departure)/i, reference);
  if (!checkInDate || !checkOutDate) {
    var range = englishDateRange_(source, reference);
    checkInDate = checkInDate || range.checkInDate;
    checkOutDate = checkOutDate || range.checkOutDate;
  }
  if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
    var adjusted = addYearsToIsoDate_(checkOutDate, 1);
    if (adjusted > checkInDate) checkOutDate = adjusted;
  }
  return { checkInDate: checkInDate, checkOutDate: checkOutDate };
}

function englishDateRange_(text, referenceDate) {
  var monthNames = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  var source = String(text || "").replace(/\s+/g, " ");
  var reference = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  var monthFirst = source.match(new RegExp("(" + monthNames + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|—|to)\\s*(?:(" + monthNames + ")\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,)?(?:\\s+(\\d{4}))?", "i"));
  if (monthFirst) {
    var first = monthFirst[5]
      ? isoDate_(monthFirst[5], monthFirst[1], monthFirst[2])
      : inferredYearIsoDate_(monthFirst[1], monthFirst[2], reference);
    var secondMonth = monthFirst[3] || monthFirst[1];
    var second = monthFirst[5]
      ? isoDate_(monthFirst[5], secondMonth, monthFirst[4])
      : inferredYearIsoDate_(secondMonth, monthFirst[4], reference);
    if (first && second && second <= first) second = addYearsToIsoDate_(second, 1);
    return { checkInDate: first, checkOutDate: second };
  }
  var dayFirst = source.match(new RegExp("(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + monthNames + ")\\s*(?:-|–|—|to)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + monthNames + ")(?:,)?(?:\\s+(\\d{4}))?", "i"));
  if (dayFirst) {
    var firstDay = dayFirst[5]
      ? isoDate_(dayFirst[5], dayFirst[2], dayFirst[1])
      : inferredYearIsoDate_(dayFirst[2], dayFirst[1], reference);
    var secondDay = dayFirst[5]
      ? isoDate_(dayFirst[5], dayFirst[4], dayFirst[3])
      : inferredYearIsoDate_(dayFirst[4], dayFirst[3], reference);
    if (firstDay && secondDay && secondDay <= firstDay) secondDay = addYearsToIsoDate_(secondDay, 1);
    return { checkInDate: firstDay, checkOutDate: secondDay };
  }
  return { checkInDate: "", checkOutDate: "" };
}

function labeledEnglishDate_(text, labelPattern, referenceDate) {
  var monthNames = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  var source = String(text || "");
  var label = source.search(labelPattern);
  if (label < 0) return "";
  var nearby = source.slice(label, label + 180).replace(/\s+/g, " ");
  var reference = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  var weekday = "(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?),?\\s+";
  var monthFirst = nearby.match(new RegExp("(?:" + weekday + ")?(" + monthNames + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?(?:\\s+(\\d{4}))?", "i"));
  if (monthFirst) {
    return monthFirst[3]
      ? isoDate_(monthFirst[3], monthFirst[1], monthFirst[2])
      : inferredYearIsoDate_(monthFirst[1], monthFirst[2], reference);
  }
  var dayFirst = nearby.match(new RegExp("(?:" + weekday + ")?(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + monthNames + ")(?:,)?(?:\\s+(\\d{4}))?", "i"));
  if (!dayFirst) return "";
  return dayFirst[3]
    ? isoDate_(dayFirst[3], dayFirst[2], dayFirst[1])
    : inferredYearIsoDate_(dayFirst[2], dayFirst[1], reference);
}

function inferredYearIsoDate_(monthName, day, referenceDate) {
  var reference = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  var referenceYear = Number(Utilities.formatDate(reference, HOUSE_SYNC_SETTINGS.timeZone, "yyyy"));
  var referenceIso = Utilities.formatDate(reference, HOUSE_SYNC_SETTINGS.timeZone, "yyyy-MM-dd");
  var current = isoDate_(referenceYear, monthName, day);
  if (!current) return "";
  // Airbnb can omit the year. Prefer the current-year date unless it is more
  // than the calendar look-back window behind the message; otherwise use the
  // next year. This keeps same-day/last-minute bookings immediate and handles
  // December-to-January stays without guessing a far-past year.
  var currentTime = Date.parse(current + "T00:00:00Z");
  var referenceTime = Date.parse(referenceIso + "T00:00:00Z");
  if (currentTime < referenceTime - HOUSE_SYNC_SETTINGS.calendarPastDays * 86400000) {
    return isoDate_(referenceYear + 1, monthName, day);
  }
  return current;
}

function addYearsToIsoDate_(value, years) {
  var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  var nextYear = Number(match[1]) + Number(years || 0);
  return validIsoDateParts_(nextYear, Number(match[2]), Number(match[3]));
}

function validIsoDateParts_(year, month, day) {
  if (!Number.isInteger(Number(year)) || !Number.isInteger(Number(month)) || !Number.isInteger(Number(day))) return "";
  var date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return "";
  return String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function isoDate_(year, monthName, day) {
  var months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var month = months[String(monthName || "").slice(0, 3).toLowerCase()];
  if (!month) return "";
  return validIsoDateParts_(Number(year), month, Number(day));
}

function matchEmailToCalendar_(emailsByCode, listingId, checkInDate, checkOutDate) {
  var matches = Object.keys(emailsByCode).map(function (code) {
    var value = emailsByCode[code];
    return { confirmationCode: code, value: value };
  }).filter(function (item) {
    return item.value.listingId === listingId
      && item.value.checkInDate === checkInDate
      && item.value.checkOutDate === checkOutDate;
  });
  if (matches.length !== 1) return null;
  matches[0].value.confirmationCode = matches[0].confirmationCode;
  return matches[0].value;
}

function firstConfirmationCode_(text) {
  var match = String(text).match(HOUSE_SYNC_SETTINGS.codePattern);
  return match && match[0] ? String(match[0]).toUpperCase() : "";
}

function guestFirstNameFromEmail_(subject, body) {
  var combined = String(subject || "") + "\n" + String(body || "");
  var patterns = [
    /(?:guest\s+name|guest)\s*[:\-]\s*([A-Za-z][A-Za-z'\-]{1,39})/i,
    /(?:reservation|booking)\s+(?:confirmed|accepted)[^\n\r]{0,40}?[-:]\s*([A-Za-z][A-Za-z'\-]{1,39})/i,
    /([A-Za-z][A-Za-z'\-]{1,39})\s+(?:arrives|is arriving|checks in)/i
  ];
  for (var index = 0; index < patterns.length; index += 1) {
    var match = combined.match(patterns[index]);
    if (!match) continue;
    var value = String(match[1] || "").trim();
    if (!/^(?:airbnb|guest|reservation|booking|the|house)$/i.test(value)) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
  }
  return "";
}

function icalDate_(eventText, key) {
  var raw = icalValue_(eventText, key).replace(/[^0-9]/g, "").slice(0, 8);
  if (!/^\d{8}$/.test(raw)) return "";
  return raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8);
}

function icalValue_(eventText, key) {
  var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var match = String(eventText).match(new RegExp("^" + escaped + "(?:;[^:]*)?:(.*)$", "mi"));
  return match ? String(match[1]).trim() : "";
}

function dedupeRecords_(records) {
  var byCode = {};
  records.forEach(function (record) { byCode[record.confirmationCode] = record; });
  return Object.keys(byCode).map(function (code) { return byCode[code]; });
}

function unique_(values) {
  var seen = {};
  return values.filter(function (value) {
    var key = String(value).toUpperCase();
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function cleanOrigin_(value) {
  var origin = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(origin) ? origin : "";
}

function validDate_(value) {
  var parsed = new Date(String(value || ""));
  return isNaN(parsed.getTime()) ? null : parsed;
}
