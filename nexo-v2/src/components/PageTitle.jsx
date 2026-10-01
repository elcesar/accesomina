import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { pageTitle } from '../services/page-title.js'

export default function PageTitle() {
  const location = useLocation()

  useEffect(() => {
    const update = () => { document.title = pageTitle(location.pathname, window.location.hash) }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [location.pathname])

  return null
}
