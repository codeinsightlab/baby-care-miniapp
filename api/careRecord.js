import request from '../utils/request'

export function createCareRecord(data) {
  return request({
    url: '/api/mini/care-record/create',
    method: 'POST',
    data
  })
}

export function getTodayCareSummary(babyId) {
  return request({
    url: `/api/mini/care-record/today-summary?babyId=${encodeURIComponent(babyId)}`,
    method: 'GET'
  })
}

export function getCareRecordList(params) {
  const query = [`babyId=${encodeURIComponent(params.babyId)}`]
  if (params.date) {
    query.push(`date=${encodeURIComponent(params.date)}`)
  }
  return request({
    url: `/api/mini/care-record/list?${query.join('&')}`,
    method: 'GET'
  })
}
