import _ from 'lodash'
import {getCatalog} from 'i18n'

const locales = Object.keys(getCatalog())
const countryCodes = locales.map(locale => locale.substr(3, 2))
const types = {
  EU: ['NL', 'DE', 'BE'],
}
export const addressTypes = {}
_.each(types, (countryCodes, type) => {
  countryCodes.forEach(countryCode => {
    addressTypes[countryCode] = type
  })
})

export default (Address) => {}
