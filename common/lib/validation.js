export const validators = {
  date: field => function(err) {
    const msg = `invalid date format: ${this[field]}`
    try {
      const test = new Date(this[field])
      const chek = test + '' === this[field] + ''
      if (!chek) {
        return err(msg)
      }
    } catch (e) {
      return err(msg)
    }
  },
  initials: field => function(err) {
    const msg = 'invalid initials format'
    if (this[field].length > 10) return err(msg)
    const inflated = this[field].split('.')
    if (inflated.pop() || inflated.some(item => item.length > 1)) {
      return err(msg)
    }
  }
}

export const validRegexp = {
  internationalPhone: /^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/i
}
