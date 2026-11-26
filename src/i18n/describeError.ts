import { ENGINE_NAMES, type EngineFailure } from '../engines/types'
import {
  EngineUnavailableError,
  HttpError,
  LoginError,
  NetworkError,
  RateLimitError,
  TrackUnavailableError,
} from '../lib/errors'
import type { Translate } from './translate'

/** Technical details stay in the diagnostics log; the UI shows a translated sentence. */
export function describeFailure(failure: EngineFailure, t: Translate): string {
  return t(`failure.${failure}`)
}

/** Turns any thrown value into a translated, user-facing sentence. */
export function describeError(error: unknown, t: Translate): string {
  if (error instanceof NetworkError) return t('errors.network', { service: error.service })
  if (error instanceof RateLimitError) {
    return t('errors.rateLimit', { service: error.service, seconds: error.retryAfterSec })
  }
  if (error instanceof TrackUnavailableError) {
    return t('errors.trackUnavailable', { engine: ENGINE_NAMES[error.engine] })
  }
  if (error instanceof EngineUnavailableError) return describeFailure(error.failure, t)
  if (error instanceof LoginError) return t('errors.login', { code: error.code })
  if (error instanceof HttpError)
    return t('errors.http', { service: error.service, status: error.status })
  return t('errors.unknown', { message: error instanceof Error ? error.message : String(error) })
}
