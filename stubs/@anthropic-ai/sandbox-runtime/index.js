class SandboxViolationStore {}

class SandboxManager {
  static checkDependencies() {
    return { errors: ['sandbox runtime stubbed'], warnings: [] };
  }

  static isSupportedPlatform() {
    return false;
  }

  static async initialize() {}

  static updateConfig() {}

  static async reset() {}

  static getFsReadConfig() {
    return { allowOnly: [], denyWithinAllow: [] };
  }

  static getFsWriteConfig() {
    return { allowOnly: [], denyWithinAllow: [] };
  }

  static getNetworkRestrictionConfig() {
    return { allowedDomains: [], deniedDomains: [] };
  }

  static getIgnoreViolations() {
    return undefined;
  }

  static getAllowUnixSockets() {
    return undefined;
  }

  static getAllowLocalBinding() {
    return undefined;
  }

  static getEnableWeakerNestedSandbox() {
    return undefined;
  }

  static getProxyPort() {
    return undefined;
  }

  static getSocksProxyPort() {
    return undefined;
  }

  static getLinuxHttpSocketPath() {
    return undefined;
  }

  static getLinuxSocksSocketPath() {
    return undefined;
  }

  static async waitForNetworkInitialization() {
    return false;
  }

  static getSandboxViolationStore() {
    return new SandboxViolationStore();
  }

  static annotateStderrWithSandboxFailures(_command, stderr) {
    return stderr;
  }

  static cleanupAfterCommand() {}

  static async wrapWithSandbox(command) {
    return command;
  }
}

const SandboxRuntimeConfigSchema = { parse: x => x };

export { SandboxManager, SandboxRuntimeConfigSchema, SandboxViolationStore };
