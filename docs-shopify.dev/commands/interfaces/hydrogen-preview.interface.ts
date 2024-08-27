// This is an autogenerated file. Don't edit this file manually.
export interface hydrogenpreview {
  /**
   * Builds the app before starting the preview server.
   *
   */
  '--build'?: ''

  /**
   * Automatically generates GraphQL types for your project’s Storefront API queries.
   *
   */
  '--codegen'?: ''

  /**
   * Specifies a path to a codegen configuration file. Defaults to `<root>/codegen.ts` if this file exists.
   *
   */
  '--codegen-config-path <value>'?: string

  /**
   * Enables inspector connections to the server with a debugger such as Visual Studio Code or Chrome DevTools.
   * @environment SHOPIFY_HYDROGEN_FLAG_DEBUG
   */
  '--debug'?: ''

  /**
   * Entry file for the worker. Defaults to `./server`.
   * @environment SHOPIFY_HYDROGEN_FLAG_ENTRY
   */
  '--entry <value>'?: string

  /**
   * Specifies the environment to perform the operation using its handle. Fetch the handle using the `env list` command.
   *
   */
  '--env <value>'?: string

  /**
   * Specifies the environment to perform the operation using its Git branch name.
   * @environment SHOPIFY_HYDROGEN_ENVIRONMENT_BRANCH
   */
  '--env-branch <value>'?: string

  /**
   * Path to an environment file to override existing environment variables. Defaults to the '.env' located in your project path `--path`.
   *
   */
  '--env-file <value>'?: string

  /**
   * The port where the inspector is available. Defaults to 9229.
   * @environment SHOPIFY_HYDROGEN_FLAG_INSPECTOR_PORT
   */
  '--inspector-port <value>'?: string

  /**
   * Runs the app in a Node.js sandbox instead of an Oxygen worker.
   * @environment SHOPIFY_HYDROGEN_FLAG_LEGACY_RUNTIME
   */
  '--legacy-runtime'?: ''

  /**
   * The path to the directory of the Hydrogen storefront. Defaults to the current directory where the command is run.
   * @environment SHOPIFY_HYDROGEN_FLAG_PATH
   */
  '--path <value>'?: string

  /**
   * The port to run the server on. Defaults to 3000.
   * @environment SHOPIFY_HYDROGEN_FLAG_PORT
   */
  '--port <value>'?: string

  /**
   * Outputs more information about the command's execution.
   * @environment SHOPIFY_HYDROGEN_FLAG_VERBOSE
   */
  '--verbose'?: ''

  /**
   * Watches for changes and rebuilds the project.
   *
   */
  '--watch'?: ''
}
