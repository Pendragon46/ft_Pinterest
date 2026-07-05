// Makes t('...') keys type-checked against the English resource shape:
// a typo or a key missing from en/common.json becomes a compile error.
import 'i18next'

import type common from './locales/en/common.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
    }
  }
}
