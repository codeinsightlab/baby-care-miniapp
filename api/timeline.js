import request from '../utils/request'
import { appendQueryString } from '../utils/requestQuery'

export function getTodayTimelineEvents(babyId) {
  return request({
    url: appendQueryString('/api/mini/timeline/today', { babyId }),
    method: 'GET'
  })
}
