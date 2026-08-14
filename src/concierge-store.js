import { DurableObject } from "cloudflare:workers";

function rows(cursor) {
  return Array.from(cursor || []);
}

function cleanText(value, maximum = 1200) {
  return String(value || "").trim().slice(0, maximum);
}

export class ConciergeStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS interactions (
          id TEXT PRIMARY KEY,
          session_hash TEXT NOT NULL,
          room TEXT NOT NULL DEFAULT '',
          question TEXT NOT NULL,
          normalized_question TEXT NOT NULL,
          cluster_key TEXT NOT NULL,
          answer_excerpt TEXT NOT NULL DEFAULT '',
          intent_id TEXT NOT NULL DEFAULT 'fallback',
          category TEXT NOT NULL DEFAULT 'fallback',
          confidence REAL NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'fallback',
          needs_human INTEGER NOT NULL DEFAULT 0,
          learning_gap INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS interactions_created_at ON interactions(created_at);
        CREATE INDEX IF NOT EXISTS interactions_cluster_key ON interactions(cluster_key);

        CREATE TABLE IF NOT EXISTS feedback (
          interaction_id TEXT PRIMARY KEY,
          rating TEXT NOT NULL,
          comment TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS learning_queue (
          id TEXT PRIMARY KEY,
          cluster_key TEXT NOT NULL UNIQUE,
          sample_question TEXT NOT NULL,
          proposed_answer TEXT NOT NULL DEFAULT '',
          proposed_intent TEXT NOT NULL DEFAULT 'fallback',
          proposed_category TEXT NOT NULL DEFAULT 'fallback',
          occurrences INTEGER NOT NULL DEFAULT 1,
          negative_feedback INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          reviewed_at TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS learning_queue_status ON learning_queue(status, updated_at);

        CREATE TABLE IF NOT EXISTS approved_knowledge (
          id TEXT PRIMARY KEY,
          question_pattern TEXT NOT NULL,
          answer TEXT NOT NULL,
          intent_id TEXT NOT NULL,
          category TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS approved_knowledge_active ON approved_knowledge(active, updated_at);

        CREATE TABLE IF NOT EXISTS passport_uploads (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          room TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          object_key TEXT NOT NULL DEFAULT '',
          media_type TEXT NOT NULL DEFAULT '',
          extension TEXT NOT NULL DEFAULT '',
          size_bytes INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          arrival_at TEXT NOT NULL DEFAULT '',
          expires_at TEXT NOT NULL,
          reminder_sent_at TEXT NOT NULL DEFAULT '',
          uploaded_at TEXT NOT NULL DEFAULT '',
          delete_after TEXT NOT NULL DEFAULT '',
          deleted_at TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS passport_uploads_status ON passport_uploads(status, arrival_at, expires_at);

        CREATE TABLE IF NOT EXISTS translation_cache (
          cache_key TEXT PRIMARY KEY,
          language TEXT NOT NULL,
          source_hash TEXT NOT NULL,
          translation TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS translation_cache_language ON translation_cache(language, updated_at);

        CREATE TABLE IF NOT EXISTS concierge_alerts (
          id TEXT PRIMARY KEY,
          interaction_id TEXT NOT NULL DEFAULT '',
          dedupe_key TEXT NOT NULL,
          severity TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          recipient_group TEXT NOT NULL,
          room TEXT NOT NULL DEFAULT '',
          room_verified INTEGER NOT NULL DEFAULT 0,
          summary TEXT NOT NULL,
          bangkok_time TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          created_at TEXT NOT NULL,
          acknowledged_at TEXT NOT NULL DEFAULT '',
          acknowledged_by_hash TEXT NOT NULL DEFAULT '',
          resolved_at TEXT NOT NULL DEFAULT '',
          resolved_by_hash TEXT NOT NULL DEFAULT '',
          escalation_due_at TEXT NOT NULL DEFAULT '',
          escalated_at TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS concierge_alerts_status ON concierge_alerts(status, escalation_due_at, created_at);
        CREATE INDEX IF NOT EXISTS concierge_alerts_dedupe ON concierge_alerts(dedupe_key, created_at);

        CREATE TABLE IF NOT EXISTS concierge_alert_deliveries (
          id TEXT PRIMARY KEY,
          alert_id TEXT NOT NULL,
          stage TEXT NOT NULL,
          recipient_hash TEXT NOT NULL DEFAULT '',
          recipient_label TEXT NOT NULL DEFAULT '',
          provider_message_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL,
          error_code TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS concierge_alert_deliveries_alert ON concierge_alert_deliveries(alert_id, created_at);
        CREATE INDEX IF NOT EXISTS concierge_alert_deliveries_provider ON concierge_alert_deliveries(provider_message_id);

        CREATE TABLE IF NOT EXISTS maintenance_reports (
          id TEXT PRIMARY KEY,
          reservation_id TEXT NOT NULL,
          room TEXT NOT NULL,
          issue_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          details TEXT NOT NULL DEFAULT '',
          fee_accepted INTEGER NOT NULL DEFAULT 0,
          photo_object_key TEXT NOT NULL DEFAULT '',
          photo_media_type TEXT NOT NULL DEFAULT '',
          photo_extension TEXT NOT NULL DEFAULT '',
          photo_size_bytes INTEGER NOT NULL DEFAULT 0,
          alert_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'open',
          created_at TEXT NOT NULL,
          delete_after TEXT NOT NULL DEFAULT '',
          photo_deleted_at TEXT NOT NULL DEFAULT '',
          resolved_at TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS maintenance_reports_status
          ON maintenance_reports(status, created_at);
        CREATE INDEX IF NOT EXISTS maintenance_reports_alert
          ON maintenance_reports(alert_id);

        CREATE TABLE IF NOT EXISTS stay_reservations (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL DEFAULT 'airbnb',
          listing_id TEXT NOT NULL,
          room TEXT NOT NULL,
          confirmation_code_hash TEXT NOT NULL UNIQUE,
          check_in_date TEXT NOT NULL,
          check_out_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'confirmed',
          source_ref_hash TEXT NOT NULL DEFAULT '',
          last_seen_sync TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS stay_reservations_room_dates
          ON stay_reservations(room, status, check_in_date, check_out_date);

        CREATE TABLE IF NOT EXISTS stay_checkout_overrides (
          reservation_id TEXT PRIMARY KEY,
          check_out_date TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS verified_stay_sessions (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          reservation_id TEXT NOT NULL,
          room TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          last_seen_at TEXT NOT NULL,
          revoked_at TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS verified_stay_sessions_expiry
          ON verified_stay_sessions(expires_at, revoked_at);

        CREATE TABLE IF NOT EXISTS passport_reservation_links (
          passport_id TEXT PRIMARY KEY,
          reservation_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS passport_reservation_links_reservation
          ON passport_reservation_links(reservation_id, created_at);

        CREATE TABLE IF NOT EXISTS stay_registration_status (
          reservation_id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stay_registration_requirements (
          reservation_id TEXT PRIMARY KEY,
          guest_type TEXT NOT NULL,
          required_passports INTEGER NOT NULL DEFAULT 0,
          received_passports INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS spare_key_events (
          id TEXT PRIMARY KEY,
          reservation_id TEXT NOT NULL,
          room TEXT NOT NULL,
          event_type TEXT NOT NULL,
          fee_accepted INTEGER NOT NULL DEFAULT 0,
          code_released INTEGER NOT NULL DEFAULT 0,
          alert_id TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS spare_key_events_reservation
          ON spare_key_events(reservation_id, created_at);
        CREATE UNIQUE INDEX IF NOT EXISTS spare_key_events_single_claim
          ON spare_key_events(reservation_id);

        CREATE TABLE IF NOT EXISTS spare_key_room_state (
          room TEXT PRIMARY KEY,
          rotation_required INTEGER NOT NULL DEFAULT 0,
          last_released_at TEXT NOT NULL DEFAULT '',
          last_reservation_id TEXT NOT NULL DEFAULT '',
          rotation_confirmed_at TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL
        );
      `);
    });
  }

  async recordInteraction(record) {
    const now = cleanText(record.createdAt, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO interactions
       (id, session_hash, room, question, normalized_question, cluster_key, answer_excerpt,
        intent_id, category, confidence, source, needs_human, learning_gap, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cleanText(record.id, 80),
      cleanText(record.sessionHash, 100),
      cleanText(record.room, 4),
      cleanText(record.question, 800),
      cleanText(record.normalizedQuestion, 800),
      cleanText(record.clusterKey, 160),
      cleanText(record.answerExcerpt, 600),
      cleanText(record.intentId, 80),
      cleanText(record.category, 80),
      Number(record.confidence) || 0,
      cleanText(record.source, 30),
      record.needsHuman ? 1 : 0,
      record.learningGap ? 1 : 0,
      now
    );

    if (record.learningGap) {
      const queueId = `gap_${cleanText(record.clusterKey, 160)}`;
      this.ctx.storage.sql.exec(
        `INSERT INTO learning_queue
         (id, cluster_key, sample_question, proposed_answer, proposed_intent, proposed_category,
          occurrences, negative_feedback, status, created_at, updated_at, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'pending', ?, ?, '')
         ON CONFLICT(cluster_key) DO UPDATE SET
           sample_question = excluded.sample_question,
           proposed_answer = CASE
             WHEN learning_queue.proposed_answer = '' THEN excluded.proposed_answer
             ELSE learning_queue.proposed_answer
           END,
           proposed_intent = excluded.proposed_intent,
           proposed_category = excluded.proposed_category,
           occurrences = learning_queue.occurrences + 1,
           status = CASE WHEN learning_queue.status = 'rejected' THEN 'pending' ELSE learning_queue.status END,
           updated_at = excluded.updated_at`,
        queueId,
        cleanText(record.clusterKey, 160),
        cleanText(record.question, 800),
        cleanText(record.answerExcerpt, 1200),
        cleanText(record.intentId, 80),
        cleanText(record.category, 80),
        now,
        now
      );
    }

    this.ctx.storage.sql.exec(
      "DELETE FROM feedback WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM interactions WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    return { stored: true };
  }

  async recordFeedback(feedback) {
    const now = new Date().toISOString();
    const interactionId = cleanText(feedback.interactionId, 80);
    const rating = feedback.rating === "up" ? "up" : "down";
    const interaction = rows(this.ctx.storage.sql.exec(
      "SELECT cluster_key, question, answer_excerpt, intent_id, category FROM interactions WHERE id = ? LIMIT 1",
      interactionId
    ))[0];
    if (!interaction) return { stored: false, error: "interaction_not_found" };

    this.ctx.storage.sql.exec(
      `INSERT INTO feedback (interaction_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(interaction_id) DO UPDATE SET
         rating = excluded.rating,
         comment = excluded.comment,
         created_at = excluded.created_at`,
      interactionId,
      rating,
      cleanText(feedback.comment, 500),
      now
    );

    if (rating === "down") {
      const queueId = `gap_${interaction.cluster_key}`;
      this.ctx.storage.sql.exec(
        `INSERT INTO learning_queue
         (id, cluster_key, sample_question, proposed_answer, proposed_intent, proposed_category,
          occurrences, negative_feedback, status, created_at, updated_at, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'pending', ?, ?, '')
         ON CONFLICT(cluster_key) DO UPDATE SET
           negative_feedback = learning_queue.negative_feedback + 1,
           status = 'pending',
           updated_at = excluded.updated_at`,
        queueId,
        interaction.cluster_key,
        interaction.question,
        interaction.answer_excerpt,
        interaction.intent_id,
        interaction.category,
        now,
        now
      );
    }
    return { stored: true };
  }

  async getApprovedKnowledge() {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, question_pattern AS questionPattern, answer, intent_id AS intentId,
              category, updated_at AS updatedAt
       FROM approved_knowledge
       WHERE active = 1
       ORDER BY updated_at DESC
       LIMIT 250`
    ));
  }

  async getAdminOverview() {
    const totals = rows(this.ctx.storage.sql.exec(`
      SELECT
        COUNT(*) AS interactions30d,
        SUM(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS interactions24h,
        SUM(CASE WHEN learning_gap = 1 THEN 1 ELSE 0 END) AS gaps30d,
        SUM(CASE WHEN needs_human = 1 THEN 1 ELSE 0 END) AS handoffs30d
      FROM interactions
    `))[0] || {};
    const feedback = rows(this.ctx.storage.sql.exec(`
      SELECT
        SUM(CASE WHEN rating = 'up' THEN 1 ELSE 0 END) AS positive,
        SUM(CASE WHEN rating = 'down' THEN 1 ELSE 0 END) AS negative
      FROM feedback
    `))[0] || {};
    const queue = rows(this.ctx.storage.sql.exec(`
      SELECT id, sample_question AS sampleQuestion, proposed_answer AS proposedAnswer,
             proposed_intent AS proposedIntent, proposed_category AS proposedCategory,
             occurrences, negative_feedback AS negativeFeedback, status,
             created_at AS createdAt, updated_at AS updatedAt
      FROM learning_queue
      WHERE status = 'pending'
      ORDER BY negative_feedback DESC, occurrences DESC, updated_at DESC
      LIMIT 100
    `));
    const approved = await this.getApprovedKnowledge();
    const passportTotals = rows(this.ctx.storage.sql.exec(`
      SELECT
        SUM(CASE WHEN status = 'pending' AND julianday(expires_at) > julianday('now') THEN 1 ELSE 0 END) AS pendingRegistrations,
        SUM(CASE WHEN status = 'uploaded' THEN 1 ELSE 0 END) AS storedPassportFiles
      FROM passport_uploads
    `))[0] || {};
    const pendingRegistrations = rows(this.ctx.storage.sql.exec(`
      SELECT id, room, created_at AS createdAt, arrival_at AS arrivalAt,
             expires_at AS expiresAt, reminder_sent_at AS reminderSentAt
      FROM passport_uploads
      WHERE status = 'pending' AND julianday(expires_at) > julianday('now')
      ORDER BY CASE WHEN arrival_at = '' THEN expires_at ELSE arrival_at END ASC
      LIMIT 100
    `));
    const passportUploads = rows(this.ctx.storage.sql.exec(`
      SELECT id, room, media_type AS mediaType, extension, size_bytes AS sizeBytes,
             uploaded_at AS uploadedAt, delete_after AS deleteAfter
      FROM passport_uploads
      WHERE status = 'uploaded'
      ORDER BY uploaded_at DESC
      LIMIT 100
    `));
    const recent = rows(this.ctx.storage.sql.exec(`
      SELECT id, room, question, intent_id AS intentId, category, confidence, source,
             needs_human AS needsHuman, learning_gap AS learningGap, created_at AS createdAt
      FROM interactions
      ORDER BY created_at DESC
      LIMIT 50
    `));
    const alertTotals = rows(this.ctx.storage.sql.exec(`
      SELECT
        SUM(CASE WHEN status IN ('open', 'acknowledged') THEN 1 ELSE 0 END) AS openAlerts,
        SUM(CASE WHEN severity = 'critical' AND status IN ('open', 'acknowledged') THEN 1 ELSE 0 END) AS criticalAlerts
      FROM concierge_alerts
    `))[0] || {};
    const alerts = rows(this.ctx.storage.sql.exec(`
      SELECT a.id, a.interaction_id AS interactionId, a.severity,
             a.alert_type AS alertType, a.recipient_group AS recipientGroup,
             a.room, a.room_verified AS roomVerified, a.summary,
             a.bangkok_time AS bangkokTime, a.status, a.created_at AS createdAt,
             a.acknowledged_at AS acknowledgedAt, a.resolved_at AS resolvedAt,
             a.escalation_due_at AS escalationDueAt, a.escalated_at AS escalatedAt,
             SUM(CASE WHEN d.status IN ('accepted', 'sent', 'delivered', 'read') THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM concierge_alerts a
      LEFT JOIN concierge_alert_deliveries d ON d.alert_id = a.id
      WHERE a.status IN ('open', 'acknowledged')
      GROUP BY a.id
      ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
               a.created_at DESC
      LIMIT 100
    `));
    const maintenanceReports = rows(this.ctx.storage.sql.exec(`
      SELECT id, room, issue_type AS issueType, severity, details,
             fee_accepted AS feeAccepted, photo_object_key AS photoObjectKey,
             photo_media_type AS photoMediaType, photo_extension AS photoExtension,
             photo_size_bytes AS photoSizeBytes, alert_id AS alertId, status,
             created_at AS createdAt, delete_after AS deleteAfter,
             photo_deleted_at AS photoDeletedAt, resolved_at AS resolvedAt
      FROM maintenance_reports
      WHERE status IN ('open', 'acknowledged') OR julianday(created_at) >= julianday('now', '-7 days')
      ORDER BY CASE severity WHEN 'critical' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 100
    `));
    return {
      totals: {
        interactions24h: Number(totals.interactions24h) || 0,
        interactions30d: Number(totals.interactions30d) || 0,
        gaps30d: Number(totals.gaps30d) || 0,
        handoffs30d: Number(totals.handoffs30d) || 0,
        positive: Number(feedback.positive) || 0,
        negative: Number(feedback.negative) || 0,
        pending: queue.length,
        approved: approved.length,
        pendingRegistrations: Number(passportTotals.pendingRegistrations) || 0,
        storedPassportFiles: Number(passportTotals.storedPassportFiles) || 0,
        openMaintenanceReports: maintenanceReports.filter((item) => item.status !== "resolved").length,
        openAlerts: Number(alertTotals.openAlerts) || 0,
        criticalAlerts: Number(alertTotals.criticalAlerts) || 0
      },
      queue,
      approved,
      pendingRegistrations,
      passportUploads,
      maintenanceReports: maintenanceReports.map((report) => ({
        ...report,
        feeAccepted: Boolean(report.feeAccepted),
        hasPhoto: Boolean(report.photoObjectKey),
        photoObjectKey: undefined
      })),
      alerts: alerts.map((alert) => ({
        ...alert,
        roomVerified: Boolean(alert.roomVerified),
        delivered: Number(alert.delivered) || 0,
        failed: Number(alert.failed) || 0
      })),
      recent
    };
  }

  async createAlert(record) {
    const createdAt = cleanText(record.createdAt, 40) || new Date().toISOString();
    const dedupeKey = cleanText(record.dedupeKey, 100);
    const existing = rows(this.ctx.storage.sql.exec(
      `SELECT id, interaction_id AS interactionId, severity, alert_type AS alertType,
              recipient_group AS recipientGroup, room, room_verified AS roomVerified,
              summary, bangkok_time AS bangkokTime, status, created_at AS createdAt,
              escalation_due_at AS escalationDueAt, escalated_at AS escalatedAt
       FROM concierge_alerts
       WHERE dedupe_key = ? AND status IN ('open', 'acknowledged')
         AND julianday(created_at) >= julianday(?, '-5 minutes')
       ORDER BY created_at DESC LIMIT 1`,
      dedupeKey,
      createdAt
    ))[0];
    if (existing) return { created: false, alert: { ...existing, roomVerified: Boolean(existing.roomVerified) } };

    this.ctx.storage.sql.exec(
      `INSERT INTO concierge_alerts
       (id, interaction_id, dedupe_key, severity, alert_type, recipient_group, room,
        room_verified, summary, bangkok_time, status, created_at, escalation_due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.interactionId, 100),
      dedupeKey,
      cleanText(record.severity, 20),
      cleanText(record.alertType, 80),
      cleanText(record.recipientGroup, 40),
      cleanText(record.room, 4),
      record.roomVerified ? 1 : 0,
      cleanText(record.summary, 400),
      cleanText(record.bangkokTime, 80),
      createdAt,
      cleanText(record.escalationDueAt, 40)
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM concierge_alert_deliveries WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM concierge_alerts WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    return { created: true };
  }

  async createMaintenanceReport(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO maintenance_reports
       (id, reservation_id, room, issue_type, severity, details, fee_accepted,
        photo_object_key, photo_media_type, photo_extension, photo_size_bytes,
        alert_id, status, created_at, delete_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.reservationId, 100),
      cleanText(record.room, 4),
      cleanText(record.issueType, 80),
      cleanText(record.severity, 20),
      cleanText(record.details, 500),
      record.feeAccepted ? 1 : 0,
      cleanText(record.photoObjectKey, 400),
      cleanText(record.photoMediaType, 80),
      cleanText(record.photoExtension, 12),
      Number(record.photoSizeBytes) || 0,
      cleanText(record.alertId, 100),
      cleanText(record.createdAt, 40) || new Date().toISOString(),
      cleanText(record.deleteAfter, 40)
    );
    return { ok: true };
  }

  async getMaintenanceReport(id) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, room, issue_type AS issueType, severity, details,
              fee_accepted AS feeAccepted, photo_object_key AS photoObjectKey,
              photo_media_type AS photoMediaType, photo_extension AS photoExtension,
              photo_size_bytes AS photoSizeBytes, alert_id AS alertId, status,
              created_at AS createdAt, delete_after AS deleteAfter,
              photo_deleted_at AS photoDeletedAt, resolved_at AS resolvedAt
       FROM maintenance_reports WHERE id = ? LIMIT 1`,
      cleanText(id, 100)
    ))[0] || null;
  }

  async deleteMaintenancePhoto(id, nowValue) {
    this.ctx.storage.sql.exec(
      `UPDATE maintenance_reports
       SET photo_object_key = '', photo_deleted_at = ?
       WHERE id = ?`,
      cleanText(nowValue, 40) || new Date().toISOString(),
      cleanText(id, 100)
    );
    return { ok: true };
  }

  async cleanupMaintenanceReports(nowValue) {
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    const records = rows(this.ctx.storage.sql.exec(
      `SELECT id, photo_object_key AS photoObjectKey
       FROM maintenance_reports
       WHERE photo_object_key != ''
         AND ((delete_after != '' AND delete_after <= ?) OR status = 'resolved')`,
      now
    ));
    this.ctx.storage.sql.exec(
      "DELETE FROM maintenance_reports WHERE status = 'resolved' AND julianday(resolved_at) < julianday('now', '-30 days')"
    );
    return { records };
  }

  async recordAlertDelivery(record) {
    const createdAt = cleanText(record.createdAt, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO concierge_alert_deliveries
       (id, alert_id, stage, recipient_hash, recipient_label, provider_message_id,
        status, error_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.alertId, 100),
      cleanText(record.stage, 30),
      cleanText(record.recipientHash, 100),
      cleanText(record.recipientLabel, 80),
      cleanText(record.providerMessageId, 180),
      cleanText(record.status, 30),
      cleanText(record.errorCode, 80),
      createdAt,
      createdAt
    );
    return { ok: true };
  }

  async updateAlertDeliveryStatus(record) {
    const providerMessageId = cleanText(record.providerMessageId, 180);
    if (!providerMessageId) return { ok: false };
    this.ctx.storage.sql.exec(
      `UPDATE concierge_alert_deliveries
       SET status = ?, error_code = ?, updated_at = ?
       WHERE provider_message_id = ?`,
      cleanText(record.status, 30),
      cleanText(record.errorCode, 80),
      cleanText(record.updatedAt, 40) || new Date().toISOString(),
      providerMessageId
    );
    return { ok: true };
  }

  async getDueAlertEscalations(nowValue) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, interaction_id AS interactionId, severity, alert_type AS alertType,
              recipient_group AS recipientGroup, room, room_verified AS roomVerified,
              summary, bangkok_time AS bangkokTime, status, created_at AS createdAt,
              escalation_due_at AS escalationDueAt, escalated_at AS escalatedAt
       FROM concierge_alerts
       WHERE status = 'open' AND escalation_due_at != '' AND escalation_due_at <= ?
         AND escalated_at = ''
       ORDER BY escalation_due_at ASC LIMIT 100`,
      cleanText(nowValue, 40)
    )).map((alert) => ({ ...alert, roomVerified: Boolean(alert.roomVerified) }));
  }

  async markAlertEscalated(id, nowValue) {
    this.ctx.storage.sql.exec(
      "UPDATE concierge_alerts SET escalated_at = ? WHERE id = ? AND escalated_at = ''",
      cleanText(nowValue, 40) || new Date().toISOString(),
      cleanText(id, 100)
    );
    return { ok: true };
  }

  async acknowledgeAlert(id, actorHash, nowValue) {
    this.ctx.storage.sql.exec(
      `UPDATE concierge_alerts
       SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by_hash = ?
       WHERE id = ? AND status = 'open'`,
      cleanText(nowValue, 40) || new Date().toISOString(),
      cleanText(actorHash, 100),
      cleanText(id, 100)
    );
    this.ctx.storage.sql.exec(
      "UPDATE maintenance_reports SET status = 'acknowledged' WHERE alert_id = ? AND status = 'open'",
      cleanText(id, 100)
    );
    return { ok: true };
  }

  async resolveAlert(id, actorHash, nowValue) {
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `UPDATE concierge_alerts
       SET status = 'resolved', resolved_at = ?, resolved_by_hash = ?
       WHERE id = ? AND status IN ('open', 'acknowledged')`,
      now,
      cleanText(actorHash, 100),
      cleanText(id, 100)
    );
    this.ctx.storage.sql.exec(
      `UPDATE maintenance_reports
       SET status = 'resolved', resolved_at = ?, delete_after = ?
       WHERE alert_id = ? AND status IN ('open', 'acknowledged')`,
      now,
      now,
      cleanText(id, 100)
    );
    return { ok: true };
  }

  async reviewLearning(review) {
    const id = cleanText(review.id, 220);
    const status = review.status === "approved" ? "approved" : "rejected";
    const now = new Date().toISOString();
    const queueItem = rows(this.ctx.storage.sql.exec(
      "SELECT * FROM learning_queue WHERE id = ? LIMIT 1",
      id
    ))[0];
    if (!queueItem) return { ok: false, error: "not_found" };

    if (status === "approved") {
      const answer = cleanText(review.answer, 2400);
      const questionPattern = cleanText(review.questionPattern || queueItem.sample_question, 800);
      const intentId = cleanText(review.intentId || queueItem.proposed_intent || "owner_approved", 80);
      const category = cleanText(review.category || queueItem.proposed_category || "concierge", 80);
      if (!answer || !questionPattern) return { ok: false, error: "answer_required" };
      const knowledgeId = `approved_${crypto.randomUUID()}`;
      this.ctx.storage.sql.exec(
        `INSERT INTO approved_knowledge
         (id, question_pattern, answer, intent_id, category, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        knowledgeId,
        questionPattern,
        answer,
        intentId,
        category,
        now,
        now
      );
    }

    this.ctx.storage.sql.exec(
      "UPDATE learning_queue SET status = ?, reviewed_at = ?, updated_at = ? WHERE id = ?",
      status,
      now,
      now,
      id
    );
    return { ok: true, status };
  }

  async setApprovedKnowledgeActive(id, active) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      "UPDATE approved_knowledge SET active = ?, updated_at = ? WHERE id = ?",
      active ? 1 : 0,
      now,
      cleanText(id, 100)
    );
    return { ok: true };
  }

  async syncStayReservations(payload) {
    const now = cleanText(payload.syncedAt, 40) || new Date().toISOString();
    const room = cleanText(payload.room, 4);
    const listingId = cleanText(payload.listingId, 32);
    const provider = cleanText(payload.provider || "airbnb", 24);
    const syncId = cleanText(payload.syncId, 100);
    const records = Array.isArray(payload.records) ? payload.records.slice(0, 250) : [];
    let upserted = 0;

    for (const record of records) {
      const codeHash = cleanText(record.confirmationCodeHash, 100);
      const checkInDate = cleanText(record.checkInDate, 10);
      const checkOutDate = cleanText(record.checkOutDate, 10);
      if (!codeHash || !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate)) continue;
      const existing = rows(this.ctx.storage.sql.exec(
        "SELECT id, created_at AS createdAt FROM stay_reservations WHERE confirmation_code_hash = ? LIMIT 1",
        codeHash
      ))[0];
      const id = existing?.id || `stay_${crypto.randomUUID()}`;
      const createdAt = existing?.createdAt || now;
      const status = record.status === "cancelled" ? "cancelled" : "confirmed";
      this.ctx.storage.sql.exec(
        `INSERT INTO stay_reservations
         (id, provider, listing_id, room, confirmation_code_hash, check_in_date,
          check_out_date, status, source_ref_hash, last_seen_sync, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(confirmation_code_hash) DO UPDATE SET
           provider = excluded.provider,
           listing_id = excluded.listing_id,
           room = excluded.room,
           check_in_date = excluded.check_in_date,
           check_out_date = excluded.check_out_date,
           status = excluded.status,
           source_ref_hash = excluded.source_ref_hash,
           last_seen_sync = excluded.last_seen_sync,
           updated_at = excluded.updated_at`,
        id,
        provider,
        listingId,
        room,
        codeHash,
        checkInDate,
        checkOutDate,
        status,
        cleanText(record.sourceRefHash, 100),
        syncId,
        createdAt,
        now
      );
      upserted += 1;
    }

    if (payload.complete === true) {
      this.ctx.storage.sql.exec(
        `UPDATE stay_reservations
         SET status = 'cancelled', updated_at = ?
         WHERE provider = ? AND listing_id = ? AND room = ? AND status = 'confirmed'
           AND last_seen_sync != ? AND check_out_date >= date('now', '-2 days')`,
        now,
        provider,
        listingId,
        room,
        syncId
      );
    }
    this.ctx.storage.sql.exec(
      "DELETE FROM verified_stay_sessions WHERE expires_at <= ? OR revoked_at != ''",
      now
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM stay_reservations WHERE status = 'cancelled' AND julianday(updated_at) < julianday('now', '-90 days')"
    );
    return { ok: true, upserted };
  }

  async getStayReservationByCodeHash(codeHash, room) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, provider, listing_id AS listingId, room,
              check_in_date AS checkInDate,
              CASE WHEN o.check_out_date > r.check_out_date THEN o.check_out_date ELSE r.check_out_date END AS checkOutDate,
              r.status, r.updated_at AS updatedAt
       FROM stay_reservations r
       LEFT JOIN stay_checkout_overrides o ON o.reservation_id = r.id
       WHERE confirmation_code_hash = ? AND room = ? AND status = 'confirmed'
       LIMIT 1`,
      cleanText(codeHash, 100),
      cleanText(room, 4)
    ))[0] || null;
  }

  async createVerifiedStaySession(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO verified_stay_sessions
       (id, token_hash, reservation_id, room, created_at, expires_at, last_seen_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
      cleanText(record.id, 100),
      cleanText(record.tokenHash, 100),
      cleanText(record.reservationId, 100),
      cleanText(record.room, 4),
      cleanText(record.createdAt, 40),
      cleanText(record.expiresAt, 40),
      cleanText(record.createdAt, 40)
    );
    return { ok: true };
  }

  async getVerifiedStaySession(tokenHash, nowValue) {
    const session = rows(this.ctx.storage.sql.exec(
      `SELECT s.id, s.reservation_id AS reservationId, s.room, s.created_at AS createdAt,
              s.expires_at AS expiresAt, r.provider, r.listing_id AS listingId,
              r.check_in_date AS checkInDate,
              CASE WHEN o.check_out_date > r.check_out_date THEN o.check_out_date ELSE r.check_out_date END AS checkOutDate,
              r.status AS reservationStatus
       FROM verified_stay_sessions s
       JOIN stay_reservations r ON r.id = s.reservation_id
       LEFT JOIN stay_checkout_overrides o ON o.reservation_id = r.id
       WHERE s.token_hash = ? AND s.revoked_at = '' AND s.expires_at > ?
         AND r.status = 'confirmed'
       LIMIT 1`,
      cleanText(tokenHash, 100),
      cleanText(nowValue, 40)
    ))[0] || null;
    if (session) {
      this.ctx.storage.sql.exec(
        "UPDATE verified_stay_sessions SET last_seen_at = ? WHERE id = ?",
        cleanText(nowValue, 40),
        session.id
      );
    }
    return session;
  }

  async revokeVerifiedStaySession(tokenHash, nowValue) {
    this.ctx.storage.sql.exec(
      "UPDATE verified_stay_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at = ''",
      cleanText(nowValue, 40),
      cleanText(tokenHash, 100)
    );
    return { ok: true };
  }

  async createAutomaticPassportUpload(record) {
    const existing = rows(this.ctx.storage.sql.exec(
      `SELECT p.id, p.status, p.expires_at AS expiresAt
       FROM passport_uploads p
       JOIN passport_reservation_links l ON l.passport_id = p.id
       WHERE l.reservation_id = ? AND p.status = 'pending' AND p.expires_at > ?
       ORDER BY p.created_at DESC LIMIT 1`,
      cleanText(record.reservationId, 100),
      cleanText(record.createdAt, 40)
    ))[0];
    if (existing) {
      this.ctx.storage.sql.exec(
        `UPDATE passport_uploads
         SET status = 'deleted', deleted_at = ?, object_key = ''
         WHERE id = ? AND status = 'pending'`,
        cleanText(record.createdAt, 40),
        existing.id
      );
    }

    const count = rows(this.ctx.storage.sql.exec(
      `SELECT COUNT(*) AS total
       FROM passport_reservation_links l
       JOIN passport_uploads p ON p.id = l.passport_id
       WHERE l.reservation_id = ? AND p.status IN ('pending', 'uploaded')`,
      cleanText(record.reservationId, 100)
    ))[0];
    if ((Number(count?.total) || 0) >= 10) return { ok: false, error: "registration_limit_reached" };

    await this.createPassportUpload(record);
    this.ctx.storage.sql.exec(
      `INSERT INTO passport_reservation_links (passport_id, reservation_id, created_at)
       VALUES (?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.reservationId, 100),
      cleanText(record.createdAt, 40)
    );
    return { ok: true };
  }

  async setStayRegistrationStatus(reservationId, status, nowValue) {
    this.ctx.storage.sql.exec(
      `INSERT INTO stay_registration_status (reservation_id, status, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(reservation_id) DO UPDATE SET
         status = excluded.status, updated_at = excluded.updated_at`,
      cleanText(reservationId, 100),
      cleanText(status, 40),
      cleanText(nowValue, 40) || new Date().toISOString()
    );
    return { ok: true };
  }

  async setStayRegistrationRequirement(reservationId, guestType, requiredPassports, nowValue) {
    const cleanGuestType = guestType === "thai" ? "thai" : "foreign";
    const required = cleanGuestType === "thai"
      ? 0
      : Math.min(10, Math.max(1, Number(requiredPassports) || 1));
    const receivedRow = rows(this.ctx.storage.sql.exec(
      `SELECT COUNT(*) AS total
       FROM passport_reservation_links l
       JOIN passport_uploads p ON p.id = l.passport_id
       WHERE l.reservation_id = ? AND p.status = 'uploaded'`,
      cleanText(reservationId, 100)
    ))[0];
    const received = cleanGuestType === "thai" ? 0 : Number(receivedRow?.total) || 0;
    const status = cleanGuestType === "thai"
      ? "thai_exempt"
      : received >= required ? "passport_complete" : "passport_pending";
    const updatedAt = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO stay_registration_requirements
       (reservation_id, guest_type, required_passports, received_passports, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(reservation_id) DO UPDATE SET
         guest_type = excluded.guest_type,
         required_passports = excluded.required_passports,
         received_passports = excluded.received_passports,
         status = excluded.status,
         updated_at = excluded.updated_at`,
      cleanText(reservationId, 100),
      cleanGuestType,
      required,
      received,
      status,
      updatedAt
    );
    await this.setStayRegistrationStatus(reservationId, status, updatedAt);
    return { ok: true, guestType: cleanGuestType, requiredPassports: required, receivedPassports: received, status };
  }

  async getStayRegistrationStatus(reservationId) {
    const requirement = rows(this.ctx.storage.sql.exec(
      `SELECT guest_type AS guestType, required_passports AS requiredPassports,
              received_passports AS receivedPassports, status, updated_at AS updatedAt
       FROM stay_registration_requirements WHERE reservation_id = ? LIMIT 1`,
      cleanText(reservationId, 100)
    ))[0];
    if (requirement) return requirement;
    return rows(this.ctx.storage.sql.exec(
      "SELECT status, updated_at AS updatedAt FROM stay_registration_status WHERE reservation_id = ? LIMIT 1",
      cleanText(reservationId, 100)
    ))[0] || null;
  }

  async closePendingPassportLinksForReservation(reservationId, nowValue) {
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `UPDATE passport_uploads
       SET status = 'deleted', deleted_at = ?, object_key = ''
       WHERE status = 'pending' AND id IN (
         SELECT passport_id FROM passport_reservation_links WHERE reservation_id = ?
       )`,
      now,
      cleanText(reservationId, 100)
    );
    return { ok: true };
  }

  async getSpareKeyState(reservationId, room) {
    const event = rows(this.ctx.storage.sql.exec(
      `SELECT id, created_at AS createdAt FROM spare_key_events
       WHERE reservation_id = ? AND code_released = 1
       ORDER BY created_at DESC LIMIT 1`,
      cleanText(reservationId, 100)
    ))[0] || null;
    const roomState = rows(this.ctx.storage.sql.exec(
      `SELECT rotation_required AS rotationRequired, last_released_at AS lastReleasedAt,
              last_reservation_id AS lastReservationId,
              rotation_confirmed_at AS rotationConfirmedAt
       FROM spare_key_room_state WHERE room = ? LIMIT 1`,
      cleanText(room, 4)
    ))[0] || null;
    return {
      releasedForReservation: Boolean(event),
      rotationRequired: Boolean(roomState?.rotationRequired),
      lastReleasedAt: roomState?.lastReleasedAt || "",
      lastReservationId: roomState?.lastReservationId || ""
    };
  }

  async recordSpareKeyEvent(record) {
    const now = cleanText(record.createdAt, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_events
       (id, reservation_id, room, event_type, fee_accepted, code_released, alert_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.reservationId, 100),
      cleanText(record.room, 4),
      cleanText(record.eventType, 60),
      record.feeAccepted ? 1 : 0,
      record.codeReleased ? 1 : 0,
      cleanText(record.alertId, 100),
      now
    );
    if (record.codeReleased) {
      this.ctx.storage.sql.exec(
        `INSERT INTO spare_key_room_state
         (room, rotation_required, last_released_at, last_reservation_id,
          rotation_confirmed_at, updated_at)
         VALUES (?, 1, ?, ?, '', ?)
         ON CONFLICT(room) DO UPDATE SET
           rotation_required = 1,
           last_released_at = excluded.last_released_at,
           last_reservation_id = excluded.last_reservation_id,
           rotation_confirmed_at = '',
           updated_at = excluded.updated_at`,
        cleanText(record.room, 4),
        now,
        cleanText(record.reservationId, 100),
        now
      );
    }
    return { ok: true };
  }

  async claimSpareKeyRelease(record) {
    const reservationId = cleanText(record.reservationId, 100);
    const room = cleanText(record.room, 4);
    const roomState = rows(this.ctx.storage.sql.exec(
      "SELECT rotation_required AS rotationRequired FROM spare_key_room_state WHERE room = ? LIMIT 1",
      room
    ))[0];
    if (Boolean(roomState?.rotationRequired)) return { ok: false, error: "key_code_rotation_required" };
    const existing = rows(this.ctx.storage.sql.exec(
      "SELECT id FROM spare_key_events WHERE reservation_id = ? LIMIT 1",
      reservationId
    ))[0];
    if (existing) return { ok: false, error: "spare_key_already_released" };
    const now = cleanText(record.createdAt, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_events
       (id, reservation_id, room, event_type, fee_accepted, code_released, alert_id, created_at)
       VALUES (?, ?, ?, 'notification_pending', 1, 0, '', ?)`,
      cleanText(record.id, 100),
      reservationId,
      room,
      now
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_room_state
       (room, rotation_required, last_released_at, last_reservation_id,
        rotation_confirmed_at, updated_at)
       VALUES (?, 1, '', ?, '', ?)
       ON CONFLICT(room) DO UPDATE SET
         rotation_required = 1,
         last_reservation_id = excluded.last_reservation_id,
         rotation_confirmed_at = '',
         updated_at = excluded.updated_at`,
      room,
      reservationId,
      now
    );
    return { ok: true };
  }

  async finalizeSpareKeyRelease(record) {
    const now = cleanText(record.createdAt, 40) || new Date().toISOString();
    const eventId = cleanText(record.id, 100);
    const reservationId = cleanText(record.reservationId, 100);
    const room = cleanText(record.room, 4);
    const claim = rows(this.ctx.storage.sql.exec(
      `SELECT id FROM spare_key_events
       WHERE id = ? AND reservation_id = ? AND room = ? AND code_released = 0 LIMIT 1`,
      eventId,
      reservationId,
      room
    ))[0];
    if (!claim) return { ok: false, error: "claim_not_found" };
    this.ctx.storage.sql.exec(
      `UPDATE spare_key_events
       SET event_type = 'verified_after_hours_release', code_released = 1, alert_id = ?
       WHERE id = ?`,
      cleanText(record.alertId, 100),
      eventId
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_room_state
       (room, rotation_required, last_released_at, last_reservation_id,
        rotation_confirmed_at, updated_at)
       VALUES (?, 1, ?, ?, '', ?)
       ON CONFLICT(room) DO UPDATE SET
         rotation_required = 1,
         last_released_at = excluded.last_released_at,
         last_reservation_id = excluded.last_reservation_id,
         rotation_confirmed_at = '',
         updated_at = excluded.updated_at`,
      room,
      now,
      reservationId,
      now
    );
    return { ok: true };
  }

  async cancelSpareKeyClaim(id) {
    const claim = rows(this.ctx.storage.sql.exec(
      "SELECT room, reservation_id AS reservationId FROM spare_key_events WHERE id = ? AND code_released = 0 LIMIT 1",
      cleanText(id, 100)
    ))[0];
    this.ctx.storage.sql.exec(
      "DELETE FROM spare_key_events WHERE id = ? AND code_released = 0",
      cleanText(id, 100)
    );
    if (claim) {
      this.ctx.storage.sql.exec(
        `UPDATE spare_key_room_state
         SET rotation_required = 0, last_reservation_id = '', updated_at = ?
         WHERE room = ? AND last_reservation_id = ?`,
        new Date().toISOString(),
        cleanText(claim.room, 4),
        cleanText(claim.reservationId, 100)
      );
    }
    return { ok: true };
  }

  async confirmSpareKeyRotation(room, nowValue) {
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_room_state
       (room, rotation_required, last_released_at, last_reservation_id,
        rotation_confirmed_at, updated_at)
       VALUES (?, 0, '', '', ?, ?)
       ON CONFLICT(room) DO UPDATE SET
         rotation_required = 0,
         rotation_confirmed_at = excluded.rotation_confirmed_at,
         updated_at = excluded.updated_at`,
      cleanText(room, 4),
      now,
      now
    );
    return { ok: true, room, rotationConfirmedAt: now };
  }

  async extendStayReservation(reservationId, checkOutDate, nowValue) {
    const id = cleanText(reservationId, 100);
    const nextCheckout = cleanText(checkOutDate, 10);
    const current = rows(this.ctx.storage.sql.exec(
      `SELECT r.id, r.check_out_date AS synchronizedCheckout,
              CASE WHEN o.check_out_date > r.check_out_date THEN o.check_out_date ELSE r.check_out_date END AS effectiveCheckout
       FROM stay_reservations r
       LEFT JOIN stay_checkout_overrides o ON o.reservation_id = r.id
       WHERE r.id = ? AND r.status = 'confirmed' LIMIT 1`,
      id
    ))[0];
    if (!current) return { ok: false, error: "reservation_not_found" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextCheckout) || nextCheckout <= current.effectiveCheckout) {
      return { ok: false, error: "checkout_must_be_later" };
    }
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO stay_checkout_overrides (reservation_id, check_out_date, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(reservation_id) DO UPDATE SET
         check_out_date = excluded.check_out_date,
         updated_at = excluded.updated_at`,
      id,
      nextCheckout,
      now
    );
    const newCheckoutTime = new Date(`${nextCheckout}T11:00:00+07:00`).getTime();
    for (const session of rows(this.ctx.storage.sql.exec(
      "SELECT id, created_at AS createdAt FROM verified_stay_sessions WHERE reservation_id = ? AND revoked_at = ''",
      id
    ))) {
      const maximumSessionTime = new Date(session.createdAt).getTime() + (30 * 86_400_000);
      const expiresAt = new Date(Math.min(newCheckoutTime, maximumSessionTime)).toISOString();
      this.ctx.storage.sql.exec(
        "UPDATE verified_stay_sessions SET expires_at = ? WHERE id = ?",
        expiresAt,
        session.id
      );
    }
    return { ok: true, reservationId: id, checkOutDate: nextCheckout, updatedAt: now };
  }

  async getStayOperationsOverview() {
    const reservations = rows(this.ctx.storage.sql.exec(
      `SELECT r.id, r.provider, r.room, r.listing_id AS listingId, r.check_in_date AS checkInDate,
              CASE WHEN o.check_out_date > r.check_out_date THEN o.check_out_date ELSE r.check_out_date END AS checkOutDate,
              r.status, r.updated_at AS updatedAt,
              COALESCE(q.status, g.status, 'not_started') AS registrationStatus,
              COALESCE(q.guest_type, '') AS guestType,
              COALESCE(q.required_passports, 0) AS requiredPassports,
              COALESCE(q.received_passports, 0) AS receivedPassports
       FROM stay_reservations r
       LEFT JOIN stay_checkout_overrides o ON o.reservation_id = r.id
       LEFT JOIN stay_registration_status g ON g.reservation_id = r.id
       LEFT JOIN stay_registration_requirements q ON q.reservation_id = r.id
       WHERE r.status = 'confirmed'
         AND (CASE WHEN o.check_out_date > r.check_out_date THEN o.check_out_date ELSE r.check_out_date END) >= date('now', '-1 day')
       ORDER BY r.check_in_date ASC, r.room ASC LIMIT 250`
    ));
    const rotations = rows(this.ctx.storage.sql.exec(
      `SELECT room, rotation_required AS rotationRequired,
              last_released_at AS lastReleasedAt,
              updated_at AS updatedAt,
              rotation_confirmed_at AS rotationConfirmedAt
       FROM spare_key_room_state
       WHERE rotation_required = 1
       ORDER BY updated_at DESC`
    )).map((item) => ({ ...item, rotationRequired: Boolean(item.rotationRequired) }));
    return { reservations, rotations };
  }

  async getTranslations(cacheKeys) {
    const keys = Array.isArray(cacheKeys)
      ? cacheKeys.map((key) => cleanText(key, 100)).filter(Boolean).slice(0, 24)
      : [];
    if (!keys.length) return {};
    const placeholders = keys.map(() => "?").join(",");
    const result = {};
    for (const row of rows(this.ctx.storage.sql.exec(
      `SELECT cache_key AS cacheKey, translation FROM translation_cache WHERE cache_key IN (${placeholders})`,
      ...keys
    ))) {
      result[row.cacheKey] = row.translation;
    }
    return result;
  }

  async saveTranslations(entries) {
    const now = new Date().toISOString();
    for (const entry of Array.isArray(entries) ? entries.slice(0, 24) : []) {
      const cacheKey = cleanText(entry.cacheKey, 100);
      const language = cleanText(entry.language, 12);
      const sourceHash = cleanText(entry.sourceHash, 64);
      const translation = cleanText(entry.translation, 1800);
      if (!cacheKey || !language || !sourceHash || !translation) continue;
      this.ctx.storage.sql.exec(
        `INSERT INTO translation_cache
         (cache_key, language, source_hash, translation, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           translation = excluded.translation,
           updated_at = excluded.updated_at`,
        cacheKey,
        language,
        sourceHash,
        translation,
        now,
        now
      );
    }
    return { ok: true };
  }

  async createPassportUpload(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO passport_uploads
       (id, token_hash, room, status, created_at, arrival_at, expires_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.tokenHash, 100),
      cleanText(record.room, 4),
      cleanText(record.createdAt, 40),
      cleanText(record.arrivalAt, 40),
      cleanText(record.expiresAt, 40)
    );
    return { ok: true };
  }

  async getPassportUploadByTokenHash(tokenHash) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, room, status, arrival_at AS arrivalAt, expires_at AS expiresAt
       FROM passport_uploads WHERE token_hash = ? LIMIT 1`,
      cleanText(tokenHash, 100)
    ))[0] || null;
  }

  async completePassportUpload(record) {
    const now = cleanText(record.uploadedAt, 40);
    const session = rows(this.ctx.storage.sql.exec(
      `SELECT id, room FROM passport_uploads
       WHERE token_hash = ? AND status = 'pending' AND expires_at > ? LIMIT 1`,
      cleanText(record.tokenHash, 100),
      now
    ))[0];
    if (!session) return { ok: false };
    this.ctx.storage.sql.exec(
      `UPDATE passport_uploads SET status = 'uploaded', object_key = ?, media_type = ?,
       extension = ?, size_bytes = ?, uploaded_at = ?, delete_after = ?
       WHERE id = ? AND status = 'pending'`,
      cleanText(record.objectKey, 300),
      cleanText(record.mediaType, 80),
      cleanText(record.extension, 10),
      Number(record.sizeBytes) || 0,
      now,
      cleanText(record.deleteAfter, 40),
      session.id
    );
    return { ok: true, id: session.id, room: session.room };
  }

  async markRegistrationFromPassport(passportId, nowValue) {
    const linked = rows(this.ctx.storage.sql.exec(
      "SELECT reservation_id AS reservationId FROM passport_reservation_links WHERE passport_id = ? LIMIT 1",
      cleanText(passportId, 100)
    ))[0];
    if (!linked) return { ok: false };
    const requirement = rows(this.ctx.storage.sql.exec(
      `SELECT guest_type AS guestType, required_passports AS requiredPassports
       FROM stay_registration_requirements WHERE reservation_id = ? LIMIT 1`,
      cleanText(linked.reservationId, 100)
    ))[0];
    const receivedRow = rows(this.ctx.storage.sql.exec(
      `SELECT COUNT(*) AS total
       FROM passport_reservation_links l
       JOIN passport_uploads p ON p.id = l.passport_id
       WHERE l.reservation_id = ? AND p.status = 'uploaded'`,
      cleanText(linked.reservationId, 100)
    ))[0];
    const received = Number(receivedRow?.total) || 0;
    const required = Number(requirement?.requiredPassports) || 0;
    const status = requirement?.guestType === "foreign" && required > 0 && received >= required
      ? "passport_complete"
      : "passport_pending";
    const updatedAt = cleanText(nowValue, 40) || new Date().toISOString();
    if (requirement) {
      this.ctx.storage.sql.exec(
        `UPDATE stay_registration_requirements
         SET received_passports = ?, status = ?, updated_at = ?
         WHERE reservation_id = ?`,
        received,
        status,
        updatedAt,
        cleanText(linked.reservationId, 100)
      );
    }
    await this.setStayRegistrationStatus(linked.reservationId, status, updatedAt);
    return {
      ok: true,
      reservationId: linked.reservationId,
      status,
      requiredPassports: required,
      receivedPassports: received
    };
  }

  async getPassportUpload(id) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, room, status, object_key AS objectKey, media_type AS mediaType,
              extension, size_bytes AS sizeBytes, uploaded_at AS uploadedAt,
              delete_after AS deleteAfter
       FROM passport_uploads WHERE id = ? LIMIT 1`,
      cleanText(id, 100)
    ))[0] || null;
  }

  async markPassportReminderSent(id) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      "UPDATE passport_uploads SET reminder_sent_at = ? WHERE id = ? AND status = 'pending'",
      now,
      cleanText(id, 100)
    );
    return { ok: true, reminderSentAt: now };
  }

  async deletePassportUpload(id) {
    const record = rows(this.ctx.storage.sql.exec(
      "SELECT object_key AS objectKey FROM passport_uploads WHERE id = ? LIMIT 1",
      cleanText(id, 100)
    ))[0];
    if (!record) return { ok: false };
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `UPDATE passport_uploads SET status = 'deleted', object_key = '', deleted_at = ?
       WHERE id = ?`,
      now,
      cleanText(id, 100)
    );
    return { ok: true, objectKey: record.objectKey || "" };
  }

  async cleanupPassportUploads(nowValue) {
    const now = cleanText(nowValue, 40);
    const expired = rows(this.ctx.storage.sql.exec(
      `SELECT id, object_key AS objectKey FROM passport_uploads
       WHERE (status = 'pending' AND expires_at <= ?)
          OR (status = 'uploaded' AND delete_after != '' AND delete_after <= ?)`,
      now,
      now
    ));
    this.ctx.storage.sql.exec(
      "DELETE FROM passport_uploads WHERE status = 'deleted' AND julianday(deleted_at) < julianday('now', '-30 days')"
    );
    return { records: expired };
  }
}
