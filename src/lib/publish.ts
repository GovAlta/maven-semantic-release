import { PublishContext } from "semantic-release";
import type { MavenPluginOptions } from "./types.js";
import { configureGit, mergeMasterIntoDev, saveChangesToPomXml } from "./git.js";
import { deploy, mvnPackage, updateVersionInPomXml } from "./maven.js";
import { printVersion } from "./util.js";

/**
 * Publish repo to maven
 * 1. Perform the release using the mvn command
 * 2. Make another commit updating to the next snapshot version
 */
export async function publish(
  config: MavenPluginOptions,
  context: PublishContext
) {
  const { logger, nextRelease } = context;
  printVersion(logger);

  if (!config.skipMavenDeploy) {
    // deploy the project to maven-central
    await deploy(logger, nextRelease);
  } else if (config.useConveyalWorkflow) {
    // Although this library is being ran with instructions to skip the
    // deployment to maven central, the package command is still needed in the
    // Conveyal workflow. This is because sometimes the jar that is generated
    // from the package command when the project is in the release state commit
    // is needed by other tasks in Travis.
    // See https://github.com/conveyal/datatools-server/issues/181
    await mvnPackage(logger);
  }

  // special logic to do some extra Conveyal-specific tasks
  if (config.useConveyalWorkflow) {
    // do some extra configuration to allow pushing more than 1 commit
    await configureGit(context);

    // bump to snapshot version
    const nextSnapshotVersion = nextRelease.version
      .split(".")
      .map((s) => parseInt(s, 10));
    nextSnapshotVersion[2] += 1;
    const nextSnapshotVersionStr = `${nextSnapshotVersion.join(".")}-SNAPSHOT`;

    await updateVersionInPomXml(logger, nextSnapshotVersionStr);

    // commit and push snapshot version
    await saveChangesToPomXml(config, context, nextSnapshotVersionStr);

    if (config.devBranch) {
      // merge master into dev
      await mergeMasterIntoDev(config, context);
    }
  }
}
