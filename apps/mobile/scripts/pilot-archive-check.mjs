import { readdir, realpath } from "node:fs/promises";
import { resolve, relative, sep, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
export function archiveProblems(paths) {
  return paths.filter((path) => {
    const name = path.replaceAll("\\", "/");
    const parts = name.split("/");
    const last = parts.at(-1);
    return (
      parts.some((p) =>
        [".git", ".pilot", "node_modules", "signing"].includes(p.toLowerCase()),
      ) ||
      (/^\.env(?:$|\.)/i.test(last) && last.toLowerCase() !== ".env.example") ||
      /^credentials(?:\..*)?\.json$/i.test(last) ||
      /\.(jks|keystore|p8|p12|key|pem|mobileprovision)$/i.test(last) ||
      /(^|\/)apps\/api\/data(\/|$)/i.test(name) ||
      parts.some((p) => p.toLowerCase() === "uploads")
    );
  });
}
export async function checkArchive(directory) {
  const mobile = fileURLToPath(new URL("../", import.meta.url));
  const evidenceRoot = await realpath(resolve(mobile, ".pilot"));
  const target = await realpath(resolve(mobile, directory));
  const local = relative(evidenceRoot, target);
  if (
    !local ||
    isAbsolute(local) ||
    local.startsWith(`..${sep}`) ||
    local === ".." ||
    resolve(evidenceRoot, local) !== target
  )
    throw Error(
      "Inspect a dedicated archive directory inside apps/mobile/.pilot.",
    );
  const files = [],
    links = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name),
        name = relative(target, path).replaceAll("\\", "/");
      if (entry.isSymbolicLink()) links.push(name);
      else if (entry.isDirectory()) await walk(path);
      else files.push(name);
    }
  }
  await walk(target);
  const problems = archiveProblems(files);
  if (
    !files.includes("apps/mobile/app.json") ||
    !files.includes("apps/mobile/package-lock.json")
  )
    problems.push(
      "Expected mobile configuration/lockfile absent from repository archive.",
    );
  if (links.length)
    problems.push(
      "Symbolic links require review; scanner does not follow them.",
    );
  return {
    fileCount: files.length,
    problemCount: problems.length,
    problems,
    readyForUploadReview: !problems.length,
    uploaded: false,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (!process.argv[2])
      throw Error(
        "Usage: npm run pilot:archive:check -- .pilot/<archive-directory>",
      );
    const result = await checkArchive(process.argv[2]);
    console.log(JSON.stringify(result, null, 2));
    if (result.problemCount) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
