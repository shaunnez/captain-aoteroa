import { config } from '../config'

const AZURE_TRANSLATOR_URL = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0'
const MAX_TARGETS_PER_REQUEST = 25

/**
 * Translate text using Azure Translator REST API.
 * Splits into batches if more than 25 target languages (Azure limit).
 */
export async function translateText(
  text: string,
  fromLang: string,
  toLangs: string[],
): Promise<Record<string, string>> {
  if (toLangs.length === 0) return {}

  const results: Record<string, string> = {}

  // Split into batches of 25
  for (let i = 0; i < toLangs.length; i += MAX_TARGETS_PER_REQUEST) {
    const batch = toLangs.slice(i, i + MAX_TARGETS_PER_REQUEST)
    const toParam = batch.map((l) => `to=${l}`).join('&')
    const url = `${AZURE_TRANSLATOR_URL}&from=${fromLang}&${toParam}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': config.azure.speechKey,
        'Ocp-Apim-Subscription-Region': config.azure.speechRegion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    })

    if (!res.ok) {
      console.error(`[translateText] Azure Translator error: ${res.status} ${res.statusText}`)
      continue
    }

    const data = await res.json()
    for (const t of data[0]?.translations || []) {
      results[t.to] = t.text
    }
  }

  return results
}
