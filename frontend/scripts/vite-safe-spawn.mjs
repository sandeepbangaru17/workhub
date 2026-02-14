import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const childProcess = require("node:child_process");
const originalExec = childProcess.exec;

function toLowerTrimmed(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

childProcess.exec = function patchedExec(command, options, callback) {
  let normalizedOptions = options;
  let normalizedCallback = callback;

  if (typeof options === "function") {
    normalizedOptions = undefined;
    normalizedCallback = options;
  }

  try {
    return originalExec.call(this, command, normalizedOptions, normalizedCallback);
  } catch (error) {
    const isNetUse = toLowerTrimmed(command) === "net use";
    if (isNetUse && error?.code === "EPERM") {
      if (typeof normalizedCallback === "function") {
        queueMicrotask(() => normalizedCallback(error, "", ""));
      }

      // Minimal shape to satisfy callers that ignore the returned child process.
      return {
        kill() {},
        on() {
          return this;
        },
        once() {
          return this;
        },
        removeListener() {
          return this;
        },
        stdout: null,
        stderr: null,
      };
    }

    throw error;
  }
};
