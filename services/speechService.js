import {
  confirmVoiceRecord,
  getVoiceRecordDetail,
  recognizeVoiceMock
} from '../api/voiceRecord'
import { createCareRecord } from '../api/careRecord'
import { isMockVoiceEnabled } from '../config/env'
import { sanitizeVisibleText } from './textSanitizer'

const statusLabels = {
  RECOGNIZED: '已识别',
  FAILED: '识别失败',
  CONFIRMED: '已确认'
}

function pad(number) {
  return number < 10 ? `0${number}` : `${number}`
}

export function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function toVoiceRecordViewModel(raw) {
  const data = raw || {}
  const recognizeText = sanitizeVisibleText(data.recognizeText || '')
  const confirmText = sanitizeVisibleText(data.confirmText || '')
  return {
    voiceRecordId: data.voiceRecordId,
    babyId: data.babyId,
    recognizeText,
    confirmText,
    finalText: confirmText || recognizeText,
    status: data.status || '',
    statusLabel: data.statusLabel || statusLabels[data.status] || '待确认',
    failReason: sanitizeVisibleText(data.failReason || ''),
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || ''
  }
}

export async function mockRecognizeVoice({ babyId, mockText, mockFail = false }) {
  if (!isMockVoiceEnabled()) {
    throw new Error('语音输入暂未开放')
  }
  const response = await recognizeVoiceMock({
    babyId,
    mockText,
    mockFail
  })
  return toVoiceRecordViewModel(response && response.data ? response.data : null)
}

export async function fetchVoiceRecordDetail(voiceRecordId) {
  const response = await getVoiceRecordDetail(voiceRecordId)
  return toVoiceRecordViewModel(response && response.data ? response.data : null)
}

export async function confirmVoiceText({ voiceRecordId, confirmText }) {
  const response = await confirmVoiceRecord({
    voiceRecordId,
    confirmText
  })
  return toVoiceRecordViewModel(response && response.data ? response.data : null)
}

export function createCareRecordFromRemark({ babyId, recordType, remark, voiceRecordId }) {
  const payload = {
    babyId,
    recordType,
    recordTime: formatDateTime(new Date()),
    remark
  }
  if (voiceRecordId) {
    payload.voiceRecordId = voiceRecordId
  }
  return createCareRecord(payload)
}
