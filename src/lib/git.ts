import type { execa } from "execa";
import { PrepareContext, PublishContext } from "semantic-release";
import { MavenPluginOptions } from "./types";

type ExecaOptions = Parameters<typeof execa>[1];

/**
 * Add a list of file to the Git index. `.gitignore` will be ignored.
 *
 * @param {Array<String>} files Array of files path to add to the index.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 */
async function add(files: string[], execaOpts: ExecaOptions) {
  const { execa } = await import("execa");
  await execa("git", ["add", "--force", "--ignore-errors", ...files], {
    ...execaOpts,
    reject: false,
  });
}

/**
 * Commit to the local repository.
 *
 * @param {String} message Commit message.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the commit failed.
 */
async function commit(message: string, execaOpts: ExecaOptions) {
  const { execa } = await import("execa");
  await execa("git", ["commit", "-m", message], execaOpts);
}

/**
 * Push to the remote repository.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} branch The branch to push.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the push failed.
 */
async function push(origin: string, branch: string, execaOpts: ExecaOptions) {
  const { execa } = await import("execa");
  await execa(
    "git",
    ["push", "--follow-tags", origin, `HEAD:${branch}`],
    execaOpts
  );
}

export async function configureGit(context: PublishContext) {
  const { execa } = await import("execa");
  const { branch, cwd, env, logger } = context;
  const execaOpts = { env, cwd };

  // fetch all branches because Travis doesn't do it for us
  // code copied from https://stackoverflow.com/a/44036486/269834
  logger.log("configuring git");
  await execa(
    "git",
    [
      "config",
      "--replace-all",
      "remote.origin.fetch",
      "+refs/heads/*:refs/remotes/origin/*",
    ],
    execaOpts
  );

  // fetch everything
  logger.log("fetching branches");
  await execa("git", ["fetch"], execaOpts);

  // checkout the release branch and pull latest
  logger.log("checking out release branch");
  await execa("git", ["checkout", branch.name], execaOpts);

  logger.log("pulling");
  await execa("git", ["pull"], execaOpts);
}

/**
 * Merges the master branch into the dev branch.  The devBranch must be specified
 * in the options for this to work.
 */
export async function mergeMasterIntoDev(
  config: MavenPluginOptions,
  context: PublishContext
) {
  const { execa } = await import("execa");
  const { branch, cwd, env, logger } = context;
  const execaOpts = { env, cwd };
  const { devBranch, repositoryUrl } = config;

  logger.log("Merging master branch into dev branch");

  // checkout dev branch
  logger.log("checking out dev branch");
  await execa("git", ["checkout", devBranch!], execaOpts);

  // merge
  logger.log("merging release branch into dev branch");
  await execa("git", ["merge", branch.name], execaOpts);

  // push
  logger.log("pushing dev branch");
  await push(repositoryUrl!, devBranch!, execaOpts);

  logger.log("merge and push successful!");
}

/**
 * Commit, add and push changes to the pom.xml file(s)
 */
export async function saveChangesToPomXml(
  config: MavenPluginOptions,
  context: PublishContext | PrepareContext,
  versionStr: string
) {
  const { branch, cwd, env, logger } = context;
  const { repositoryUrl } = config;
  const execaOpts = { env, cwd };

  const isSnapshotVersion = versionStr.indexOf("SNAPSHOT") > -1;
  let commitMessage;
  if (isSnapshotVersion) {
    commitMessage = `Prepare next development iteration ${versionStr}`;
    if (config.disableSnapshotSkipCi == null || !config.disableSnapshotSkipCi) {
      commitMessage += " [ci skip]";
    }
  } else {
    commitMessage = `${versionStr}`;
    if (config.disableFinalSkipCi == null || !config.disableFinalSkipCi) {
      commitMessage += " [ci skip]";
    }
  }

  logger.log("adding pom.xml files to a commmit");
  await add(["pom.xml"], execaOpts);
  try {
    await add(["*/pom.xml"], execaOpts);
  } catch {
    // this will error out on non-multi-project projects
    logger.log("INFO: no multi-project pom.xml files found to add to commit");
  }

  if (
    config.additionalFilesToCommit !== undefined &&
    config.additionalFilesToCommit.length > 0
  ) {
    logger.log(
      "adding additional files to commit: " + config.additionalFilesToCommit
    );
    const additionalFiles = config.additionalFilesToCommit.split(",");
    await add(additionalFiles, execaOpts);
  }

  logger.log("committing changes");
  await commit(commitMessage, execaOpts);
  process.stdout.write("\n");

  logger.log("pushing changes");
  await push(repositoryUrl!, branch.name, execaOpts);

  logger.log("changes pushed");
}
