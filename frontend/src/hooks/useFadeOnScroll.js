import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function useFadeOnScroll() {
  const observed = useRef(new Set())
  const location = useLocation()

  useEffect(() => {
    observed.current = new Set()

    const revealPending = () => {
      document.querySelectorAll('.fade-section:not(.is-visible)').forEach((el) => {
        el.classList.add('is-visible')
      })
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.01, rootMargin: '0px 0px 80px 0px' },
    )

    const attach = () => {
      document.querySelectorAll('.fade-section').forEach((el) => {
        if (!observed.current.has(el)) {
          observed.current.add(el)
          const rect = el.getBoundingClientRect()
          if (rect.top < window.innerHeight + 100) {
            el.classList.add('is-visible')
          } else {
            io.observe(el)
          }
        }
      })
    }

    const rafId = window.requestAnimationFrame(attach)

    // Catch async-rendered sections without keeping a global observer alive.
    const intervalId = window.setInterval(attach, 220)
    const intervalStopId = window.setTimeout(() => window.clearInterval(intervalId), 2200)

    const onResize = () => attach()
    window.addEventListener('resize', onResize)

    // Safety net: never keep content hidden if observer misses a render edge-case.
    const failSafeTimer = window.setTimeout(revealPending, 2000)

    return () => {
      io.disconnect()
      window.cancelAnimationFrame(rafId)
      window.clearInterval(intervalId)
      window.clearTimeout(intervalStopId)
      window.removeEventListener('resize', onResize)
      window.clearTimeout(failSafeTimer)
    }
  }, [location.pathname])
}
