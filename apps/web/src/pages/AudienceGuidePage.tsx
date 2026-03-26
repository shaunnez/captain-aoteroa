import audienceGuide from '../../../../docs/user-guide-audience.md?raw'
import { UserGuidePage } from './UserGuidePage'

export function AudienceGuidePage() {
  return <UserGuidePage markdown={audienceGuide} title="Audience Guide" />
}
