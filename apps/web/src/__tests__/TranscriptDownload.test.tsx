import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TranscriptDownload } from '../components/TranscriptDownload'

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '../lib/api'

describe('TranscriptDownload', () => {
  it('shows a pill trigger button (not a <select>) when transcript is ready', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        status: 'ready',
        languages: [
          { language: 'en', content: 'Hello world' },
          { language: 'mi', content: 'Kia ora' },
        ],
      },
    })

    render(
      <TranscriptDownload
        eventCode="ABC123"
        eventTitle="Test Event"
      />
    )

    // Click the initial "View Transcript" button to fetch
    fireEvent.click(screen.getByText('View Transcript'))

    // Wait for the ready state
    await waitFor(() => {
      // Should show a button trigger (not a select)
      expect(screen.queryByRole('combobox')).toBeNull()
      // Should show a Download Image button
      expect(screen.getByText('Download Image')).toBeDefined()
    })
  })
})
