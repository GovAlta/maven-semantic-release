import { PublishContext } from "semantic-release";
import type { MavenPluginOptions } from "./types";
import { saveChangesToPomXml } from "./git";
import { updateVersionInPomXml } from "./maven";
import { printVersion } from "./util";

export async function prepare(
  config: MavenPluginOptions,
  context: PublishContext
) {
  const { logger, nextRelease } = context;
  printVersion(logger);

  // set and commit version number in pom.xml
  await updateVersionInPomXml(logger, nextRelease.version);

  // special logic to do some extra Conveyal-specific tasks
  if (config.useConveyalWorkflow) {
    // commit and push version that was just deployed
    await saveChangesToPomXml(config, context, nextRelease.version);
  }
}
