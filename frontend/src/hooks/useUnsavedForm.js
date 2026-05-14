import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const serialize = (value) => {
  try {
    return JSON.stringify(value ?? null)
  } catch {
    return String(value ?? '')
  }
}

export default function useUnsavedForm(currentValue, enabled = true) {
  const snapshot = useMemo(() => serialize(currentValue), [currentValue])
  const baselineRef = useRef(snapshot)
  const baselineValueRef = useRef(currentValue)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsDirty(false)
      return
    }
    setIsDirty(snapshot !== baselineRef.current)
  }, [enabled, snapshot])

  const resetBaseline = useCallback((nextValue) => {
    baselineRef.current = serialize(nextValue)
    baselineValueRef.current = nextValue
    setIsDirty(false)
  }, [])

  const markSaved = useCallback(() => {
    baselineRef.current = snapshot
    baselineValueRef.current = currentValue
    setIsDirty(false)
  }, [currentValue, snapshot])

  const dirtyFields = useMemo(() => {
    if (!enabled || !currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
      return new Set()
    }

    const baseline = baselineValueRef.current && typeof baselineValueRef.current === 'object'
      ? baselineValueRef.current
      : {}

    const keys = new Set([
      ...Object.keys(baseline || {}),
      ...Object.keys(currentValue || {}),
    ])

    const changed = new Set()
    keys.forEach((key) => {
      if (serialize(currentValue[key]) !== serialize(baseline[key])) {
        changed.add(key)
      }
    })
    return changed
  }, [currentValue, enabled])

  const isFieldDirty = useCallback(
    (fieldName) => dirtyFields.has(fieldName),
    [dirtyFields],
  )

  return {
    isDirty,
    dirtyFields,
    isFieldDirty,
    markSaved,
    resetBaseline,
  }
}
