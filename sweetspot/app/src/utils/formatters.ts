import { ethers } from 'ethers'

export function formatAddress(
  address: string,
  totalLength: number = 13
): string {
  if (totalLength < 5) return address // Handle too small lengths
  const ellipsis = '...'
  const partLength = Math.floor((totalLength - ellipsis.length) / 2)
  return `${address.slice(0, partLength)}${ellipsis}${address.slice(-partLength)}`
}

export function formatEther(wei: string): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(4)
}

/**
 * Formats a Unix timestamp into a string with date and time including timezone.
 *
 * @param timestamp - The Unix timestamp to format, in seconds.
 * @returns A formatted date string in "MM/DD/YYYY, HH:MM:SS TZ" format.
 */

export function formatDate(timestamp: number): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short' // Include the timezone
  }
  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(timestamp * 1000)
  )
}

/**
 * Formats a Unix timestamp into a string with date, without time and timezone.
 *
 * @param timestamp - The Unix timestamp to format, in seconds.
 * @returns A formatted date string in "MM/DD/YYYY" format.
 */

export function formatShortDate(timestamp: number | string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(Number(timestamp) * 1000)
  )
}
