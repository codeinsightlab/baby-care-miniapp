import request from '../utils/request'
import { appendQueryString } from '../utils/requestQuery'

export function createCareRecord(data) {
  return request({
    url: '/api/mini/care-record/create',
    method: 'POST',
    data
  })
}

export function getTodayCareSummary(babyId) {
  return request({
    url: appendQueryString('/api/mini/care-record/today-summary', { babyId }),
    method: 'GET'
  })
}

export function getCareRecordList(params) {
  return request({
    url: appendQueryString('/api/mini/care-record/list', params),
    method: 'GET'
  })
}
