import presenterGuide from '../../../../docs/user-guide-presenter.md?raw'
import { UserGuidePage } from './UserGuidePage'

export function PresenterGuidePage() {
  return <UserGuidePage markdown={presenterGuide} title="Presenter Guide" />
}
