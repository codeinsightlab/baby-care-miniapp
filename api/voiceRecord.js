import request from '../utils/request'

export function recognizeVoiceMock(data) {
  return request({
    url: '/api/mini/voice-record/recognize-mock',
    method: 'POST',
    data
  })
}

export function confirmVoiceRecord(data) {
  return request({
    url: '/api/mini/voice-record/confirm',
    method: 'POST',
    data
  })
}

export function getVoiceRecordDetail(voiceRecordId) {
  return request({
    url: `/api/mini/voice-record/${encodeURIComponent(voiceRecordId)}`,
    method: 'GET'
  })
}
