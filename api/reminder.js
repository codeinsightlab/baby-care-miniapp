import request from '../utils/request'
import { appendQueryString } from '../utils/requestQuery'

export function getTodayReminderInstances(babyId, query = {}) {
  return request({
    url: appendQueryString('/api/mini/reminder-instance/today', {
      babyId,
      startTime: query.startTime || null,
      endTime: query.endTime || null,
      status: query.status,
      limit: query.limit,
      sort: query.sort
    }),
    method: 'GET'
  })
}
