import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <p className="text-6xl font-bold text-gray-800 mb-4">404</p>
      <p className="text-gray-400 mb-6">Esta página no existe</p>
      <Link to="/" className="btn-primary">Volver al dashboard</Link>
    </div>
  )
}
