import * as fs from "node:fs/promises";
import { basename } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createCloudBudget } from "./cloud-budget.js";
let active;
export function createR2Storage({ env = process.env, client, budget } = {}) {
  client ||= new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    maxAttempts: 1,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  budget ||= createCloudBudget(env);
  const key = (path) => {
    const value = basename(path);
    if (!/^[a-f0-9-]{36}$/.test(value)) throw new Error("Invalid storage key");
    return `files/${value}`;
  };
  async function send(Command, path, extra = {}, reserve = {}) {
    if (env.R2_PAUSED === "yes")
      throw Object.assign(new Error("Cloud file access is paused"), {
        status: 503,
      });
    const Key = key(path);
    await budget.reserve(reserve);
    try {
      return await client.send(
        new Command({ Bucket: env.R2_BUCKET, Key, ...extra }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
    } catch {
      throw Object.assign(new Error("Cloud file operation unavailable"), {
        status: 503,
      });
    }
  }
  return {
    ready: () => budget.reserve({}),
    mkdir: async () => {},
    writeFile: async (path, body) => {
      if (body.length > 5 * 1024 * 1024)
        throw Object.assign(new Error("File too large"), { status: 413 });
      await send(
        PutObjectCommand,
        path,
        { Body: body, IfNoneMatch: "*" },
        { bytes: body.length, a: 1 },
      );
    },
    readFile: async (path) => {
      const result = await send(GetObjectCommand, path, {}, { b: 1 });
      if (result.ContentLength > 5 * 1024 * 1024) {
        result.Body.destroy();
        throw new Error("File too large");
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of result.Body) {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) {
          result.Body.destroy();
          throw new Error("File too large");
        }
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    },
    unlink: async (path) => {
      await send(DeleteObjectCommand, path);
    },
    close: async () => {
      client.destroy?.();
      await budget.close?.();
    },
  };
}
function storage() {
  if (process.env.FILE_STORAGE !== "r2") return fs;
  return (active ||= createR2Storage());
}
export const mkdir = (...args) => storage().mkdir(...args);
export const writeFile = (...args) => storage().writeFile(...args);
export const readFile = (...args) => storage().readFile(...args);
export const unlink = (...args) => storage().unlink(...args);
export async function closeStorage() {
  await active?.close();
  active = undefined;
}
export async function checkStorage() {
  if (process.env.FILE_STORAGE === "r2") await storage().ready();
}
