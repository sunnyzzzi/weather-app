/**
 * 搜尋列元件。
 *
 * 職責邊界：
 *  - 這個元件自己擁有「搜尋互動」這件事（輸入 → 防抖 → 候選 → 選中），
 *    對外只暴露一個 onSelect(place)，App 不需要知道搜尋是怎麼實作的；
 *  - 搜尋相關的錯誤只在下拉框裡呈現，不會污染主天氣區的錯誤狀態。
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { usePlaceSearch } from '../../hooks/usePlaceSearch.ts'
import type { Place } from '../../types.ts'
import type { SearchBarProps } from './types.ts'
import './index.less'

export default function SearchBar({ onSelect, autoFocus = false }: SearchBarProps) {
  const { keyword, searchState, updateKeyword, fillKeyword, resetSearch } = usePlaceSearch()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const { status, results } = searchState
  const showDropdown = open && status !== 'idle'

  // 換一批候選就把游標歸零，避免殘留上一個關鍵字的選取位置
  useEffect(() => {
    setActiveIndex(-1)
  }, [results])

  // 點擊元件外部時收合下拉框
  useEffect(() => {
    if (!showDropdown) return undefined
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [showDropdown])

  const commitSelection = (place: Place | undefined) => {
    if (!place) return
    onSelect(place)
    // 回填完整名稱，但明確告訴 Hook「這次不要觸發搜尋」
    fillKeyword(fillLabel(place))
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!results.length) return
      event.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => {
        const next = event.key === 'ArrowDown' ? prev + 1 : prev - 1
        if (next < 0) return results.length - 1
        if (next >= results.length) return 0
        return next
      })
      return
    }

    if (event.key === 'Enter') {
      if (!showDropdown) return
      event.preventDefault()
      commitSelection(results[activeIndex] ?? results[0])
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleClear = () => {
    resetSearch()
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className="search" ref={containerRef}>
      <div className="search__field">
        <span className="search__icon" aria-hidden="true">
          🔍
        </span>
        <input
          ref={inputRef}
          className="search__input"
          type="text"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="搜尋地點"
          placeholder="搜尋城市，例如：香港、台北、東京、倫敦…"
          value={keyword}
          onChange={(event) => {
            updateKeyword(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {keyword && (
          <button type="button" className="search__clear" onClick={handleClear} aria-label="清除搜尋">
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <ul className="search__results" id={listboxId} role="listbox" aria-label="地點候選">
          {status === 'loading' && <li className="search__hint">搜尋中…</li>}
          {status === 'empty' && <li className="search__hint search__hint--muted">找不到符合的地點，請換個關鍵字</li>}
          {status === 'error' && <li className="search__hint search__hint--error">搜尋失敗，請稍後再試</li>}

          {status === 'success' &&
            results.map((place, index) => (
              <li key={place.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`search__option${index === activeIndex ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelection(place)}
                >
                  <span className="search__option-name">{place.name}</span>
                  {place.region && <span className="search__option-region">{place.region}</span>}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

/**
 * 決定選中地點後要回填到輸入框的文字。
 * 地區名稱若已包含地名（例如名稱「北京」、地區「北京市 · 中國」），
 * 就沒有必要寫成「北京（北京市 · 中國）」這種重複的句子。
 */
function fillLabel(place: Place): string {
  if (!place.region) return place.name
  return place.region.includes(place.name) ? place.region : `${place.name}（${place.region}）`
}
