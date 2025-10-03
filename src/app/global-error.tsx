'use client'
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">Algo salió mal</h2>
            <p className="text-muted-foreground">
              {error.message || 'Ha ocurrido un error inesperado'}
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
