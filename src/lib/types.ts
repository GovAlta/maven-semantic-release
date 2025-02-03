import type { BaseContext } from "semantic-release";

export interface MavenPluginOptions {
  skipMavenDeploy?: boolean;
  repositoryUrl?: string;
  disableSnapshotSkipCi?: boolean;
  disableFinalSkipCi?: boolean;
  useConveyalWorkflow?: boolean;
  devBranch?: string;
  additionalFilesToCommit?: string;
}

export type Logger = BaseContext["logger"];

export interface Pom {
  project: {
    version: string[];
    groupId: string[];
    artifactId: string[];
  };
}

export interface MavenCentral {
  docs: { latestVersion: string }[];
}
