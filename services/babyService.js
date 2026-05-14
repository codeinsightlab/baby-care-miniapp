import { createBaby, getBabyDetail, getBabyList } from '../api/baby'
import { createFamily } from '../api/family'
import { sanitizeVisibleText } from './textSanitizer'

const genderTextMap = {
  0: '性别未设置',
  1: '男宝',
  2: '女宝',
  UNKNOWN: '性别未设置',
  MALE: '男宝',
  FEMALE: '女宝'
}

function getInitial(nickname) {
  return nickname ? String(nickname).slice(0, 1) : '宝'
}

function getAgeText(birthday) {
  if (!birthday) {
    return '未设置'
  }
  const date = new Date(String(birthday).replace(/-/g, '/'))
  if (Number.isNaN(date.getTime())) {
    return '未设置'
  }
  const today = new Date()
  let months = (today.getFullYear() - date.getFullYear()) * 12 + today.getMonth() - date.getMonth()
  if (today.getDate() < date.getDate()) {
    months -= 1
  }
  if (months < 0) {
    return '未设置'
  }
  if (months < 1) {
    return '0-1月龄'
  }
  if (months < 12) {
    return `${months}-${months + 1}月龄`
  }
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  return restMonths ? `${years}岁${restMonths}个月` : `${years}岁`
}

export function toBabyViewModel(raw) {
  if (!raw) {
    return null
  }
  const nickname = sanitizeVisibleText(raw.nickname || '')
  return {
    babyId: raw.babyId,
    familyId: raw.familyId,
    nickname,
    gender: raw.gender,
    genderText: genderTextMap[raw.gender] || '性别未设置',
    birthday: raw.birthday || '',
    avatarUrl: raw.avatarUrl || '',
    status: raw.status,
    initial: getInitial(nickname),
    ageText: getAgeText(raw.birthday)
  }
}

export async function fetchBabyList(requestOptions = {}) {
  const response = await getBabyList(requestOptions)
  const list = Array.isArray(response.data) ? response.data : []
  return list.map(toBabyViewModel).filter(Boolean)
}

export async function fetchBabyDetail(babyId, requestOptions = {}) {
  const response = await getBabyDetail(babyId, requestOptions)
  const baby = toBabyViewModel(response && response.data ? response.data : null)
  if (!baby || !baby.babyId) {
    throw new Error('当前宝宝不存在')
  }
  return baby
}

export async function createBabyWithDefaultFamily(form) {
  const nickname = String(form.nickname || '').trim()
  const familyResponse = await createFamily({
    familyName: `${nickname}的共同照护`
  })
  const familyId = familyResponse && familyResponse.familyId
  if (!familyId) {
    throw new Error('创建宝宝所需数据不完整')
  }

  const babyResponse = await createBaby({
    familyId,
    nickname,
    gender: form.gender,
    birthday: form.birthday
  })
  const babyId = babyResponse && babyResponse.babyId
  if (!babyId) {
    throw new Error('创建宝宝返回数据不完整')
  }
  return {
    babyId,
    familyId
  }
}
