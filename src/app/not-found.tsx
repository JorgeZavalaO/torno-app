import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold">404 - Página no encontrada</h2>
        <p className="text-muted-foreground">No pudimos encontrar la página que buscas.</p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
