import { sha256Hex } from './sha256'

export const PIN_LENGTH = 4

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

export function makeSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function hashPin(pin: string, salt: string): string {
  return sha256Hex(`${salt}:${pin}`)
}

export function verifyPin(pin: string, salt: string, expectedHash: string): boolean {
  return hashPin(pin, salt) === expectedHash
}
