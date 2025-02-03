import { access, constants } from "fs";
import type { NextRelease } from "semantic-release";
import type { Logger } from "./types";
import { exec, getError } from "./util";

/**
 * @return './mvnw' if we have wrapper in the project root, 'mvn' otherwise
 */
async function findCommand() {
  return new Promise<string>((resolve, reject) => {
    access("mvnw", constants.F_OK, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          resolve("mvn");
        } else {
          reject(err);
        }
      } else {
        resolve("./mvnw");
      }
    });
  });
}

/**
 * Change the version number in the pom.xml file(s). This also includes the
 * command option to delete the backup pom files as they are not needed and can
 * create unneccessary files that shouldn't be checked in to version control.
 * See https://www.mojohaus.org/versions-maven-plugin/set-mojo.html#generateBackupPoms
 */
export async function updateVersionInPomXml(
  logger: Logger,
  versionStr: string
) {
  logger.log(`Updating pom.xml to version ${versionStr}`);
  const command = await findCommand();
  await exec(command, [
    "versions:set",
    "-DgenerateBackupPoms=false",
    `-DnewVersion=${versionStr}`,
  ]);
}

/**
 * Run the maven command to deploy the project. The tests are skipped because it
 * is assumed that they have already successfully been ran in the script part of
 * the CI build.
 */
export async function deploy(logger: Logger, nextRelease: NextRelease) {
  logger.log("Deploying version %s with maven", nextRelease.version);
  try {
    const command = await findCommand();
    await exec(command, [
      "deploy",
      "-DskipTests",
      "--settings",
      "maven-settings.xml",
    ]);
  } catch (e) {
    logger.error("failed to deploy to maven");
    logger.error(e);
    throw getError("EMAVENDEPLOY");
  }
}

/**
 * Run the maven command to package the project. `package` is a reserved word,
 * so that's why the function is named this way. The tests are skipped because
 * it is assumed that they have already successfully been ran in the script part
 * of the CI build.
 */
export async function mvnPackage(logger: Logger) {
  logger.log("Packaging with maven");
  try {
    const command = await findCommand();
    await exec(command, ["package", "-DskipTests"]);
  } catch (e) {
    logger.error("failed to package with maven");
    logger.error(e);
    throw getError("EMAVENPACKAGE");
  }
}
