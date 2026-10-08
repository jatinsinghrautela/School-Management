import { spawn } from "node:child_process";
export function uploadType(buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  throw Object.assign(new Error("Only PDF, PNG and JPEG files are supported"), {
    status: 400,
  });
}
export async function scanBuffer(buffer) {
  if (!process.env.CLAMAV_COMMAND)
    throw Object.assign(
      new Error(
        "Uploads are disabled until a local ClamAV scanner is configured",
      ),
      { status: 503 },
    );
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.CLAMAV_COMMAND, ["--no-summary", "-"], {
      windowsHide: true,
      stdio: ["pipe", "ignore", "ignore"],
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(
        Object.assign(new Error("Malware scanner timed out"), { status: 503 }),
      );
    }, 30000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(
        Object.assign(new Error("Malware scanner is unavailable"), {
          status: 503,
        }),
      );
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else
        reject(
          Object.assign(
            new Error(
              code === 1
                ? "File rejected by malware scanner"
                : "Malware scanner could not verify the file",
            ),
            { status: code === 1 ? 400 : 503 },
          ),
        );
    });
    child.stdin.on("error", () => {});
    child.stdin.end(buffer);
  });
}
export async function checkQuota(tx, schoolId, studentId, size) {
  const files = (await tx.all("files")).filter(
    (f) => f.schoolId === schoolId && !f.deleted,
  );
  const limit = Number(process.env.SCHOOL_STORAGE_MB || 250) * 1024 * 1024,
    own = Number(process.env.STUDENT_STORAGE_MB || 20) * 1024 * 1024;
  if (
    !Number.isFinite(limit) ||
    limit <= 0 ||
    !Number.isFinite(own) ||
    own <= 0
  )
    throw Object.assign(new Error("Storage quota configuration is invalid"), {
      status: 503,
    });
  if (
    files.reduce((n, f) => n + f.size, 0) + size > limit ||
    (studentId &&
      files
        .filter((f) => f.studentId === studentId)
        .reduce((n, f) => n + f.size, 0) +
        size >
        own)
  )
    throw Object.assign(
      new Error("Storage quota reached; contact school management"),
      { status: 409 },
    );
}
