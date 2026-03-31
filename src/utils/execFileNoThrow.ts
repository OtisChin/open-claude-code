// This file represents useful wrappers over node:child_process
// These wrappers ease error handling and cross-platform compatbility
// By using execa, Windows automatically gets shell escaping + BAT / CMD handling

import { spawn } from 'child_process'
import { getCwd } from '../utils/cwd.js'
import { logError } from './log.js'

export { execSyncWithDefaults_DEPRECATED } from './execFileNoThrowPortable.js'

const MS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60

type ExecFileOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  // Setting useCwd=false avoids circular dependencies during initialization
  // getCwd() -> PersistentShell -> logEvent() -> execFileNoThrow
  useCwd?: boolean
  env?: NodeJS.ProcessEnv
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

export function execFileNoThrow(
  file: string,
  args: string[],
  options: ExecFileOptions = {
    timeout: 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: true,
    useCwd: true,
  },
): Promise<{ stdout: string; stderr: string; code: number; error?: string }> {
  return execFileNoThrowWithCwd(file, args, {
    abortSignal: options.abortSignal,
    timeout: options.timeout,
    preserveOutputOnError: options.preserveOutputOnError,
    cwd: options.useCwd ? getCwd() : undefined,
    env: options.env,
    stdin: options.stdin,
    input: options.input,
  })
}

type ExecFileWithCwdOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  maxBuffer?: number
  cwd?: string
  env?: NodeJS.ProcessEnv
  shell?: boolean | string | undefined
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

/**
 * execFile, but always resolves (never throws)
 */
export function execFileNoThrowWithCwd(
  file: string,
  args: string[],
  {
    abortSignal,
    timeout: finalTimeout = 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: finalPreserveOutput = true,
    cwd: finalCwd,
    env: finalEnv,
    maxBuffer,
    shell,
    stdin: finalStdin,
    input: finalInput,
  }: ExecFileWithCwdOptions = {
    timeout: 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: true,
    maxBuffer: 1_000_000,
  },
): Promise<{ stdout: string; stderr: string; code: number; error?: string }> {
  return new Promise(resolve => {
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let settled = false
    let timedOut = false
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const child = spawn(file, args, {
      cwd: finalCwd,
      env: finalEnv,
      shell,
      signal: abortSignal,
      stdio: [
        finalStdin ?? (finalInput !== undefined ? 'pipe' : 'pipe'),
        'pipe',
        'pipe',
      ],
    })

    const finish = (result: {
      stdout: string
      stderr: string
      code: number
      error?: string
    }) => {
      if (settled) {
        return
      }
      settled = true
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
      resolve(result)
    }

    const takeStdout = () => Buffer.concat(stdoutChunks).toString('utf8')
    const takeStderr = () => Buffer.concat(stderrChunks).toString('utf8')

    if (maxBuffer !== undefined) {
      const checkBufferLimit = () => {
        const size =
          stdoutChunks.reduce((sum, chunk) => sum + chunk.length, 0) +
          stderrChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        if (size > maxBuffer && !settled) {
          child.kill()
          finish({
            stdout: finalPreserveOutput ? takeStdout() : '',
            stderr: finalPreserveOutput ? takeStderr() : '',
            code: 1,
            error: `maxBuffer exceeded (${maxBuffer})`,
          })
        }
      }
      child.stdout?.on('data', chunk => {
        stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        checkBufferLimit()
      })
      child.stderr?.on('data', chunk => {
        stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        checkBufferLimit()
      })
    } else {
      child.stdout?.on('data', chunk => {
        stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      child.stderr?.on('data', chunk => {
        stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
    }

    child.on('error', error => {
      logError(error)
      finish({
        stdout: '',
        stderr: '',
        code: 1,
        error: error.message,
      })
    })

    child.on('close', (code, signal) => {
      const stdout = takeStdout()
      const stderr = takeStderr()
      const exitCode = code ?? 1
      if (exitCode === 0 && !timedOut) {
        finish({
          stdout,
          stderr,
          code: 0,
        })
        return
      }
      finish({
        stdout: finalPreserveOutput ? stdout : '',
        stderr: finalPreserveOutput ? stderr : '',
        code: exitCode,
        error: timedOut ? 'timeout' : signal || String(exitCode),
      })
    })

    if (finalTimeout && finalTimeout > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true
        if (!settled) {
          child.kill()
        }
      }, finalTimeout)
    }

    if (child.stdin && finalInput !== undefined) {
      child.stdin.write(finalInput)
      child.stdin.end()
    } else if (child.stdin && finalStdin !== 'inherit') {
      child.stdin.end()
    }
  })
}
