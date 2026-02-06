import { Address } from 'viem'
import { PASSPORT_API_KEY, PASSPORT_API_URL } from '../utils/config'

// Type definitions for the API response
interface PassportScoreResponse {
  address: string
  details: {
    models: {
      aggregate: {
        score: number
      }
    }
  }
}

/**
 * Fetches the Gitcoin Passport score for a given wallet address
 * @param walletAddress - Ethereum wallet address
 * @returns Promise with the passport score response
 * @throws Error if the API call fails
 */
export async function getPassportScore(
  walletAddress: Address
): Promise<PassportScoreResponse> {
  if (!PASSPORT_API_KEY) {
    throw new Error('Passport API key is not configured')
  }

  try {
    const response = await fetch(
      `${PASSPORT_API_URL}/passport/analysis/${walletAddress}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': PASSPORT_API_KEY
        }
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()

    return data as PassportScoreResponse
  } catch (error) {
    throw new Error(
      `Failed to fetch passport score: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// Helper function to extract just the score
export function extractPassportScore(response: PassportScoreResponse): number {
  return response.details.models.aggregate.score
}
