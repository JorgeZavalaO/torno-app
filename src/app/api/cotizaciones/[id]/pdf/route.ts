import { NextRequest, NextResponse } from "next/server";
import { getQuoteById } from "@/app/server/queries/quotes";
import { getEmpresaCached } from "@/app/server/queries/empresa";
import { getCurrentUser } from "@/app/lib/auth";
import { userHasPermission } from "@/app/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const canRead = await userHasPermission(user.email, "quotes.read");
    if (!canRead) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const [quote, empresa] = await Promise.all([
      getQuoteById(id),
      getEmpresaCached(),
    ]);

    if (!quote) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (!quote.cliente) {
      return NextResponse.json({ error: "Cotización sin datos de cliente" }, { status: 400 });
    }

    // Generar HTML del PDF
    const html = generateQuotePDFHTML(
      quote as typeof quote & { 
        cliente: NonNullable<typeof quote.cliente>;
        tipoTrabajo?: { id: string; nombre: string; descripcion: string | null } | null;
      },
      empresa
    );

    // Usar API externa para convertir HTML a PDF (ejemplo con html-pdf-node o similar)
    // Por ahora devolvemos HTML que el navegador puede imprimir
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generando PDF:", error);
    return NextResponse.json(
      { error: "Error generando PDF" },
      { status: 500 }
    );
  }
}

function generateQuotePDFHTML(
  quote: {
    id: string;
    codigo?: string | null;
    createdAt: Date | string;
    status: string;
    currency: string;
    qty: number;
    materials: unknown;
    hours: unknown;
    validUntil?: Date | string | null;
    notes?: string | null;
    pedidoReferencia?: string | null;
    giPct: unknown;
    marginPct: unknown;
    hourlyRate: unknown;
    kwhRate: unknown;
    deprPerHour: unknown;
    toolingPerPc: unknown;
    rentPerHour: unknown;
    breakdown: unknown;
    cliente: {
      id: string;
      nombre: string;
      ruc: string;
      email?: string | null;
    };
    tipoTrabajo?: { id: string; nombre: string; descripcion: string | null } | null;
  },
  empresa: {
    nombre: string;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
    web: string | null;
    logoUrl: string | null;
  }
): string {
  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currency || "PEN",
    }).format(amount);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Extraer breakdown
  const breakdown = (quote.breakdown as { costs?: { 
    total?: number;
    unitPrice?: number;
  } }) || {};
  const costs = breakdown.costs || {};

  // Calcular valores finales
  const total = costs.total ?? 0;
  const unitPrice = costs.unitPrice ?? (quote.qty > 0 ? total / quote.qty : 0);
  
  // Nombre y descripción del item a fabricar (tomamos de varias posibles fuentes)
  const anyQuote = quote as unknown as {
    itemNombre?: string | null;
    itemName?: string | null;
    productoNombre?: string | null;
    itemDescripcion?: string | null;
    descripcionItem?: string | null;
    productoDescripcion?: string | null;
  };

  // Intentar obtener título/descripcion desde breakdown si no existen campos directos
  type BreakdownShape = {
    inputs?: {
      piezasLines?: Array<{ productoId?: string; descripcion?: string; qty?: number }>;
    };
  };
  const bd = (quote.breakdown as BreakdownShape) || {};
  const firstPiece = Array.isArray(bd.inputs?.piezasLines) && bd.inputs!.piezasLines!.length > 0
    ? bd.inputs!.piezasLines![0]
    : undefined;

  const mainTitle =
    anyQuote.itemNombre?.trim() ||
    anyQuote.itemName?.trim() ||
    anyQuote.productoNombre?.trim() ||
    (firstPiece?.descripcion?.trim() || firstPiece?.productoId) ||
    quote.tipoTrabajo?.nombre ||
    "Servicio de Mecanizado / Fabricación";

  const description =
    anyQuote.itemDescripcion?.trim() ||
    anyQuote.descripcionItem?.trim() ||
    anyQuote.productoDescripcion?.trim() ||
    (firstPiece ? `Fabricación de ${quote.qty} pieza${quote.qty === 1 ? '' : 's'}` : undefined) ||
    (typeof quote.notes === "string" ? quote.notes.trim() : undefined) ||
    quote.tipoTrabajo?.descripcion ||
    "Fabricación de piezas según especificaciones técnicas.";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${quote.codigo || quote.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', sans-serif;
      padding: 40px;
      color: #1f2937;
      background: white;
      max-width: 1000px;
      margin: 0 auto;
      line-height: 1.5;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .company-logo {
      font-size: 28px;
      font-weight: 800;
      color: #2563eb;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .company-logo img {
      max-height: 60px;
      max-width: 200px;
      object-fit: contain;
    }
    .company-details {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }
    .quote-meta {
      text-align: right;
    }
    .quote-title {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .quote-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
      font-weight: 500;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: auto auto;
      gap: 8px 24px;
      text-align: left;
      font-size: 13px;
    }
    .meta-label {
      color: #6b7280;
      font-weight: 500;
    }
    .meta-value {
      color: #111827;
      font-weight: 600;
      text-align: right;
    }

    /* Client Info */
    .client-section {
      margin-bottom: 40px;
      padding: 24px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #f3f4f6;
    }
    .section-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .client-name {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .client-detail {
      font-size: 14px;
      color: #4b5563;
    }

    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      text-align: left;
      padding: 16px;
      background: #f3f4f6;
      color: #374151;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table td {
      padding: 20px 16px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .item-desc-title {
      font-weight: 600;
      color: #111827;
      font-size: 15px;
      margin-bottom: 4px;
    }
    .item-desc-text {
      font-size: 13px;
      color: #6b7280;
      white-space: pre-line;
    }
    .col-qty, .col-price, .col-total {
      text-align: right;
      white-space: nowrap;
    }
    .col-qty { width: 100px; }
    .col-price { width: 150px; }
    .col-total { width: 150px; font-weight: 600; }

    /* Totals */
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-box {
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      color: #4b5563;
    }
    .total-row.final {
      border-top: 2px solid #e5e7eb;
      margin-top: 10px;
      padding-top: 16px;
      font-size: 20px;
      font-weight: 800;
      color: #111827;
    }

    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .terms {
      font-size: 11px;
      color: #9ca3af;
      max-width: 60%;
    }
    .terms h4 {
      color: #6b7280;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #d1d5db;
      margin-bottom: 8px;
    }
    .signature-text {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }

    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-logo">
        ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.nombre}" />` : empresa.nombre}
      </div>
      <div class="company-details">
        <p>${empresa.direccion || ""}</p>
        ${empresa.ruc ? `<p>RUC: ${empresa.ruc}</p>` : ""}
        <p>
          ${[empresa.email, empresa.telefono, empresa.web].filter(Boolean).join(" | ")}
        </p>
      </div>
    </div>
    <div class="quote-meta">
      <div class="quote-title">COTIZACIÓN</div>
      <div class="quote-subtitle">${quote.codigo || `#${quote.id.slice(0, 8)}`}</div>
      
      <div class="meta-grid">
        <span class="meta-label">Fecha de emisión:</span>
        <span class="meta-value">${formatDate(quote.createdAt)}</span>
        
        ${quote.validUntil ? `
        <span class="meta-label">Válido hasta:</span>
        <span class="meta-value">${formatDate(quote.validUntil)}</span>
        ` : ''}
        
        ${quote.pedidoReferencia ? `
        <span class="meta-label">Referencia:</span>
        <span class="meta-value">${quote.pedidoReferencia}</span>
        ` : ''}
      </div>
    </div>
  </div>

  <div class="client-section">
    <div class="section-label">Cliente</div>
    <div class="client-name">${quote.cliente.nombre}</div>
    <div class="client-detail">RUC: ${quote.cliente.ruc}</div>
    ${quote.cliente.email ? `<div class="client-detail">${quote.cliente.email}</div>` : ''}
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="col-qty">Cantidad</th>
        <th class="col-price">Precio Unit.</th>
        <th class="col-total">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="item-desc-title">${mainTitle}</div>
          <div class="item-desc-text">${description}</div>
        </td>
        <td class="col-qty">${quote.qty}</td>
        <td class="col-price">${formatCurrency(unitPrice, quote.currency)}</td>
        <td class="col-total">${formatCurrency(total, quote.currency)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-container">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatCurrency(total, quote.currency)}</span>
      </div>
      <!-- 
      <div class="total-row">
        <span>IGV (18%)</span>
        <span>$0.00</span>
      </div>
      -->
      <div class="total-row final">
        <span>TOTAL</span>
        <span>${formatCurrency(total, quote.currency)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="terms">
      <h4>Términos y Condiciones</h4>
      <p>1. Los precios expresados no incluyen IGV salvo indicación contraria.</p>
      <p>2. La validez de esta oferta es de 15 días calendario.</p>
      <p>3. El tiempo de entrega corre a partir de la recepción de la Orden de Compra y/o adelanto.</p>
      <p>4. Forma de pago: 50% adelanto, 50% contra entrega.</p>
    </div>
  </div>

  <script>
    if (window.location.search.includes('print=true')) {
      setTimeout(() => window.print(), 500);
    }
  </script>
</body>
</html>
  `;
}
