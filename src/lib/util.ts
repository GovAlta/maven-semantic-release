import SemanticReleaseError from "@semantic-release/error";
import { execa, Options } from "execa";
import fs from "fs-extra";
import xml2js from "xml2js";
import { Logger } from "./types.js";
import ERROR_DEFINITIONS from "./definitions/errors.js";
import pkg from "../../package.json" with { type: "json" };

/**
 * Execute while streaming to stdout in realtime
 */
export async function exec(cmd: string, args: string[], opts?: Options) {
  const childProcess = execa(cmd, args, opts);
  childProcess.stdout?.pipe(process.stdout);
  childProcess.stderr?.pipe(process.stderr);
  return childProcess;
}

/**
 * Helper function to create a new SemanticReleaseError
 */
export function getError(code: keyof typeof ERROR_DEFINITIONS, ctx = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { message, details } = ERROR_DEFINITIONS[code](ctx as any);
  return new SemanticReleaseError(message, code, details);
}

/**
 * get package info from pom.xml
 */
export async function getPomInfo(logger: Logger) {
  const pomXmlFilePath = "./pom.xml";
  const stats = await fs.stat(pomXmlFilePath);

  if (!stats) {
    throw getError("ENOPOMXML");
  }

  let pomXml;
  try {
    const pomContents = await fs.readFile(pomXmlFilePath, "utf8");
    pomXml = await xml2js.parseStringPromise(pomContents);
  } catch (e) {
    logger.log(e);
    throw getError("EREADPOMXML");
  }

  return pomXml;
}

export function printVersion(logger: Logger) {
  logger.log(`Running ${pkg.name} version ${pkg.version}`);
}
