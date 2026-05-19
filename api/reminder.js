import request from '../utils/request'
import { appendQueryString } from '../utils/requestQuery'

export function getTodayReminderInstances(babyId) {
  return request({
    url: appendQueryString('/api/mini/reminder-instance/today', { babyId }),
    method: 'GET'
  })
}
