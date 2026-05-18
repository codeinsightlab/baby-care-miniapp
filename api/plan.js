import request from '../utils/request'

export function getPlanTemplateList(params) {
  return request({
    url: '/api/mini/plan-template/list',
    method: 'GET',
    data: params
  })
}

export function createPlanTemplate(data) {
  return request({
    url: '/api/mini/plan-template',
    method: 'POST',
    data
  })
}

export function updatePlanTemplate(templateId, data) {
  return request({
    url: `/api/mini/plan-template/${templateId}`,
    method: 'PUT',
    data
  })
}

export function updatePlanTemplateEnabled(templateId, data) {
  return request({
    url: `/api/mini/plan-template/${templateId}/enabled`,
    method: 'PUT',
    data
  })
}

export function deletePlanTemplate(templateId, babyId) {
  return request({
    url: `/api/mini/plan-template/${templateId}?babyId=${encodeURIComponent(babyId)}`,
    method: 'DELETE'
  })
}
