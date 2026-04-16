import React from 'react'

/**
 * Day 001: 클래식 오르골 타이포그래피
 * 클래식 곡을 선택하고 타이핑하면 한 글자마다 오르골 음이 재생됨.
 */
export default function Day002() {
  return (
    <iframe
      src={import.meta.env.BASE_URL + "works/day1/index.html"}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
      title="Day 002: Classic Music Box Typography"
    />
  )
}
