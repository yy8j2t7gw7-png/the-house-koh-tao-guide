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
        storedPassportFiles: Number(passportTotals.storedPassportFiles) || 0
      },
      queue,
      approved,
      pendingRegistrations,
      passportUploads,
      recent
    };
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
