import request from '../utils/request'

export function createBaby(data, requestOptions = {}) {
  return request({
    ...requestOptions,
    url: '/api/mini/baby/create',
    method: 'POST',
    data
  })
}

export function getBabyList(requestOptions = {}) {
  return request({
    ...requestOptions,
    url: '/api/mini/baby/list',
    method: 'GET'
  })
}

export function getBabyDetail(babyId, requestOptions = {}) {
  return request({
    ...requestOptions,
    url: `/api/mini/baby/${babyId}`,
    method: 'GET'
  })
}
