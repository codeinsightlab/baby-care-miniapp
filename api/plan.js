import request from '../utils/request'

export function getPlanTemplateList() {
  return request({
    url: '/api/mini/plan-template/list',
    method: 'GET'
  })
}
