import request from '../utils/request'

export function getTodayTimelineEvents(babyId) {
  return request({
    url: `/api/mini/timeline/today?babyId=${encodeURIComponent(babyId)}`,
    method: 'GET'
  })
}
