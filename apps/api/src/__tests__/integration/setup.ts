/**
 * Integration test setup — loads real .env values OVER the placeholder values
 * injected by vitest.integration.config.ts.
 *
 * Allows test.skipIf to detect missing keys by checking for the placeholder sentinel.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true })
