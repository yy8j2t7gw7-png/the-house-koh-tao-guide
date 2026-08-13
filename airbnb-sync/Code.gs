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
  gmailLookbackDays: 400,
  futureDays: 400,
  calendarPastDays: 14,
  maximumThreads: 500,
  codePattern: /\b(?:HM|HMA|HMC|HMS|HMW)[A-Z0-9]{6,16}\b/gi,
  datePattern: /^\d{4}-\d{2}-\d{2}$/
};

function syncHouseReservations() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var properties = PropertiesService.getScriptProperties();
    var origin = cleanOrigin_(properties.getProperty("HOUSE_WORKER_ORIGIN"));
    var syncToken = String(properties.getProperty("RESERVATION_SYNC_TOKEN") || "").trim();
    if (!origin || !syncToken) {
      throw new Error("HOUSE_WORKER_ORIGIN and RESERVATION_SYNC_TOKEN are required Script Properties.");
    }

    var emailReservations = readAirbnbReservationEmails_();
    var diagnostics = [];
    Object.keys(HOUSE_AIRBNB_LISTINGS).forEach(function (room) {
      var propertyName = "AIRBNB_ICAL_ROOM_" + room;
      var calendarUrl = String(properties.getProperty(propertyName) || "").trim();
      if (!calendarUrl) {
        diagnostics.push(propertyName + " is missing");
        return;
      }
      var calendar = readRoomCalendar_(calendarUrl, room, emailReservations);
      diagnostics = diagnostics.concat(calendar.diagnostics);
      postRoomSync_(origin, syncToken, room, HOUSE_AIRBNB_LISTINGS[room], calendar.records, calendar.complete);
    });
    properties.setProperty("HOUSE_AIRBNB_LAST_SYNC_AT", new Date().toISOString());
    properties.setProperty("HOUSE_AIRBNB_LAST_DIAGNOSTICS", diagnostics.slice(0, 80).join("\n"));
  } finally {
    lock.releaseLock();
  }
}

function installHouseReservationTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "syncHouseReservations") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("syncHouseReservations").timeBased().everyMinutes(10).create();
  syncHouseReservations();
}

function readAirbnbReservationEmails_() {
  var query = [
    "newer_than:" + HOUSE_SYNC_SETTINGS.gmailLookbackDays + "d",
    "from:airbnb.com",
    "(\"confirmation code\" OR \"reservation code\" OR \"confirmation\")"
  ].join(" ");
  var threads = GmailApp.search(query, 0, HOUSE_SYNC_SETTINGS.maximumThreads);
  var byCode = {};
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      var from = String(message.getFrom() || "").toLowerCase();
      if (from.indexOf("airbnb") < 0) return;
      var subject = String(message.getSubject() || "");
      var body = String(message.getPlainBody() || "");
      var combined = subject + "\n" + body;
      var codes = unique_(combined.match(HOUSE_SYNC_SETTINGS.codePattern) || []).map(function (value) {
        return String(value).toUpperCase();
      });
      if (!codes.length) return;
      var listing = listingFromText_(combined);
      var dates = datesFromEmail_(combined);
      var cancelled = /\b(?:cancelled|canceled|reservation was cancelled|booking was cancelled)\b/i.test(combined);
      codes.forEach(function (code) {
        var record = {
          confirmationCode: code,
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

function readRoomCalendar_(calendarUrl, room, emailsByCode) {
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
      diagnostics.push("Room " + room + " has an Airbnb reservation " + checkInDate + " to " + checkOutDate + " without a recognized confirmation code.");
      return;
    }
    records.push({
      confirmationCode: code,
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
  return { records: dedupeRecords_(records), complete: diagnostics.length === 0, diagnostics: diagnostics };
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
  var roomMatch = String(text).match(/\bRoom\s*(1|2|3|4|5|6|8|9|10|11)\b[^\n\r]{0,60}\bThe House\b/i);
  if (roomMatch) return HOUSE_AIRBNB_LISTINGS[roomMatch[1]] || "";
  var listingIds = Object.keys(HOUSE_AIRBNB_LISTINGS);
  for (var index = 0; index < listingIds.length; index += 1) {
    if (String(text).indexOf(listingIds[index]) >= 0) return listingIds[index];
  }
  return "";
}

function datesFromEmail_(text) {
  var checkIn = String(text).match(/(?:check[- ]?in|arrival)[^\n\r]{0,80}?(\d{4}-\d{2}-\d{2})/i);
  var checkOut = String(text).match(/(?:check[- ]?out|departure)[^\n\r]{0,80}?(\d{4}-\d{2}-\d{2})/i);
  if (!checkIn || !checkOut) {
    checkIn = labeledEnglishDate_(text, /(?:check[- ]?in|arrival)/i);
    checkOut = labeledEnglishDate_(text, /(?:check[- ]?out|departure)/i);
  }
  return {
    checkInDate: typeof checkIn === "string" ? checkIn : (checkIn && HOUSE_SYNC_SETTINGS.datePattern.test(checkIn[1]) ? checkIn[1] : ""),
    checkOutDate: typeof checkOut === "string" ? checkOut : (checkOut && HOUSE_SYNC_SETTINGS.datePattern.test(checkOut[1]) ? checkOut[1] : "")
  };
}

function labeledEnglishDate_(text, labelPattern) {
  var monthNames = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  var source = String(text || "");
  var label = source.search(labelPattern);
  if (label < 0) return "";
  var nearby = source.slice(label, label + 180).replace(/\s+/g, " ");
  var monthFirst = nearby.match(new RegExp("(" + monthNames + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,)?\\s+(\\d{4})", "i"));
  if (monthFirst) return isoDate_(monthFirst[3], monthFirst[1], monthFirst[2]);
  var dayFirst = nearby.match(new RegExp("(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + monthNames + ")(?:,)?\\s+(\\d{4})", "i"));
  return dayFirst ? isoDate_(dayFirst[3], dayFirst[2], dayFirst[1]) : "";
}

function isoDate_(year, monthName, day) {
  var months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var month = months[String(monthName || "").slice(0, 3).toLowerCase()];
  if (!month || Number(day) < 1 || Number(day) > 31) return "";
  return String(year) + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
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
