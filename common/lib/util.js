export function stripProps(obj, _props) {
  const props = typeof _props === 'object' && _props.length ? _props : [_props]
  props.forEach(prop => {
    if (typeof obj.unsetAttribute === 'function') {
      obj.unsetAttribute(prop)
    } else {
      delete obj[prop]
    }
  })
}

export function getShortEnv() {
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'development') return 'dev'
  if (nodeEnv === 'acceptance') return 'acc'
  return 'prod'
}
