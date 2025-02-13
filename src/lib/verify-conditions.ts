import AggregateError from "aggregate-error";
import fs from "fs-extra";
import { VerifyConditionsContext } from "semantic-release";
import type { MavenPluginOptions, Pom } from "./types.js";
import { getError, getPomInfo, printVersion } from "./util.js";

/**
 * Verify that the maven project is properly setup to allow deployment to maven central
 */
export async function verifyConditions(
  config: MavenPluginOptions,
  context: VerifyConditionsContext
) {
  const { logger } = context;
  printVersion(logger);

  // make sure pom.xml file is good to go
  logger.log("validating pom.xml");
  const pomXml = await getPomInfo(logger);
  validatePomXml(pomXml);
  logger.log("pom.xml validation successful");

  if (!config.skipMavenDeploy) {
    // make sure maven-settings file exists
    logger.log("validating maven-settings.xml");
    const stats = await fs.stat("./maven-settings.xml");

    if (!stats) {
      throw getError("ENOMAVENSETTINGS");
    }

    logger.log("maven-settings.xml validation successful");

    // HELP WANTED: do more validation of maven-settings.xml file and OSSRH login
  }
}

/**
 * Validate that the contents of pom.xml appear to be setup properly
 */
function validatePomXml(pomXml: Pom) {
  if (!pomXml) {
    throw getError("EREADPOMXML");
  }

  const pomValidationErrors = [];

  if (!pomXml.project) {
    pomValidationErrors.push(getError("ENOPOMPROJECT"));
  } else {
    if (!pomXml.project.groupId || pomXml.project.groupId.length === 0) {
      pomValidationErrors.push(getError("ENOPOMPROJECTGROUPID"));
    }
    if (!pomXml.project.artifactId || pomXml.project.artifactId.length === 0) {
      pomValidationErrors.push(getError("ENOPOMPROJECTARTIFACTID"));
    }
    // does the version need to be set if using semantic-release?
    if (!pomXml.project.version || pomXml.project.version.length === 0) {
      pomValidationErrors.push(getError("ENOPOMPROJECTVERSION"));
    }
  }

  // HELP WANTED: validate more things in pom.xml file

  if (pomValidationErrors.length > 0) {
    throw new AggregateError(pomValidationErrors);
  }
}
