import request from '../utils/request'

export function createReminderNode(data) {
  return request({
    url: '/api/mini/reminder-node/create',
    method: 'POST',
    data
  })
}

export function getReminderNodeList(babyId) {
  return request({
    url: `/api/mini/reminder-node/list?babyId=${encodeURIComponent(babyId)}`,
    method: 'GET'
  })
}

export function getTodayReminderNodes(babyId) {
  return request({
    url: `/api/mini/reminder-node/today?babyId=${encodeURIComponent(babyId)}`,
    method: 'GET'
  })
}

export function completeReminderNode(data) {
  return request({
    url: '/api/mini/reminder-node/complete',
    method: 'POST',
    data
  })
}

export function snoozeReminderNode(data) {
  return request({
    url: '/api/mini/reminder-node/snooze',
    method: 'POST',
    data
  })
}
