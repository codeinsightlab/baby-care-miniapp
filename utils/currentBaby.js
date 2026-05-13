import { storageKeys } from './auth'

export function getCurrentBabyId() {
  return uni.getStorageSync(storageKeys.currentBabyId)
}

export function setCurrentBabyId(babyId) {
  uni.setStorageSync(storageKeys.currentBabyId, babyId)
}

export function clearCurrentBabyId() {
  uni.removeStorageSync(storageKeys.currentBabyId)
}
