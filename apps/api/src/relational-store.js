// Relational identity, access and academic fields; immutable snapshots and extension
// metadata remain JSON. Legacy records are retained as the migration backup.
const definitions = {
  feeSchedules: {
    classId: "VARCHAR(36) NOT NULL",
    academicYearId: "VARCHAR(36) NOT NULL",
    name: "VARCHAR(120) NOT NULL",
    amountMinor: "BIGINT NOT NULL",
    currency: "VARCHAR(3) NOT NULL",
    dueDate: "DATE NOT NULL",
  },
  feeCharges: {
    scheduleId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    classId: "VARCHAR(36) NOT NULL",
    academicYearId: "VARCHAR(36) NOT NULL",
    amountMinor: "BIGINT NOT NULL",
    currency: "VARCHAR(3) NOT NULL",
    dueDate: "DATE NOT NULL",
  },
  feePayments: {
    chargeId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    amountMinor: "BIGINT NOT NULL",
    currency: "VARCHAR(3) NOT NULL",
    requestKey: "VARCHAR(36) NOT NULL",
    receiptNumber: "VARCHAR(60) NOT NULL",
    paidOn: "DATE NOT NULL",
    voided: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
  feeConcessions: {
    chargeId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    amountMinor: "BIGINT NOT NULL",
    currency: "VARCHAR(3) NOT NULL",
    requestKey: "VARCHAR(36) NOT NULL",
    voided: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
  admissions: {
    classId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36)",
    studentName: "VARCHAR(200) NOT NULL",
    loginEmail: "VARCHAR(200) NOT NULL",
    applicationNumber: "VARCHAR(60) NOT NULL",
    status: "VARCHAR(24) NOT NULL",
  },
  studentProfiles: {
    studentId: "VARCHAR(36) NOT NULL",
    admissionNumber: "VARCHAR(60)",
    birthDate: "DATE",
  },
  guardians: {
    name: "VARCHAR(200) NOT NULL",
    email: "VARCHAR(200)",
    phone: "VARCHAR(40)",
    relationship: "VARCHAR(60) NOT NULL",
  },
  studentGuardians: {
    studentId: "VARCHAR(36) NOT NULL",
    guardianId: "VARCHAR(36) NOT NULL",
    active: "BOOLEAN NOT NULL DEFAULT TRUE",
  },
  organizations: { name: "VARCHAR(200) NOT NULL" },
  schools: {
    name: "VARCHAR(200) NOT NULL",
    city: "VARCHAR(200)",
    code: "VARCHAR(200)",
    orgId: "VARCHAR(36)",
  },
  users: {
    name: "VARCHAR(200) NOT NULL",
    email: "VARCHAR(200) NOT NULL",
    role: "VARCHAR(24) NOT NULL",
    passwordHash: "VARCHAR(100) NOT NULL",
    orgId: "VARCHAR(36)",
    authVersion: "INT NOT NULL DEFAULT 0",
    active: "BOOLEAN NOT NULL DEFAULT TRUE",
    passwordChangeRequired: "BOOLEAN NOT NULL DEFAULT FALSE",
    phone: "VARCHAR(40)",
  },
  academicYears: {
    name: "VARCHAR(120) NOT NULL",
    startDate: "DATE NOT NULL",
    endDate: "DATE NOT NULL",
    isCurrent: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
  classes: {
    name: "VARCHAR(200) NOT NULL",
    academicYearId: "VARCHAR(36)",
    grade: "VARCHAR(120)",
    section: "VARCHAR(120)",
  },
  attendanceSessions: {
    name: "VARCHAR(80) NOT NULL",
    active: "BOOLEAN NOT NULL DEFAULT TRUE",
  },
  subjects: { classId: "VARCHAR(36) NOT NULL", name: "VARCHAR(120) NOT NULL" },
  exams: {
    classId: "VARCHAR(36) NOT NULL",
    academicYearId: "VARCHAR(36) NOT NULL",
    name: "VARCHAR(120) NOT NULL",
    status: "VARCHAR(24) NOT NULL",
    version: "INT NOT NULL DEFAULT 0",
  },
  attendance: {
    classId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    date: "DATE NOT NULL",
    sessionId: "VARCHAR(36)",
    status: "VARCHAR(24) NOT NULL",
    updatedAt: "VARCHAR(40)",
  },
  marks: {
    classId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    examId: "VARCHAR(36)",
    subjectId: "VARCHAR(36)",
    score: "DOUBLE NOT NULL",
    maxScore: "DOUBLE NOT NULL",
  },
  terms: {
    academicYearId: "VARCHAR(36) NOT NULL",
    name: "VARCHAR(80) NOT NULL",
    startDate: "DATE NOT NULL",
    endDate: "DATE NOT NULL",
  },
  enrollments: {
    classId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    academicYearId: "VARCHAR(36) NOT NULL",
    status: "VARCHAR(24) NOT NULL",
    startedOn: "DATE",
    endedOn: "DATE",
  },
  timetable: {
    classId: "VARCHAR(36) NOT NULL",
    subjectId: "VARCHAR(36) NOT NULL",
    teacherId: "VARCHAR(36) NOT NULL",
    academicYearId: "VARCHAR(36) NOT NULL",
    day: "INT NOT NULL",
    start: "VARCHAR(5) NOT NULL",
    end: "VARCHAR(5) NOT NULL",
    cancelled: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
  substitutions: {
    classId: "VARCHAR(36) NOT NULL",
    entryId: "VARCHAR(36) NOT NULL",
    date: "DATE NOT NULL",
    teacherId: "VARCHAR(36) NOT NULL",
    previousTeacherId: "VARCHAR(36) NOT NULL",
    cancelled: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
  securityTokens: {
    tokenHash: "VARCHAR(64) NOT NULL",
    type: "VARCHAR(20) NOT NULL",
    userId: "VARCHAR(36) NOT NULL",
    expires: "BIGINT NOT NULL",
    revoked: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
  attendanceCorrections: {
    attendanceId: "VARCHAR(36) NOT NULL",
    classId: "VARCHAR(36) NOT NULL",
    studentId: "VARCHAR(36) NOT NULL",
    requestedBy: "VARCHAR(36) NOT NULL",
    reviewedBy: "VARCHAR(36)",
    status: "VARCHAR(24) NOT NULL",
  },
};
const snake = (key) => key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
export const tableFor = (kind) => "sg_" + snake(kind);
const booleans = new Set([
  "active",
  "isCurrent",
  "passwordChangeRequired",
  "cancelled",
  "revoked",
  "voided",
]);
const arrayFields = {
  users: {
    schoolIds: ["sg_user_schools", "school_id"],
    classIds: ["sg_user_classes", "class_id"],
  },
  subjects: { teacherIds: ["sg_subject_teachers", "teacher_id"] },
};
const foreign = {
  feeSchedules: { classId: "classes", academicYearId: "academicYears" },
  feeCharges: {
    scheduleId: "feeSchedules",
    studentId: "users",
    classId: "classes",
    academicYearId: "academicYears",
  },
  feePayments: { chargeId: "feeCharges", studentId: "users" },
  feeConcessions: { chargeId: "feeCharges", studentId: "users" },
  admissions: { classId: "classes", studentId: "users" },
  studentProfiles: { studentId: "users" },
  studentGuardians: { studentId: "users", guardianId: "guardians" },
  schools: { orgId: "organizations" },
  users: { orgId: "organizations" },
  classes: { academicYearId: "academicYears" },
  subjects: { classId: "classes" },
  exams: { classId: "classes", academicYearId: "academicYears" },
  attendance: {
    classId: "classes",
    studentId: "users",
    sessionId: "attendanceSessions",
  },
  marks: {
    classId: "classes",
    studentId: "users",
    examId: "exams",
    subjectId: "subjects",
  },
  terms: { academicYearId: "academicYears" },
  enrollments: {
    classId: "classes",
    studentId: "users",
    academicYearId: "academicYears",
  },
  timetable: {
    classId: "classes",
    subjectId: "subjects",
    teacherId: "users",
    academicYearId: "academicYears",
  },
  substitutions: {
    classId: "classes",
    entryId: "timetable",
    teacherId: "users",
    previousTeacherId: "users",
  },
  securityTokens: { userId: "users" },
  attendanceCorrections: {
    attendanceId: "attendance",
    classId: "classes",
    studentId: "users",
    requestedBy: "users",
    reviewedBy: "users",
  },
};
const constraints = {
  feeSchedules: [
    "CHECK (amount_minor>0 AND amount_minor<=1000000000)",
    "CHECK (currency IN ('INR','USD','EUR','GBP'))",
  ],
  feeCharges: [
    "UNIQUE KEY student_schedule (school_id,schedule_id,student_id)",
    "CHECK (amount_minor>0 AND amount_minor<=1000000000)",
  ],
  feePayments: [
    "UNIQUE KEY payment_request (school_id,request_key)",
    "UNIQUE KEY payment_receipt (school_id,receipt_number)",
    "CHECK (amount_minor>0 AND amount_minor<=1000000000)",
  ],
  feeConcessions: [
    "UNIQUE KEY concession_request (school_id,request_key)",
    "CHECK (amount_minor>0 AND amount_minor<=1000000000)",
  ],
  admissions: [
    "UNIQUE KEY application_number (school_id,application_number)",
    "CHECK (status IN ('submitted','reviewing','admitted','rejected','withdrawn'))",
  ],
  studentProfiles: [
    "UNIQUE KEY student_profile (school_id,student_id)",
    "UNIQUE KEY admission_number (school_id,admission_number)",
  ],
  users: [
    "UNIQUE KEY login_email (email)",
    "CHECK (role IN ('owner','director','admin','principal','teacher','student','staff'))",
  ],
  academicYears: ["CHECK (start_date <= end_date)"],
  terms: ["CHECK (start_date <= end_date)"],
  attendance: [
    "session_key VARCHAR(36) GENERATED ALWAYS AS (COALESCE(session_id,'')) STORED",
    "UNIQUE KEY attendance_register (school_id,class_id,student_id,date,session_key)",
    "CHECK (status IN ('present','absent','late','excused'))",
  ],
  marks: [
    "CHECK (max_score>0 AND score>=0 AND score<=max_score)",
    "UNIQUE KEY configured_mark (school_id,exam_id,student_id,subject_id)",
  ],
  timetable: ["CHECK (day BETWEEN 1 AND 7 AND `start` < `end`)"],
  securityTokens: [
    "UNIQUE KEY token_digest (type,token_hash)",
    "INDEX token_expiry (expires,revoked)",
  ],
  attendanceCorrections: [
    "CHECK (status IN ('pending','approved','rejected'))",
    "CHECK (reviewed_by IS NULL OR reviewed_by <> requested_by)",
  ],
};
export async function migrateRelational(pool, collections) {
  const conn = await pool.getConnection();
  try {
    const [[lock]] = await conn.query(
      "SELECT GET_LOCK('schoolglass-schema',30) AS acquired",
    );
    if (!lock.acquired) throw new Error("Database migration lock unavailable");
    await conn.query(
      "CREATE TABLE IF NOT EXISTS sg_migrations (version INT PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
    const order = [
      ...Object.keys(definitions),
      ...collections.filter((k) => !definitions[k]),
    ];
    // Create tables before adding cross-table foreign keys.
    for (const kind of order) {
      const fields = definitions[kind] || {},
        columns = [
          "id VARCHAR(36) PRIMARY KEY",
          ...(!["organizations", "schools", "users"].includes(kind)
            ? ["school_id VARCHAR(36)"]
            : []),
          ...Object.entries(fields).map(
            ([k, type]) => `\`${snake(k)}\` ${type}`,
          ),
          "extensions JSON NOT NULL",
          ...(constraints[kind] || []),
          ...(kind !== "organizations" && kind !== "schools" && kind !== "users"
            ? [
                "INDEX school_scope (school_id)",
                "UNIQUE KEY scoped_identity (id,school_id)",
              ]
            : []),
        ];
      await conn.query(
        `CREATE TABLE IF NOT EXISTS ${tableFor(kind)} (${columns.join(",")}) ENGINE=InnoDB`,
      );
    }
    await conn.query(
      "CREATE TABLE IF NOT EXISTS sg_user_schools (user_id VARCHAR(36) NOT NULL, school_id VARCHAR(36) NOT NULL, PRIMARY KEY(user_id,school_id), FOREIGN KEY(user_id) REFERENCES sg_users(id), FOREIGN KEY(school_id) REFERENCES sg_schools(id))",
    );
    await conn.query(
      "CREATE TABLE IF NOT EXISTS sg_user_classes (user_id VARCHAR(36) NOT NULL, class_id VARCHAR(36) NOT NULL, PRIMARY KEY(user_id,class_id), FOREIGN KEY(user_id) REFERENCES sg_users(id), FOREIGN KEY(class_id) REFERENCES sg_classes(id))",
    );
    await conn.query(
      "CREATE TABLE IF NOT EXISTS sg_subject_teachers (user_id VARCHAR(36) NOT NULL, teacher_id VARCHAR(36) NOT NULL, PRIMARY KEY(user_id,teacher_id), FOREIGN KEY(user_id) REFERENCES sg_subjects(id), FOREIGN KEY(teacher_id) REFERENCES sg_users(id))",
    );
    const [[version]] = await conn.query(
      "SELECT COUNT(*) AS present FROM sg_migrations WHERE version=1",
    );
    if (!version.present) {
      const [legacy] = await conn.query("SELECT kind,payload FROM records");
      const rows = legacy.map((r) => ({
        kind: r.kind,
        row: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
      }));
      await conn.beginTransaction();
      try {
        for (const kind of order)
          for (const item of rows.filter((r) => r.kind === kind))
            await relationalPut(conn, kind, item.row, false);
        for (const { kind, row } of rows)
          if (arrayFields[kind]) await writeArrays(conn, kind, row);
        await conn.query("INSERT INTO sg_migrations(version) VALUES(1)");
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    }
    const [[fkVersion]] = await conn.query(
      "SELECT COUNT(*) AS present FROM sg_migrations WHERE version=2",
    );
    if (!fkVersion.present) {
      for (const kind of order) {
        const refs = {
          ...(foreign[kind] || {}),
          ...(![
            "organizations",
            "schools",
            "users",
            "audit",
            "securityTokens",
          ].includes(kind)
            ? { schoolId: "schools" }
            : {}),
        };
        for (const [field, parent] of Object.entries(refs)) {
          const name = `fk_${snake(kind)}_${snake(field)}`;
          const [[exists]] = await conn.execute(
            "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
            [tableFor(kind), name],
          );
          if (!exists.n)
            await conn.query(
              `ALTER TABLE ${tableFor(kind)} ADD CONSTRAINT ${name} FOREIGN KEY (${snake(field)}) REFERENCES ${tableFor(parent)}(id)`,
            );
        }
      }
      await conn.query("INSERT INTO sg_migrations(version) VALUES(2)");
    }
    const [[scopedVersion]] = await conn.query(
      "SELECT COUNT(*) AS present FROM sg_migrations WHERE version=3",
    );
    if (!scopedVersion.present) {
      for (const [kind, refs] of Object.entries(foreign))
        for (const [field, parent] of Object.entries(refs)) {
          if (
            ["organizations", "schools", "users"].includes(kind) ||
            ["organizations", "schools", "users"].includes(parent)
          )
            continue;
          const name = `scope_${snake(kind)}_${snake(field)}`;
          const [[exists]] = await conn.execute(
            "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
            [tableFor(kind), name],
          );
          if (!exists.n)
            await conn.query(
              `ALTER TABLE ${tableFor(kind)} ADD CONSTRAINT ${name} FOREIGN KEY (${snake(field)},school_id) REFERENCES ${tableFor(parent)}(id,school_id)`,
            );
        }
      await conn.query("INSERT INTO sg_migrations(version) VALUES(3)");
    }
    const [[securityVersion]] = await conn.query(
      "SELECT COUNT(*) AS present FROM sg_migrations WHERE version=4",
    );
    if (!securityVersion.present) {
      for (const kind of ["audit", "securityTokens"]) {
        const name = `fk_${snake(kind)}_school_id`;
        const [[exists]] = await conn.execute(
          "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
          [tableFor(kind), name],
        );
        if (exists.n)
          await conn.query(
            `ALTER TABLE ${tableFor(kind)} DROP FOREIGN KEY ${name}`,
          );
      }
      await conn.query("INSERT INTO sg_migrations(version) VALUES(4)");
    }
    const [[admissionVersion]] = await conn.query(
      "SELECT COUNT(*) AS present FROM sg_migrations WHERE version=5",
    );
    if (!admissionVersion.present) {
      for (const kind of [
        "admissions",
        "studentProfiles",
        "guardians",
        "studentGuardians",
      ]) {
        for (const [field, parent] of Object.entries({
          ...foreign[kind],
          schoolId: "schools",
        })) {
          const name = `fk_${snake(kind)}_${snake(field)}`;
          const [[exists]] = await conn.execute(
            "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
            [tableFor(kind), name],
          );
          if (!exists.n)
            await conn.query(
              `ALTER TABLE ${tableFor(kind)} ADD CONSTRAINT ${name} FOREIGN KEY (${snake(field)}) REFERENCES ${tableFor(parent)}(id)`,
            );
          if (!["users", "schools"].includes(parent)) {
            const scopedName = `scope_${snake(kind)}_${snake(field)}`;
            const [[scopedExists]] = await conn.execute(
              "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
              [tableFor(kind), scopedName],
            );
            if (!scopedExists.n)
              await conn.query(
                `ALTER TABLE ${tableFor(kind)} ADD CONSTRAINT ${scopedName} FOREIGN KEY (${snake(field)},school_id) REFERENCES ${tableFor(parent)}(id,school_id)`,
              );
          }
        }
      }
      await conn.query("INSERT INTO sg_migrations(version) VALUES(5)");
    }
    const [[feeVersion]] = await conn.query(
      "SELECT COUNT(*) AS present FROM sg_migrations WHERE version=6",
    );
    if (!feeVersion.present) {
      for (const kind of [
        "feeSchedules",
        "feeCharges",
        "feePayments",
        "feeConcessions",
      ])
        for (const [field, parent] of Object.entries({
          ...foreign[kind],
          schoolId: "schools",
        })) {
          const name = `fk_${snake(kind)}_${snake(field)}`;
          const [[exists]] = await conn.execute(
            "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
            [tableFor(kind), name],
          );
          if (!exists.n)
            await conn.query(
              `ALTER TABLE ${tableFor(kind)} ADD CONSTRAINT ${name} FOREIGN KEY (${snake(field)}) REFERENCES ${tableFor(parent)}(id)`,
            );
          if (!["users", "schools"].includes(parent)) {
            const scopedName = `scope_${snake(kind)}_${snake(field)}`;
            const [[scopedExists]] = await conn.execute(
              "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
              [tableFor(kind), scopedName],
            );
            if (!scopedExists.n)
              await conn.query(
                `ALTER TABLE ${tableFor(kind)} ADD CONSTRAINT ${scopedName} FOREIGN KEY (${snake(field)},school_id) REFERENCES ${tableFor(parent)}(id,school_id)`,
              );
          }
        }
      await conn.query("INSERT INTO sg_migrations(version) VALUES(6)");
    }
  } finally {
    await conn
      .query("SELECT RELEASE_LOCK('schoolglass-schema')")
      .catch(() => {});
    conn.release();
  }
}
async function writeArrays(db, kind, row) {
  for (const [field, [table, column]] of Object.entries(
    arrayFields[kind] || {},
  )) {
    const values = [...new Set(row[field] || [])];
    const [old] = await db.execute(
      `SELECT ${column} FROM ${table} WHERE user_id=?`,
      [row.id],
    );
    for (const link of old)
      if (!values.includes(link[column]))
        await db.execute(
          `DELETE FROM ${table} WHERE user_id=? AND ${column}=?`,
          [row.id, link[column]],
        );
    for (const value of values)
      if (!old.some((link) => link[column] === value))
        await db.execute(
          `INSERT INTO ${table} (user_id,${column}) VALUES (?,?)`,
          [row.id, value],
        );
  }
}
export async function relationalPut(db, kind, row, arrays = true) {
  const fields = definitions[kind] || {},
    scoped = !["organizations", "schools", "users"].includes(kind),
    keys = ["id", ...(scoped ? ["schoolId"] : []), ...Object.keys(fields)],
    extensions = Object.fromEntries(
      Object.entries(row).filter(
        ([k]) =>
          !keys.includes(k) && !Object.hasOwn(arrayFields[kind] || {}, k),
      ),
    );
  const values = keys.map(
    (k) =>
      row[k] ??
      (booleans.has(k)
        ? ["active"].includes(k)
        : k === "authVersion" || k === "version"
          ? 0
          : null),
  );
  const columns = keys.map((key) => `\`${snake(key)}\``).concat("extensions");
  try {
    const [old] = await db.execute(
      `SELECT id FROM ${tableFor(kind)} WHERE id=?`,
      [row.id],
    );
    if (old.length)
      await db.execute(
        `UPDATE ${tableFor(kind)} SET ${columns
          .slice(1)
          .map((c) => `${c}=?`)
          .join(",")} WHERE id=?`,
        [...values.slice(1), JSON.stringify(extensions), row.id],
      );
    else
      await db.execute(
        `INSERT INTO ${tableFor(kind)} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
        [...values, JSON.stringify(extensions)],
      );
    if (arrays) await writeArrays(db, kind, row);
  } catch (e) {
    if (
      e.code === "ER_DUP_ENTRY" ||
      e.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
      e.code === "ER_NO_REFERENCED_ROW_2"
    )
      throw Object.assign(
        new Error(
          "Record conflicts with database identity, scope or academic constraints",
        ),
        { status: 409 },
      );
    throw e;
  }
  return row;
}
export async function relationalAll(db, kind, where = "", params = []) {
  const [records] = await db.execute(
      `SELECT * FROM ${tableFor(kind)} ${where}`,
      params,
    ),
    result = [];
  const arrays = {};
  for (const [field, [table, column]] of Object.entries(
    arrayFields[kind] || {},
  )) {
    const ids = records.map((r) => r.id);
    const [links] = ids.length
      ? await db.execute(
          `SELECT user_id,${column} FROM ${table} WHERE user_id IN (${ids.map(() => "?").join(",")})`,
          ids,
        )
      : [[]];
    arrays[field] = new Map();
    for (const link of links) {
      const list = arrays[field].get(link.user_id) || [];
      list.push(link[column]);
      arrays[field].set(link.user_id, list);
    }
  }
  for (const record of records) {
    const row = {
      ...(typeof record.extensions === "string"
        ? JSON.parse(record.extensions)
        : record.extensions),
      id: record.id,
    };
    if (Object.hasOwn(record, "school_id")) row.schoolId = record.school_id;
    for (const field of Object.keys(definitions[kind] || {}))
      if (record[snake(field)] != null)
        row[field] = booleans.has(field)
          ? !!record[snake(field)]
          : record[snake(field)];
    for (const field of Object.keys(arrays))
      row[field] = arrays[field].get(row.id) || [];
    result.push(row);
  }
  return result;
}
