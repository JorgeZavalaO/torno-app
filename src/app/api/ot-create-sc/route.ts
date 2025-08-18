// Endpoint neutralizado: la creación de SC desde OT se gestiona en la página de OT.
export async function POST() {
  return new Response(JSON.stringify({ ok: false, message: 'Endpoint desactivado' }), { status: 410, headers: { 'content-type': 'application/json' } });
}
