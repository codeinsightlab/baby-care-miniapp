const textReplacements = [
  ['家庭成员', '照顾人'],
  ['加入家庭', '加入宝宝协作'],
  ['创建家庭', '创建宝宝协作'],
  ['家庭管理', '宝宝协作'],
  ['家庭', '宝宝协作']
]

export function sanitizeVisibleText(value) {
  if (value === null || value === undefined) {
    return value
  }
  let text = String(value)
  textReplacements.forEach(([source, target]) => {
    text = text.split(source).join(target)
  })
  return text
}

export function sanitizeVisibleTextObject(source, keys) {
  const target = { ...(source || {}) }
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      target[key] = sanitizeVisibleText(target[key])
    }
  })
  return target
}
