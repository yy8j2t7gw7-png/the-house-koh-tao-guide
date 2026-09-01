import { DurableObject } from "cloudflare:workers";

function rows(cursor) {
  return Array.from(cursor || []);
}

function cleanText(value, maximum = 1200) {
  return String(value || "").trim().slice(0, maximum);
}

function formatBangkokAuditTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false
  }).format(value);
}

function cleanBookingRetryText(value, maximum = 1200) {
  return cleanText(value, maximum).replace(
    /(?:\+|00)?\d[\d\s().-]{6,20}\d/g,
    (candidate) => {
      const compact = candidate.trim();
      const digits = compact.replace(/\D/g, "");
      const dateLike = /^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(compact);
      return digits.length >= 8 && digits.length <= 15 && !dateLike ? "[private number]" : candidate;
    }
  ).slice(0, maximum);
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

        CREATE TABLE IF NOT EXISTS whatsapp_delivery_diagnostics (
          id TEXT PRIMARY KEY,
          delivery_id TEXT NOT NULL UNIQUE,
          alert_id TEXT NOT NULL,
          stage TEXT NOT NULL,
          template_name TEXT NOT NULL DEFAULT '',
          language_code TEXT NOT NULL DEFAULT '',
          component_schema TEXT NOT NULL DEFAULT '',
          http_status INTEGER NOT NULL DEFAULT 0,
          error_code TEXT NOT NULL DEFAULT '',
          error_subcode TEXT NOT NULL DEFAULT '',
          error_type TEXT NOT NULL DEFAULT '',
          error_message TEXT NOT NULL DEFAULT '',
          error_details TEXT NOT NULL DEFAULT '',
          trace_id TEXT NOT NULL DEFAULT '',
          failure_kind TEXT NOT NULL DEFAULT 'unknown',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS whatsapp_delivery_diagnostics_created
          ON whatsapp_delivery_diagnostics(created_at);
        CREATE INDEX IF NOT EXISTS whatsapp_delivery_diagnostics_alert
          ON whatsapp_delivery_diagnostics(alert_id, created_at);

        CREATE TABLE IF NOT EXISTS whatsapp_diagnostic_dismissals (
          diagnostic_key TEXT PRIMARY KEY,
          alert_id TEXT NOT NULL,
          dismissed_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS whatsapp_diagnostic_dismissals_alert
          ON whatsapp_diagnostic_dismissals(alert_id, dismissed_at);

        CREATE TABLE IF NOT EXISTS concierge_alert_details (
          alert_id TEXT PRIMARY KEY,
          detail_summary TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS booking_retry_snapshots (
          alert_id TEXT PRIMARY KEY,
          binding_hash TEXT NOT NULL,
          reservation_id TEXT NOT NULL,
          room TEXT NOT NULL,
          kind TEXT NOT NULL,
          activity TEXT NOT NULL,
          preferred_date TEXT NOT NULL DEFAULT '',
          guest_count TEXT NOT NULL DEFAULT '',
          option_value TEXT NOT NULL DEFAULT '',
          course_name TEXT NOT NULL DEFAULT '',
          certification_level TEXT NOT NULL DEFAULT '',
          preferred_provider TEXT NOT NULL DEFAULT '',
          pickup_time TEXT NOT NULL DEFAULT '',
          pickup_location TEXT NOT NULL DEFAULT '',
          destination TEXT NOT NULL DEFAULT '',
          trip_type TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'retryable',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS booking_retry_snapshots_binding
          ON booking_retry_snapshots(binding_hash, reservation_id, room, status, updated_at);
        CREATE INDEX IF NOT EXISTS booking_retry_snapshots_expiry
          ON booking_retry_snapshots(expires_at);

        CREATE TABLE IF NOT EXISTS booking_retry_group_details (
          alert_id TEXT PRIMARY KEY,
          plan_mode TEXT NOT NULL DEFAULT '',
          groups_json TEXT NOT NULL DEFAULT '[]',
          updated_at TEXT NOT NULL
        );

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

        CREATE TABLE IF NOT EXISTS expense_records (
          id TEXT PRIMARY KEY,
          expense_date TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount_minor INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'THB',
          vendor TEXT NOT NULL DEFAULT '',
          payment_method TEXT NOT NULL DEFAULT '',
          room_area TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          receipt_object_key TEXT NOT NULL DEFAULT '',
          receipt_media_type TEXT NOT NULL DEFAULT '',
          receipt_extension TEXT NOT NULL DEFAULT '',
          receipt_size_bytes INTEGER NOT NULL DEFAULT 0,
          created_by_hash TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS expense_records_date
          ON expense_records(expense_date, created_at);
        CREATE INDEX IF NOT EXISTS expense_records_category
          ON expense_records(category, expense_date);

        CREATE TABLE IF NOT EXISTS income_records (
          id TEXT PRIMARY KEY,
          income_date TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          gross_minor INTEGER NOT NULL,
          fees_minor INTEGER NOT NULL DEFAULT 0,
          net_minor INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'THB',
          unit TEXT NOT NULL DEFAULT '',
          payment_method TEXT NOT NULL DEFAULT '',
          reference TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_by_hash TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS income_records_date
          ON income_records(income_date, created_at);
        CREATE INDEX IF NOT EXISTS income_records_category
          ON income_records(category, income_date);
        CREATE INDEX IF NOT EXISTS income_records_unit
          ON income_records(unit, income_date);

        CREATE TABLE IF NOT EXISTS admin_operation_audit (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          reference TEXT NOT NULL,
          bangkok_time TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS admin_operation_audit_created
          ON admin_operation_audit(created_at);

        CREATE TABLE IF NOT EXISTS stay_reservations (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL DEFAULT 'airbnb',
          listing_id TEXT NOT NULL,
          room TEXT NOT NULL,
          confirmation_code_hash TEXT NOT NULL UNIQUE,
          guest_first_name TEXT NOT NULL DEFAULT '',
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
          request_hash TEXT NOT NULL DEFAULT '',
          alert_id TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS spare_key_events_reservation
          ON spare_key_events(reservation_id, created_at);
        DROP INDEX IF EXISTS spare_key_events_single_claim;

        CREATE TABLE IF NOT EXISTS spare_key_room_state (
          room TEXT PRIMARY KEY,
          rotation_required INTEGER NOT NULL DEFAULT 0,
          last_released_at TEXT NOT NULL DEFAULT '',
          last_reservation_id TEXT NOT NULL DEFAULT '',
          rotation_confirmed_at TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL
        );
      `);
      try {
        this.ctx.storage.sql.exec("ALTER TABLE stay_reservations ADD COLUMN guest_first_name TEXT NOT NULL DEFAULT ''");
      } catch (_error) {
        // Existing deployments already have the column after the first v5.11.5 initialization.
      }
      try {
        this.ctx.storage.sql.exec("ALTER TABLE spare_key_events ADD COLUMN request_hash TEXT NOT NULL DEFAULT ''");
      } catch (_error) {
        // Fresh databases and upgraded deployments already have this release-bound request column.
      }
      this.ctx.storage.sql.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS spare_key_events_request ON spare_key_events(request_hash) WHERE request_hash <> ''"
      );
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
             COALESCE(NULLIF(xd.detail_summary, ''), a.summary) AS detailSummary,
             a.bangkok_time AS bangkokTime, a.status, a.created_at AS createdAt,
             a.acknowledged_at AS acknowledgedAt, a.resolved_at AS resolvedAt,
             a.escalation_due_at AS escalationDueAt, a.escalated_at AS escalatedAt,
             SUM(CASE WHEN d.status <> 'not_configured' THEN 1 ELSE 0 END) AS attempted,
             SUM(CASE WHEN d.status IN ('accepted', 'sent', 'delivered', 'read') THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM concierge_alerts a
      LEFT JOIN concierge_alert_deliveries d ON d.alert_id = a.id
      LEFT JOIN concierge_alert_details xd ON xd.alert_id = a.id
      WHERE a.status IN ('open', 'acknowledged')
      GROUP BY a.id
      ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
               a.created_at DESC
      LIMIT 100
    `));
    const deliveryDiagnostics = rows(this.ctx.storage.sql.exec(`
      SELECT COALESCE(x.id, 'legacy_' || d.id) AS id,
             d.id AS deliveryId, d.alert_id AS alertId, COALESCE(a.status, '') AS alertStatus,
             d.stage, d.status,
             d.error_code AS storedErrorCode, d.created_at AS createdAt,
             x.template_name AS templateName, x.language_code AS languageCode,
             x.component_schema AS componentSchema, x.http_status AS httpStatus,
             x.error_code AS errorCode, x.error_subcode AS errorSubcode,
             x.error_type AS errorType, x.error_message AS errorMessage,
             x.error_details AS errorDetails, x.trace_id AS traceId,
             x.failure_kind AS failureKind,
             CASE WHEN x.id IS NULL THEN 1 ELSE 0 END AS legacyDiagnostic
      FROM concierge_alert_deliveries d
      LEFT JOIN whatsapp_delivery_diagnostics x ON x.delivery_id = d.id
      LEFT JOIN concierge_alerts a ON a.id = d.alert_id
      WHERE d.status IN ('failed', 'not_configured')
        AND julianday(d.created_at) >= julianday('now', '-30 days')
        AND NOT EXISTS (
          SELECT 1 FROM whatsapp_diagnostic_dismissals z
          WHERE z.diagnostic_key = COALESCE(x.id, 'legacy_' || d.id)
        )
      ORDER BY d.created_at DESC
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
        attempted: Number(alert.attempted) || 0,
        delivered: Number(alert.delivered) || 0,
        failed: Number(alert.failed) || 0
      })),
      deliveryDiagnostics: deliveryDiagnostics.map((item) => ({
        ...item,
        httpStatus: Number(item.httpStatus) || 0,
        legacyDiagnostic: Boolean(item.legacyDiagnostic)
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
              escalation_due_at AS escalationDueAt, escalated_at AS escalatedAt,
              (SELECT COUNT(*) FROM concierge_alert_deliveries d
               WHERE d.alert_id = concierge_alerts.id) AS deliveryAttempts,
              (SELECT COUNT(*) FROM concierge_alert_deliveries d
               WHERE d.alert_id = concierge_alerts.id
                 AND d.status IN ('accepted', 'sent', 'delivered', 'read')) AS acceptedDeliveries
       FROM concierge_alerts
       WHERE dedupe_key = ? AND status IN ('open', 'acknowledged')
         AND julianday(created_at) >= julianday(?, '-5 minutes')
       ORDER BY created_at DESC LIMIT 1`,
      dedupeKey,
      createdAt
    ))[0];
    if (existing) {
      return {
        created: false,
        alert: {
          ...existing,
          roomVerified: Boolean(existing.roomVerified),
          deliveryAttempts: Number(existing.deliveryAttempts) || 0,
          acceptedDeliveries: Number(existing.acceptedDeliveries) || 0
        }
      };
    }

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
    const detailSummary = cleanText(record.detailSummary, 6000);
    if (detailSummary) {
      this.ctx.storage.sql.exec(
        `INSERT OR REPLACE INTO concierge_alert_details
         (alert_id, detail_summary, created_at) VALUES (?, ?, ?)`,
        cleanText(record.id, 100),
        detailSummary,
        createdAt
      );
    }
    this.ctx.storage.sql.exec(
      "DELETE FROM concierge_alert_deliveries WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM whatsapp_delivery_diagnostics WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM concierge_alerts WHERE julianday(created_at) < julianday('now', '-30 days')"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM concierge_alert_details WHERE alert_id NOT IN (SELECT id FROM concierge_alerts)"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM whatsapp_diagnostic_dismissals WHERE alert_id NOT IN (SELECT id FROM concierge_alerts)"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM admin_operation_audit WHERE julianday(created_at) < julianday('now', '-90 days')"
    );
    return { created: true };
  }

  async upsertBookingRetrySnapshot(record) {
    const alertId = cleanText(record.alertId, 100);
    const bindingHash = cleanText(record.bindingHash, 100);
    const reservationId = cleanText(record.reservationId, 100);
    const room = cleanText(record.room, 4);
    const kind = cleanText(record.kind, 40);
    const createdAt = cleanText(record.createdAt, 40) || new Date().toISOString();
    const updatedAt = cleanText(record.updatedAt, 40) || createdAt;
    const expiresAt = cleanText(record.expiresAt, 40);
    if (!alertId || !bindingHash || !reservationId || !room || !kind || !expiresAt) return { ok: false };
    this.ctx.storage.sql.exec(
      `INSERT INTO booking_retry_snapshots
       (alert_id, binding_hash, reservation_id, room, kind, activity, preferred_date,
        guest_count, option_value, course_name, certification_level, preferred_provider,
        pickup_time, pickup_location, destination, trip_type, notes, status,
        created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'retryable', ?, ?, ?)
       ON CONFLICT(alert_id) DO UPDATE SET
         activity = excluded.activity,
         preferred_date = excluded.preferred_date,
         guest_count = excluded.guest_count,
         option_value = excluded.option_value,
         course_name = excluded.course_name,
         certification_level = excluded.certification_level,
         preferred_provider = excluded.preferred_provider,
         pickup_time = excluded.pickup_time,
         pickup_location = excluded.pickup_location,
         destination = excluded.destination,
         trip_type = excluded.trip_type,
         notes = excluded.notes,
         status = 'retryable',
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at
       WHERE booking_retry_snapshots.binding_hash = excluded.binding_hash
         AND booking_retry_snapshots.reservation_id = excluded.reservation_id
         AND booking_retry_snapshots.room = excluded.room`,
      alertId,
      bindingHash,
      reservationId,
      room,
      kind,
      cleanBookingRetryText(record.activity, 80),
      cleanBookingRetryText(record.preferredDate, 120),
      cleanText(record.guestCount, 4),
      cleanBookingRetryText(record.option, 120),
      cleanBookingRetryText(record.courseName, 120),
      cleanBookingRetryText(record.certificationLevel, 120),
      cleanBookingRetryText(record.preferredProvider, 120),
      cleanBookingRetryText(record.pickupTime, 60),
      cleanBookingRetryText(record.pickupLocation, 160),
      cleanBookingRetryText(record.destination, 160),
      cleanBookingRetryText(record.tripType, 60),
      cleanBookingRetryText(record.notes, 500),
      createdAt,
      updatedAt,
      expiresAt
    );
    let groupsJson = "[]";
    try {
      const serialized = JSON.stringify(Array.isArray(record.groups) ? record.groups : []);
      groupsJson = cleanBookingRetryText(serialized, 8000) || "[]";
      JSON.parse(groupsJson);
    } catch (_error) {
      groupsJson = "[]";
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO booking_retry_group_details (alert_id, plan_mode, groups_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(alert_id) DO UPDATE SET
         plan_mode = excluded.plan_mode,
         groups_json = excluded.groups_json,
         updated_at = excluded.updated_at`,
      alertId,
      ["same", "different"].includes(record.planMode) ? record.planMode : "",
      groupsJson,
      updatedAt
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM booking_retry_snapshots WHERE julianday(expires_at) <= julianday('now') OR julianday(created_at) < julianday('now', '-30 days')"
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM booking_retry_group_details WHERE alert_id NOT IN (SELECT alert_id FROM booking_retry_snapshots)"
    );
    return { ok: true, alertId };
  }

  async getBookingRetrySnapshots(bindingHash, reservationId, room, nowValue) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT b.alert_id AS alertId, b.room, b.kind, b.activity,
              b.preferred_date AS preferredDate, b.guest_count AS guestCount,
              b.option_value AS option, b.course_name AS courseName,
              b.certification_level AS certificationLevel,
              b.preferred_provider AS preferredProvider, b.pickup_time AS pickupTime,
              b.pickup_location AS pickupLocation, b.destination, b.trip_type AS tripType,
              b.notes, b.status, b.created_at AS createdAt, b.updated_at AS updatedAt,
              COALESCE(g.plan_mode, '') AS planMode,
              COALESCE(g.groups_json, '[]') AS groupsJson,
              b.expires_at AS expiresAt,
              (SELECT COUNT(*) FROM concierge_alert_deliveries d
               WHERE d.alert_id = b.alert_id) AS deliveryAttempts,
              (SELECT COUNT(*) FROM concierge_alert_deliveries d
               WHERE d.alert_id = b.alert_id
                 AND d.status IN ('accepted', 'sent', 'delivered', 'read')) AS acceptedDeliveries
       FROM booking_retry_snapshots b
       LEFT JOIN booking_retry_group_details g ON g.alert_id = b.alert_id
       JOIN concierge_alerts a ON a.id = b.alert_id
       WHERE b.binding_hash = ? AND b.reservation_id = ? AND b.room = ?
         AND b.status IN ('retryable', 'submitted')
         AND a.alert_type = 'booking_request'
         AND a.status IN ('open', 'acknowledged')
         AND julianday(b.expires_at) > julianday(?)
       ORDER BY b.updated_at DESC, b.created_at DESC
       LIMIT 10`,
      cleanText(bindingHash, 100),
      cleanText(reservationId, 100),
      cleanText(room, 4),
      cleanText(nowValue, 40) || new Date().toISOString()
    )).map((record) => {
      let groups = [];
      try {
        const parsed = JSON.parse(record.groupsJson || "[]");
        groups = Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        groups = [];
      }
      const { groupsJson, ...safeRecord } = record;
      return {
        ...safeRecord,
        groups,
        deliveryAttempts: Number(record.deliveryAttempts) || 0,
        acceptedDeliveries: Number(record.acceptedDeliveries) || 0
      };
    });
  }

  async setBookingRetrySnapshotStatus(alertId, bindingHash, status, updatedAt) {
    const nextStatus = status === "submitted" ? "submitted" : status === "cancelled" ? "cancelled" : "retryable";
    this.ctx.storage.sql.exec(
      `UPDATE booking_retry_snapshots SET status = ?, updated_at = ?
       WHERE alert_id = ? AND binding_hash = ?`,
      nextStatus,
      cleanText(updatedAt, 40) || new Date().toISOString(),
      cleanText(alertId, 100),
      cleanText(bindingHash, 100)
    );
    return { ok: true };
  }

  async getBookingAlertForRetry(alertId) {
    const record = rows(this.ctx.storage.sql.exec(
      `SELECT a.id, a.interaction_id AS interactionId, a.severity,
              a.alert_type AS alertType, a.recipient_group AS recipientGroup,
              a.room, a.room_verified AS roomVerified, a.summary,
              a.bangkok_time AS bangkokTime, a.status, a.created_at AS createdAt,
              a.escalation_due_at AS escalationDueAt, a.escalated_at AS escalatedAt,
              (SELECT COUNT(*) FROM concierge_alert_deliveries d
               WHERE d.alert_id = a.id) AS deliveryAttempts,
              (SELECT COUNT(*) FROM concierge_alert_deliveries d
               WHERE d.alert_id = a.id
                 AND d.status IN ('accepted', 'sent', 'delivered', 'read')) AS acceptedDeliveries
       FROM concierge_alerts a
       WHERE a.id = ? AND a.alert_type = 'booking_request'
         AND a.status IN ('open', 'acknowledged')
       LIMIT 1`,
      cleanText(alertId, 100)
    ))[0];
    return record ? {
      ...record,
      roomVerified: Boolean(record.roomVerified),
      deliveryAttempts: Number(record.deliveryAttempts) || 0,
      acceptedDeliveries: Number(record.acceptedDeliveries) || 0
    } : null;
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

  async createExpense(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO expense_records
       (id, expense_date, category, description, amount_minor, currency, vendor, payment_method,
        room_area, notes, receipt_object_key, receipt_media_type, receipt_extension,
        receipt_size_bytes, created_by_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.expenseDate, 10),
      cleanText(record.category, 40),
      cleanText(record.description, 240),
      Math.max(1, Math.round(Number(record.amountMinor) || 0)),
      cleanText(record.currency, 3) || "THB",
      cleanText(record.vendor, 160),
      cleanText(record.paymentMethod, 40),
      cleanText(record.roomArea, 80),
      cleanText(record.notes, 500),
      cleanText(record.receiptObjectKey, 400),
      cleanText(record.receiptMediaType, 80),
      cleanText(record.receiptExtension, 12),
      Math.max(0, Math.round(Number(record.receiptSizeBytes) || 0)),
      cleanText(record.actorHash, 100),
      cleanText(record.createdAt, 40) || new Date().toISOString()
    );
    await this.recordAdminAudit("expense_created", `expense:${cleanText(record.id, 100)}`, record.createdAt);
    return { ok: true };
  }

  async listExpenses(month) {
    const prefix = cleanText(month, 7);
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, expense_date AS expenseDate, category, description,
              amount_minor AS amountMinor, currency, vendor, payment_method AS paymentMethod,
              room_area AS roomArea, notes, receipt_object_key AS receiptObjectKey,
              receipt_media_type AS receiptMediaType, receipt_extension AS receiptExtension,
              receipt_size_bytes AS receiptSizeBytes, created_at AS createdAt
       FROM expense_records
       WHERE substr(expense_date, 1, 7) = ?
       ORDER BY expense_date DESC, created_at DESC
       LIMIT 1000`,
      prefix
    )).map((record) => ({ ...record, hasReceipt: Boolean(record.receiptObjectKey) }));
  }

  async getExpense(id) {
    const record = rows(this.ctx.storage.sql.exec(
      `SELECT id, expense_date AS expenseDate, category, description,
              amount_minor AS amountMinor, currency, vendor, payment_method AS paymentMethod,
              room_area AS roomArea, notes, receipt_object_key AS receiptObjectKey,
              receipt_media_type AS receiptMediaType, receipt_extension AS receiptExtension,
              receipt_size_bytes AS receiptSizeBytes, created_at AS createdAt
       FROM expense_records WHERE id = ? LIMIT 1`,
      cleanText(id, 100)
    ))[0] || null;
    return record ? { ...record, hasReceipt: Boolean(record.receiptObjectKey) } : null;
  }

  async findExpenseDuplicates(expenseDate, amountMinor, vendor, currency = "THB") {
    const date = cleanText(expenseDate, 10);
    const amount = Math.round(Number(amountMinor) || 0);
    const vendorValue = cleanText(vendor, 160).toLowerCase();
    const currencyValue = cleanText(currency, 3) || "THB";
    if (!date || !amount) return [];
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, expense_date AS expenseDate, category, description,
              amount_minor AS amountMinor, currency, vendor, created_at AS createdAt
       FROM expense_records
       WHERE expense_date = ? AND amount_minor = ? AND currency = ?
         AND (? = '' OR lower(vendor) = ?)
       ORDER BY created_at DESC
       LIMIT 5`,
      date,
      amount,
      currencyValue,
      vendorValue,
      vendorValue
    ));
  }

  async deleteExpense(id, actorHash, nowValue) {
    const expenseId = cleanText(id, 100);
    const exists = rows(this.ctx.storage.sql.exec(
      "SELECT id FROM expense_records WHERE id = ? LIMIT 1",
      expenseId
    ))[0];
    if (!exists) return { ok: false, error: "not_found" };
    this.ctx.storage.sql.exec("DELETE FROM expense_records WHERE id = ?", expenseId);
    await this.recordAdminAudit("expense_deleted", `expense:${expenseId}`, nowValue);
    return { ok: true, deleted: true };
  }

  async createIncome(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO income_records
       (id, income_date, category, description, gross_minor, fees_minor, net_minor, currency,
        unit, payment_method, reference, notes, created_by_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.incomeDate, 10),
      cleanText(record.category, 40),
      cleanText(record.description, 240),
      Math.max(1, Math.round(Number(record.grossMinor) || 0)),
      Math.max(0, Math.round(Number(record.feesMinor) || 0)),
      Math.max(0, Math.round(Number(record.netMinor) || 0)),
      cleanText(record.currency, 3) || "THB",
      cleanText(record.unit, 80),
      cleanText(record.paymentMethod, 40),
      cleanText(record.reference, 120),
      cleanText(record.notes, 500),
      cleanText(record.actorHash, 100),
      cleanText(record.createdAt, 40) || new Date().toISOString()
    );
    await this.recordAdminAudit("income_created", `income:${cleanText(record.id, 100)}`, record.createdAt);
    return { ok: true };
  }

  async listIncome(month) {
    const prefix = cleanText(month, 7);
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, income_date AS incomeDate, category, description,
              gross_minor AS grossMinor, fees_minor AS feesMinor, net_minor AS netMinor, currency,
              unit, payment_method AS paymentMethod, reference, notes, created_at AS createdAt
       FROM income_records
       WHERE substr(income_date, 1, 7) = ?
       ORDER BY income_date DESC, created_at DESC
       LIMIT 1000`,
      prefix
    ));
  }

  async getIncome(id) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, income_date AS incomeDate, category, description,
              gross_minor AS grossMinor, fees_minor AS feesMinor, net_minor AS netMinor, currency,
              unit, payment_method AS paymentMethod, reference, notes, created_at AS createdAt
       FROM income_records WHERE id = ? LIMIT 1`,
      cleanText(id, 100)
    ))[0] || null;
  }

  async findIncomeDuplicates(incomeDate, grossMinor, unit, reference, currency = "THB") {
    const date = cleanText(incomeDate, 10);
    const gross = Math.round(Number(grossMinor) || 0);
    const unitValue = cleanText(unit, 80).toLowerCase();
    const referenceValue = cleanText(reference, 120).toLowerCase();
    const currencyValue = cleanText(currency, 3) || "THB";
    if (!date || !gross) return [];
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, income_date AS incomeDate, category, description,
              gross_minor AS grossMinor, fees_minor AS feesMinor, net_minor AS netMinor, currency, unit, reference, created_at AS createdAt
       FROM income_records
       WHERE income_date = ? AND gross_minor = ? AND currency = ?
         AND (? = '' OR lower(unit) = ?)
         AND (? = '' OR lower(reference) = ?)
       ORDER BY created_at DESC
       LIMIT 5`,
      date, gross, currencyValue, unitValue, unitValue, referenceValue, referenceValue
    ));
  }

  async deleteIncome(id, actorHash, nowValue) {
    const incomeId = cleanText(id, 100);
    const exists = rows(this.ctx.storage.sql.exec(
      "SELECT id FROM income_records WHERE id = ? LIMIT 1",
      incomeId
    ))[0];
    if (!exists) return { ok: false, error: "not_found" };
    this.ctx.storage.sql.exec("DELETE FROM income_records WHERE id = ?", incomeId);
    await this.recordAdminAudit("income_deleted", `income:${incomeId}`, nowValue);
    return { ok: true, deleted: true };
  }

  async recordAdminAudit(action, reference, nowValue) {
    const createdAt = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO admin_operation_audit (id, action, reference, bangkok_time, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      `audit_${crypto.randomUUID()}`,
      cleanText(action, 80),
      cleanText(reference, 120),
      formatBangkokAuditTime(new Date(createdAt)),
      createdAt
    );
    return { ok: true };
  }

  async resolveMaintenanceReport(id, actorHash, nowValue) {
    const reportId = cleanText(id, 100);
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    const record = rows(this.ctx.storage.sql.exec(
      `SELECT id, room, alert_id AS alertId, status, created_at AS createdAt
       FROM maintenance_reports WHERE id = ? LIMIT 1`,
      reportId
    ))[0];
    if (!record) return { ok: false, error: "not_found" };
    if (record.status === "resolved") return { ok: true, status: "resolved", unchanged: true };
    if (!["open", "acknowledged"].includes(record.status)) return { ok: false, error: "invalid_status" };
    this.ctx.storage.sql.exec(
      `UPDATE maintenance_reports
       SET status = 'resolved', resolved_at = ?, delete_after = ?
       WHERE id = ? AND status IN ('open', 'acknowledged')`,
      now,
      now,
      reportId
    );
    if (record.alertId) {
      this.ctx.storage.sql.exec(
        `UPDATE concierge_alerts
         SET status = 'resolved', resolved_at = ?, resolved_by_hash = ?
         WHERE id = ? AND status IN ('open', 'acknowledged')`,
        now,
        cleanText(actorHash, 100),
        cleanText(record.alertId, 100)
      );
    }
    await this.recordAdminAudit("maintenance_report_resolved", `maintenance:${reportId}`, now);
    return { ok: true, status: "resolved" };
  }

  async removeMaintenanceReport(id, nowValue) {
    const reportId = cleanText(id, 100);
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    const record = rows(this.ctx.storage.sql.exec(
      `SELECT id, status FROM maintenance_reports WHERE id = ? LIMIT 1`,
      reportId
    ))[0];
    if (!record) return { ok: false, error: "not_found" };
    if (record.status !== "resolved") return { ok: false, error: "resolve_required" };
    this.ctx.storage.sql.exec("DELETE FROM maintenance_reports WHERE id = ? AND status = 'resolved'", reportId);
    await this.recordAdminAudit("maintenance_report_removed", `maintenance:${reportId}`, now);
    return { ok: true, removed: true };
  }

  async dismissWhatsAppDiagnostic(diagnosticKey, nowValue) {
    const key = cleanText(diagnosticKey, 120);
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    const record = rows(this.ctx.storage.sql.exec(
      `SELECT COALESCE(x.id, 'legacy_' || d.id) AS diagnosticKey, d.alert_id AS alertId
       FROM concierge_alert_deliveries d
       LEFT JOIN whatsapp_delivery_diagnostics x ON x.delivery_id = d.id
       WHERE COALESCE(x.id, 'legacy_' || d.id) = ?
         AND d.status IN ('failed', 'not_configured')
       LIMIT 1`,
      key
    ))[0];
    if (!record) return { ok: false, error: "not_found" };
    this.ctx.storage.sql.exec(
      `INSERT OR IGNORE INTO whatsapp_diagnostic_dismissals
       (diagnostic_key, alert_id, dismissed_at) VALUES (?, ?, ?)`,
      key,
      cleanText(record.alertId, 100),
      now
    );
    await this.recordAdminAudit("whatsapp_diagnostic_dismissed", `alert:${record.alertId}`, now);
    return { ok: true, dismissed: true };
  }

  async clearWhatsAppDiagnosticsForAlert(alertId, nowValue) {
    const id = cleanText(alertId, 100);
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    const alert = rows(this.ctx.storage.sql.exec(
      "SELECT id, status FROM concierge_alerts WHERE id = ? LIMIT 1",
      id
    ))[0];
    if (!alert) return { ok: false, error: "not_found" };
    if (alert.status !== "resolved") return { ok: false, error: "alert_not_resolved" };
    const diagnostics = rows(this.ctx.storage.sql.exec(
      `SELECT COALESCE(x.id, 'legacy_' || d.id) AS diagnosticKey
       FROM concierge_alert_deliveries d
       LEFT JOIN whatsapp_delivery_diagnostics x ON x.delivery_id = d.id
       WHERE d.alert_id = ? AND d.status IN ('failed', 'not_configured')`,
      id
    ));
    diagnostics.forEach((item) => {
      this.ctx.storage.sql.exec(
        `INSERT OR IGNORE INTO whatsapp_diagnostic_dismissals
         (diagnostic_key, alert_id, dismissed_at) VALUES (?, ?, ?)`,
        cleanText(item.diagnosticKey, 120),
        id,
        now
      );
    });
    if (diagnostics.length) await this.recordAdminAudit("whatsapp_alert_diagnostics_cleared", `alert:${id}`, now);
    return { ok: true, cleared: diagnostics.length };
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

  async recordWhatsAppDiagnostic(record) {
    const createdAt = cleanText(record.createdAt, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO whatsapp_delivery_diagnostics
       (id, delivery_id, alert_id, stage, template_name, language_code,
        component_schema, http_status, error_code, error_subcode, error_type,
        error_message, error_details, trace_id, failure_kind, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cleanText(record.id, 100),
      cleanText(record.deliveryId, 100),
      cleanText(record.alertId, 100),
      cleanText(record.stage, 30),
      cleanText(record.templateName, 160),
      cleanText(record.languageCode, 30),
      cleanText(record.componentSchema, 300),
      Number(record.httpStatus) || 0,
      cleanText(record.errorCode, 80),
      cleanText(record.errorSubcode, 80),
      cleanText(record.errorType, 120),
      cleanText(record.errorMessage, 600),
      cleanText(record.errorDetails, 600),
      cleanText(record.traceId, 180),
      cleanText(record.failureKind, 80) || "unknown",
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

  async getAlert(id) {
    return rows(this.ctx.storage.sql.exec(
      `SELECT id, severity, alert_type AS alertType, recipient_group AS recipientGroup, room,
              room_verified AS roomVerified, summary, bangkok_time AS bangkokTime, status,
              created_at AS createdAt, escalation_due_at AS escalationDueAt, escalated_at AS escalatedAt
       FROM concierge_alerts WHERE id = ? LIMIT 1`, cleanText(id, 100)
    ))[0] || null;
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
         (id, provider, listing_id, room, confirmation_code_hash, guest_first_name, check_in_date,
          check_out_date, status, source_ref_hash, last_seen_sync, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(confirmation_code_hash) DO UPDATE SET
           provider = excluded.provider,
           listing_id = excluded.listing_id,
           room = excluded.room,
           guest_first_name = CASE WHEN excluded.guest_first_name != '' THEN excluded.guest_first_name ELSE stay_reservations.guest_first_name END,
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
        cleanText(record.guestFirstName, 40),
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
      `SELECT id, provider, listing_id AS listingId, room, guest_first_name AS guestFirstName,
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
              s.expires_at AS expiresAt, r.provider, r.listing_id AS listingId, r.guest_first_name AS guestFirstName,
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

  async startInPersonRegistration(reservationId, requiredPassports, nowValue) {
    const cleanReservationId = cleanText(reservationId, 100);
    const required = Number(requiredPassports);
    if (!Number.isInteger(required) || required < 1 || required > 10) {
      return { ok: false, error: "invalid_non_thai_guest_count" };
    }
    const reservation = rows(this.ctx.storage.sql.exec(
      "SELECT id FROM stay_reservations WHERE id = ? AND status = 'confirmed' LIMIT 1",
      cleanReservationId
    ))[0];
    if (!reservation) return { ok: false, error: "reservation_not_found" };

    const current = rows(this.ctx.storage.sql.exec(
      `SELECT guest_type AS guestType, required_passports AS requiredPassports,
              received_passports AS receivedPassports, status
       FROM stay_registration_requirements WHERE reservation_id = ? LIMIT 1`,
      cleanReservationId
    ))[0];
    const receivedRow = rows(this.ctx.storage.sql.exec(
      `SELECT COUNT(*) AS total
       FROM passport_reservation_links l
       JOIN passport_uploads p ON p.id = l.passport_id
       WHERE l.reservation_id = ? AND p.status = 'uploaded'`,
      cleanReservationId
    ))[0];
    const received = Math.max(Number(current?.receivedPassports) || 0, Number(receivedRow?.total) || 0);
    if (received > 0 || current?.status === "passport_complete" || current?.status === "in_person_complete") {
      return { ok: false, error: "registration_evidence_exists" };
    }

    const updatedAt = cleanText(nowValue, 40) || new Date().toISOString();
    await this.closePendingPassportLinksForReservation(cleanReservationId, updatedAt);
    this.ctx.storage.sql.exec(
      `INSERT INTO stay_registration_requirements
       (reservation_id, guest_type, required_passports, received_passports, status, updated_at)
       VALUES (?, 'foreign', ?, 0, 'in_person_pending', ?)
       ON CONFLICT(reservation_id) DO UPDATE SET
         guest_type = 'foreign',
         required_passports = excluded.required_passports,
         received_passports = 0,
         status = 'in_person_pending',
         updated_at = excluded.updated_at`,
      cleanReservationId,
      required,
      updatedAt
    );
    await this.setStayRegistrationStatus(cleanReservationId, "in_person_pending", updatedAt);
    return {
      ok: true,
      guestType: "foreign",
      requiredPassports: required,
      receivedPassports: 0,
      status: "in_person_pending",
      updatedAt
    };
  }

  async setInPersonRegistrationStatus(reservationId, status, nowValue) {
    const nextStatus = status === "in_person_complete" ? "in_person_complete"
      : status === "in_person_pending" ? "in_person_pending" : "";
    if (!nextStatus) return { ok: false, error: "invalid_registration_status" };
    const cleanReservationId = cleanText(reservationId, 100);
    const current = rows(this.ctx.storage.sql.exec(
      `SELECT guest_type AS guestType, required_passports AS requiredPassports,
              received_passports AS receivedPassports, status
       FROM stay_registration_requirements WHERE reservation_id = ? LIMIT 1`,
      cleanReservationId
    ))[0];
    if (!current || current.guestType !== "foreign" || Number(current.requiredPassports) < 1) {
      return { ok: false, error: "foreign_registration_required" };
    }
    if (nextStatus === "in_person_complete" && current.status !== "in_person_pending") {
      return { ok: false, error: "in_person_handover_not_requested" };
    }
    const updatedAt = cleanText(nowValue, 40) || new Date().toISOString();
    this.ctx.storage.sql.exec(
      `UPDATE stay_registration_requirements SET status = ?, updated_at = ?
       WHERE reservation_id = ?`,
      nextStatus,
      updatedAt,
      cleanReservationId
    );
    await this.setStayRegistrationStatus(cleanReservationId, nextStatus, updatedAt);
    return {
      ok: true,
      guestType: current.guestType,
      requiredPassports: Number(current.requiredPassports) || 0,
      receivedPassports: Number(current.receivedPassports) || 0,
      status: nextStatus,
      updatedAt
    };
  }

  async resetPendingInPersonRegistration(reservationId, nowValue) {
    const cleanReservationId = cleanText(reservationId, 100);
    const current = rows(this.ctx.storage.sql.exec(
      `SELECT guest_type AS guestType, required_passports AS requiredPassports,
              received_passports AS receivedPassports, status
       FROM stay_registration_requirements WHERE reservation_id = ? LIMIT 1`,
      cleanReservationId
    ))[0];
    if (!current || current.status !== "in_person_pending") {
      return { ok: false, error: "in_person_handover_not_pending" };
    }
    const receivedRow = rows(this.ctx.storage.sql.exec(
      `SELECT COUNT(*) AS total
       FROM passport_reservation_links l
       JOIN passport_uploads p ON p.id = l.passport_id
       WHERE l.reservation_id = ? AND p.status = 'uploaded'`,
      cleanReservationId
    ))[0];
    const received = Math.max(Number(current.receivedPassports) || 0, Number(receivedRow?.total) || 0);
    if (received > 0) return { ok: false, error: "registration_reset_requires_staff_review" };

    const updatedAt = cleanText(nowValue, 40) || new Date().toISOString();
    await this.closePendingPassportLinksForReservation(cleanReservationId, updatedAt);
    this.ctx.storage.sql.exec(
      "DELETE FROM stay_registration_requirements WHERE reservation_id = ?",
      cleanReservationId
    );
    await this.setStayRegistrationStatus(cleanReservationId, "not_started", updatedAt);
    return { ok: true, status: "not_started", updatedAt };
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
      releasedForReservation: Boolean(event) && Boolean(roomState?.rotationRequired),
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
    const requestHash = cleanText(record.requestHash, 100);
    if (!requestHash) return { ok: false, error: "lost_key_request_required" };
    const usedRequest = rows(this.ctx.storage.sql.exec(
      "SELECT id FROM spare_key_events WHERE request_hash = ? LIMIT 1",
      requestHash
    ))[0];
    if (usedRequest) return { ok: false, error: "lost_key_request_used" };
    const roomState = rows(this.ctx.storage.sql.exec(
      "SELECT rotation_required AS rotationRequired FROM spare_key_room_state WHERE room = ? LIMIT 1",
      room
    ))[0];
    if (Boolean(roomState?.rotationRequired)) return { ok: false, error: "key_code_rotation_required" };
    const now = cleanText(record.createdAt, 40) || new Date().toISOString();
    // A fresh explicitly accepted request supersedes an abandoned, undisplayed
    // request for the same room. Keep the old request hash as a permanent used
    // marker so its historical acceptance can never authorize a later release.
    this.ctx.storage.sql.exec(
      `UPDATE spare_key_events SET event_type = 'superseded'
       WHERE room = ? AND code_released = 0
         AND event_type IN ('notification_pending', 'notification_accepted')`,
      room
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_events
       (id, reservation_id, room, event_type, fee_accepted, code_released, request_hash, alert_id, created_at)
       VALUES (?, ?, ?, 'notification_pending', 1, 0, ?, '', ?)`,
      cleanText(record.id, 100),
      reservationId,
      room,
      requestHash,
      now
    );
    return { ok: true };
  }

  async authorizeSpareKeyView(record) {
    const eventId = cleanText(record.id, 100);
    const reservationId = cleanText(record.reservationId, 100);
    const room = cleanText(record.room, 4);
    const requestHash = cleanText(record.requestHash, 100);
    this.ctx.storage.sql.exec(
      `UPDATE spare_key_events
       SET event_type = 'notification_accepted', alert_id = ?
       WHERE id = ? AND reservation_id = ? AND room = ? AND request_hash = ?
         AND event_type = 'notification_pending' AND code_released = 0`,
      cleanText(record.alertId, 100),
      eventId,
      reservationId,
      room,
      requestHash
    );
    const authorized = rows(this.ctx.storage.sql.exec(
      `SELECT id FROM spare_key_events
       WHERE id = ? AND reservation_id = ? AND room = ? AND request_hash = ?
         AND event_type = 'notification_accepted' AND code_released = 0 LIMIT 1`,
      eventId,
      reservationId,
      room,
      requestHash
    ))[0];
    return { ok: Boolean(authorized) };
  }

  async finalizeSpareKeyRelease(record) {
    const now = cleanText(record.createdAt, 40) || new Date().toISOString();
    const eventId = cleanText(record.id, 100);
    const reservationId = cleanText(record.reservationId, 100);
    const room = cleanText(record.room, 4);
    const requestHash = cleanText(record.requestHash, 100);
    const roomState = rows(this.ctx.storage.sql.exec(
      "SELECT rotation_required AS rotationRequired FROM spare_key_room_state WHERE room = ? LIMIT 1",
      room
    ))[0];
    if (Boolean(roomState?.rotationRequired)) return { ok: false, error: "key_code_rotation_required" };
    const claim = rows(this.ctx.storage.sql.exec(
      `SELECT id FROM spare_key_events
       WHERE id = ? AND reservation_id = ? AND room = ? AND request_hash = ?
         AND event_type = 'notification_accepted' AND code_released = 0 LIMIT 1`,
      eventId,
      reservationId,
      room,
      requestHash
    ))[0];
    if (!claim) return { ok: false, error: "claim_not_found" };
    this.ctx.storage.sql.exec(
      `UPDATE spare_key_events
       SET event_type = 'verified_spare_key_release', code_released = 1
       WHERE id = ?`,
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
    this.ctx.storage.sql.exec(
      "DELETE FROM spare_key_events WHERE id = ? AND code_released = 0",
      cleanText(id, 100)
    );
    return { ok: true };
  }

  async deleteSpareKeyRotationActivity(id) {
    const eventId = cleanText(id, 100);
    const existing = rows(this.ctx.storage.sql.exec(
      `SELECT id FROM spare_key_events
       WHERE id = ?
         AND event_type IN ('rotation_cleared_controlled_test', 'rotation_cleared_physical')
       LIMIT 1`,
      eventId
    ))[0] || null;
    if (!existing) return { ok: false, error: "rotation_activity_not_found" };
    this.ctx.storage.sql.exec(
      `DELETE FROM spare_key_events
       WHERE id = ?
         AND event_type IN ('rotation_cleared_controlled_test', 'rotation_cleared_physical')`,
      eventId
    );
    return { ok: true, id: eventId };
  }

  async confirmSpareKeyRotation(room, nowValue, resetMode) {
    const now = cleanText(nowValue, 40) || new Date().toISOString();
    const mode = ["controlled_test", "physical_rotation"].includes(resetMode) ? resetMode : "";
    if (!mode) return { ok: false, error: "invalid_reset_mode" };
    const current = rows(this.ctx.storage.sql.exec(
      `SELECT rotation_required AS rotationRequired, last_reservation_id AS lastReservationId
       FROM spare_key_room_state WHERE room = ? LIMIT 1`,
      cleanText(room, 4)
    ))[0] || null;
    if (!Boolean(current?.rotationRequired)) return { ok: false, error: "rotation_not_required" };
    const eventType = mode === "controlled_test"
      ? "rotation_cleared_controlled_test"
      : "rotation_cleared_physical";
    this.ctx.storage.sql.exec(
      `INSERT INTO spare_key_events
       (id, reservation_id, room, event_type, fee_accepted, code_released, request_hash, alert_id, created_at)
       VALUES (?, ?, ?, ?, 0, 0, '', '', ?)`,
      `key_reset_${crypto.randomUUID()}`,
      cleanText(current.lastReservationId, 100),
      cleanText(room, 4),
      eventType,
      now
    );
    this.ctx.storage.sql.exec(
      `UPDATE spare_key_room_state
       SET rotation_required = 0, rotation_confirmed_at = ?, updated_at = ?
      WHERE room = ?`,
      now,
      now,
      cleanText(room, 4)
    );
    return { ok: true, room, resetMode: mode, rotationConfirmedAt: now };
  }

  async replaceDirectStayConfirmationCode(reservationId, confirmationCodeHash, updatedAt) {
    const id = cleanText(reservationId, 100);
    const codeHash = cleanText(confirmationCodeHash, 100);
    const now = cleanText(updatedAt, 40) || new Date().toISOString();
    if (!id || !codeHash) return { ok: false, error: "invalid_request" };
    const reservation = rows(this.ctx.storage.sql.exec(
      "SELECT id, provider, room, status FROM stay_reservations WHERE id = ? LIMIT 1",
      id
    ))[0];
    if (!reservation) return { ok: false, error: "reservation_not_found" };
    if (reservation.provider !== "direct") return { ok: false, error: "direct_stay_required" };
    if (reservation.status !== "confirmed") return { ok: false, error: "reservation_not_active" };
    try {
      this.ctx.storage.sql.exec(
        "UPDATE stay_reservations SET confirmation_code_hash = ?, updated_at = ? WHERE id = ?",
        codeHash,
        now,
        id
      );
    } catch (_error) {
      return { ok: false, error: "code_collision" };
    }
    return { ok: true, reservationId: id, room: cleanText(reservation.room, 4), updatedAt: now };
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
      `SELECT r.id, r.provider, r.room, r.listing_id AS listingId, r.guest_first_name AS guestFirstName, r.check_in_date AS checkInDate,
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
    const rotationActivity = rows(this.ctx.storage.sql.exec(
      `SELECT id, room, event_type AS eventType, created_at AS createdAt
       FROM spare_key_events
       WHERE event_type IN ('rotation_cleared_controlled_test', 'rotation_cleared_physical')
       ORDER BY created_at DESC LIMIT 20`
    ));
    return { reservations, rotations, rotationActivity };
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
