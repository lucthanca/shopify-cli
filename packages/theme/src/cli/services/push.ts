/* eslint-disable tsdoc/syntax */
import {hasRequiredThemeDirectories, mountThemeFileSystem} from '../utilities/theme-fs.js'
import {uploadTheme} from '../utilities/theme-uploader.js'
import {currentDirectoryConfirmed, themeComponent} from '../utilities/theme-ui.js'
import {ensureThemeStore} from '../utilities/theme-store.js'
import {DevelopmentThemeManager} from '../utilities/development-theme-manager.js'
import {findOrSelectTheme} from '../utilities/theme-selector.js'
import {Role} from '../utilities/theme-selector/fetch.js'
import {AdminSession, ensureAuthenticatedThemes} from '@shopify/cli-kit/node/session'
import {createTheme, fetchChecksums, publishTheme} from '@shopify/cli-kit/node/themes/api'
import {Result, Theme} from '@shopify/cli-kit/node/themes/types'
import {outputInfo} from '@shopify/cli-kit/node/output'
import {
  renderConfirmationPrompt,
  RenderConfirmationPromptOptions,
  renderSuccess,
  renderWarning,
} from '@shopify/cli-kit/node/ui'
import {themeEditorUrl, themePreviewUrl} from '@shopify/cli-kit/node/themes/urls'
import {cwd, resolvePath} from '@shopify/cli-kit/node/path'
import {LIVE_THEME_ROLE, promptThemeName, UNPUBLISHED_THEME_ROLE} from '@shopify/cli-kit/node/themes/utils'

interface ThemeSelectionOptions {
  live?: boolean
  development?: boolean
  unpublished?: boolean
  theme?: string
  'allow-live'?: boolean
}

interface PushOptions {
  path: string
  nodelete?: boolean
  json?: boolean
  force?: boolean
  publish?: boolean
  ignore?: string[]
  only?: string[]
}

interface JsonOutput {
  theme: {
    id: number
    name: string
    role: string
    shop: string
    editor_url: string
    preview_url: string
    warning?: string
  }
}

export interface PushFlags {
  path?: string
  password?: string
  store?: string
  environment?: string
  theme?: string
  development?: boolean
  live?: boolean
  unpublished?: boolean
  nodelete?: boolean
  only?: string[]
  ignore?: string[]
  json?: boolean
  allowLive?: boolean
  publish?: boolean
  force?: boolean
  noColor?: boolean
  verbose?: boolean
}

/**
 * Initiates the push process based on provided flags.
 *
 * @param {PushFlags} flags - The flags for the push operation.
 * @param {string} [flags.path] - The path to your theme directory.
 * @param {string} [flags.password] - Password generated from the Theme Access app.
 * @param {string} [flags.store] - Store URL. It can be the store prefix (example) or the full myshopify.com URL (example.myshopify.com, https://example.myshopify.com).
 * @param {string} [flags.environment] - The environment to apply to the current command.
 * @param {string} [flags.theme] - Theme ID or name of the remote theme.
 * @param {boolean} [flags.development] - Push theme files from your remote development theme.
 * @param {boolean} [flags.live] - Push theme files from your remote live theme.
 * @param {boolean} [flags.unpublished] - Create a new unpublished theme and push to it.
 * @param {boolean} [flags.nodelete] - Runs the push command without deleting local files.
 * @param {string[]} [flags.only] - Download only the specified files (Multiple flags allowed).
 * @param {string[]} [flags.ignore] - Skip downloading the specified files (Multiple flags allowed).
 * @param {boolean} [flags.json] - Output JSON instead of a UI.
 * @param {boolean} [flags.allowLive] - Allow push to a live theme.
 * @param {boolean} [flags.publish] - Publish as the live theme after uploading.
 * @param {boolean} [flags.legacy] - Use the legacy Ruby implementation for the `shopify theme push` command.
 * @param {boolean} [flags.force] - Proceed without confirmation, if current directory does not seem to be theme directory.
 * @param {boolean} [flags.noColor] - Disable color output.
 * @param {boolean} [flags.verbose] - Increase the verbosity of the output.
 * @returns {Promise<void>} Resolves when the push operation is complete.
 */
export async function push(flags: PushFlags) {
  const {path} = flags
  const force = flags.force ?? false

  const store = ensureThemeStore({store: flags.store})
  const adminSession = await ensureAuthenticatedThemes(store, flags.password)

  const workingDirectory = path ? resolvePath(path) : cwd()
  if (!(await hasRequiredThemeDirectories(workingDirectory)) && !(await currentDirectoryConfirmed(force))) {
    return
  }

  const selectedTheme: Theme | undefined = await createOrSelectTheme(adminSession, flags)
  if (!selectedTheme) {
    return
  }

  await executePush(selectedTheme, adminSession, {
    path: workingDirectory,
    nodelete: flags.nodelete || false,
    publish: flags.publish || false,
    json: flags.json || false,
    force,
    ignore: flags.ignore || [],
    only: flags.only || [],
  })
}

/**
 * Executes the push operation for a given theme.
 *
 * @param {Theme} theme - The theme to be pushed.
 * @param {AdminSession} session - The admin session for the theme.
 * @param {PushOptions} options - The options for the push operation.
 * @returns {Promise<void>} Resolves when the push operation is complete.
 */
async function executePush(theme: Theme, session: AdminSession, options: PushOptions) {
  const themeChecksums = await fetchChecksums(theme.id, session)
  const themeFileSystem = mountThemeFileSystem(options.path, {filters: options})

  const {uploadResults, renderThemeSyncProgress} = await uploadTheme(
    theme,
    session,
    themeChecksums,
    themeFileSystem,
    options,
  )

  await renderThemeSyncProgress()

  if (options.publish) {
    await publishTheme(theme.id, session)
  }

  await handlePushOutput(uploadResults, theme, session, options)
}

/**
 * Checks if there are any upload errors in the results.
 *
 * @param {Map<string, Result>} results - The map of upload results.
 * @returns {boolean} - Returns true if there are any upload errors, otherwise false.
 */
function hasUploadErrors(results: Map<string, Result>): boolean {
  for (const [_key, result] of results.entries()) {
    if (!result.success) {
      return true
    }
  }
  return false
}

/**
 * Handles the output based on the push operation results.
 *
 * @param {Map<string, Result>} results - The map of upload results.
 * @param {Theme} theme - The theme being pushed.
 * @param {AdminSession} session - The admin session for the theme.
 * @param {PushOptions} options - The options for the push operation.
 * @returns {Promise<void>} Resolves when the output handling is complete.
 */
async function handlePushOutput(
  results: Map<string, Result>,
  theme: Theme,
  session: AdminSession,
  options: PushOptions,
) {
  const hasErrors = hasUploadErrors(results)

  if (options.json) {
    handleJsonOutput(theme, hasErrors, session)
  } else if (options.publish) {
    handlePublishOutput(hasErrors, session)
  } else {
    handleOutput(theme, hasErrors, session)
  }
}

/**
 * Handles the JSON output for the push operation.
 *
 * @param {Theme} theme - The theme being pushed.
 * @param {boolean} hasErrors - Indicates if there were any errors during the push operation.
 * @param {AdminSession} session - The admin session for the theme.
 * @returns {void}
 */
function handleJsonOutput(theme: Theme, hasErrors: boolean, session: AdminSession) {
  const output: JsonOutput = {
    theme: {
      id: theme.id,
      name: theme.name,
      role: theme.role,
      shop: session.storeFqdn,
      editor_url: themeEditorUrl(theme, session),
      preview_url: themePreviewUrl(theme, session),
    },
  }

  if (hasErrors) {
    const message = `The theme ${themeComponent(theme).join(' ')} was pushed with errors`
    output.theme.warning = message
  }
  outputInfo(JSON.stringify(output))
}

/**
 * Handles the output for the publish operation.
 *
 * @param {boolean} hasErrors - Indicates if there were any errors during the push operation.
 * @param {AdminSession} session - The admin session for the theme.
 * @returns {void}
 */
function handlePublishOutput(hasErrors: boolean, session: AdminSession) {
  if (hasErrors) {
    renderWarning({body: `Your theme was published with errors and is now live at https://${session.storeFqdn}`})
  } else {
    renderSuccess({body: `Your theme is now live at https://${session.storeFqdn}`})
  }
}

/**
 * Handles the output for the push operation.
 *
 * @param {Theme} theme - The theme being pushed.
 * @param {boolean} hasErrors - Indicates if there were any errors during the push operation.
 * @param {AdminSession} session - The admin session for the theme.
 * @returns {void}
 */
function handleOutput(theme: Theme, hasErrors: boolean, session: AdminSession) {
  const nextSteps = [
    [
      {
        link: {
          label: 'View your theme',
          url: themePreviewUrl(theme, session),
        },
      },
    ],
    [
      {
        link: {
          label: 'Customize your theme at the theme editor',
          url: themeEditorUrl(theme, session),
        },
      },
    ],
  ]

  if (hasErrors) {
    renderWarning({
      body: ['The theme', ...themeComponent(theme), 'was pushed with errors'],
      nextSteps,
    })
  } else {
    renderSuccess({
      body: ['The theme', ...themeComponent(theme), 'was pushed successfully.'],
      nextSteps,
    })
  }
}

export async function createOrSelectTheme(
  adminSession: AdminSession,
  flags: ThemeSelectionOptions,
): Promise<Theme | undefined> {
  const {live, development, unpublished, theme} = flags

  if (development) {
    const themeManager = new DevelopmentThemeManager(adminSession)
    return themeManager.findOrCreate()
  } else if (unpublished) {
    const themeName = theme || (await promptThemeName('Name of the new theme'))
    return createTheme(
      {
        name: themeName,
        role: UNPUBLISHED_THEME_ROLE,
      },
      adminSession,
    )
  } else {
    const selectedTheme = await findOrSelectTheme(adminSession, {
      header: 'Select a theme to push to:',
      filter: {
        live,
        theme,
      },
    })

    if (await confirmPushToTheme(selectedTheme.role as Role, flags['allow-live'], adminSession.storeFqdn)) {
      return selectedTheme
    }
  }
}

async function confirmPushToTheme(themeRole: Role, allowLive: boolean | undefined, storeFqdn: string) {
  if (themeRole === LIVE_THEME_ROLE) {
    if (allowLive) {
      return true
    }

    const options: RenderConfirmationPromptOptions = {
      message: `Push theme files to the ${themeRole} theme on ${storeFqdn}?`,
      confirmationMessage: 'Yes, confirm changes',
      cancellationMessage: 'Cancel',
    }

    return renderConfirmationPrompt(options)
  }
  return true
}
