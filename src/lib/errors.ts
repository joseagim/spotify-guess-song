import type { EngineFailure, EngineId } from '../engines/types'

export type Service = 'Deezer' | 'Spotify'

export class NetworkError extends Error {
  readonly service: Service
  constructor(service: Service) {
    super(`${service} could not be reached`)
    this.name = 'NetworkError'
    this.service = service
  }
}

export class RateLimitError extends Error {
  readonly service: Service
  readonly retryAfterSec: number
  constructor(service: Service, retryAfterSec: number) {
    super(`${service} rate limit reached`)
    this.name = 'RateLimitError'
    this.service = service
    this.retryAfterSec = retryAfterSec
  }
}

export class HttpError extends Error {
  readonly service: Service
  readonly status: number
  readonly detail: string
  constructor(service: Service, status: number, detail = '') {
    super(`${service} responded with ${status}${detail ? `: ${detail}` : ''}`)
    this.name = 'HttpError'
    this.service = service
    this.status = status
    this.detail = detail
  }
}

export class TrackUnavailableError extends Error {
  readonly engine: EngineId
  constructor(engine: EngineId) {
    super(`Track not available on ${engine}`)
    this.name = 'TrackUnavailableError'
    this.engine = engine
  }
}

export class EngineUnavailableError extends Error {
  readonly engine: EngineId
  readonly failure: EngineFailure
  readonly detail?: string
  constructor(engine: EngineId, failure: EngineFailure, detail?: string) {
    super(`${engine} engine unavailable: ${failure}${detail ? ` (${detail})` : ''}`)
    this.name = 'EngineUnavailableError'
    this.engine = engine
    this.failure = failure
    this.detail = detail
  }
}

export class LoginError extends Error {
  readonly code: string
  constructor(code: string) {
    super(`Login failed: ${code}`)
    this.name = 'LoginError'
    this.code = code
  }
}

/** A clip was interrupted by stop() or by a newer clip. Not shown to the user. */
export class ClipCancelledError extends Error {
  constructor() {
    super('Clip cancelled')
    this.name = 'ClipCancelledError'
  }
}
