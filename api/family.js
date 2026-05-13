import request from '../utils/request'

export function createFamily(data, requestOptions = {}) {
  return request({
    ...requestOptions,
    url: '/api/mini/family/create',
    method: 'POST',
    data
  })
}
