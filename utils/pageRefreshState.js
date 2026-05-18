export function getRefreshErrorText(error, fallbackText = '加载失败') {
  return (error && (error.msg || error.message)) || fallbackText
}

export function applyRefreshSuccess(nextDisplayState) {
  return {
    displayState: nextDisplayState,
    loadErrorText: ''
  }
}

export function applyRefreshFailure(previousDisplayState, error, fallbackText = '加载失败') {
  return {
    displayState: previousDisplayState,
    loadErrorText: getRefreshErrorText(error, fallbackText)
  }
}

export function keepPreviousDisplayOnFailure(previousDisplayState) {
  return previousDisplayState
}
