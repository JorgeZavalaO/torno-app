import { NextRequest, NextResponse } from "next/server";
import { getQuoteById } from "@/app/server/queries/quotes";
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

    const quote = await getQuoteById(id);
    if (!quote) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (!quote.cliente) {
      return NextResponse.json({ error: "Cotización sin datos de cliente" }, { status: 400 });
    }

    // Generar HTML del PDF
    const html = generateQuotePDFHTML(quote as typeof quote & { cliente: NonNullable<typeof quote.cliente> });

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

function generateQuotePDFHTML(quote: {
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
}): string {
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

  const toNum = (v: unknown) => (v == null ? 0 : Number(v?.toString?.() ?? v));

  // Extraer breakdown
  const breakdown = (quote.breakdown as { costs?: { 
    materials?: number;
    labor?: number;
    energy?: number;
    depreciation?: number;
    tooling?: number;
    rent?: number;
    direct?: number;
    giAmount?: number;
    subtotal?: number;
    marginAmount?: number;
    total?: number;
    unitPrice?: number;
  } }) || {};
  const costs = breakdown.costs || {};

  const materials = costs.materials ?? toNum(quote.materials);
  const labor = costs.labor ?? 0;
  const energy = costs.energy ?? 0;
  const depreciation = costs.depreciation ?? 0;
  const tooling = costs.tooling ?? 0;
  const rent = costs.rent ?? 0;
  const direct = costs.direct ?? materials;
  const giAmount = costs.giAmount ?? 0;
  const subtotal = costs.subtotal ?? direct;
  const marginAmount = costs.marginAmount ?? 0;
  const total = costs.total ?? subtotal;
  const unitPrice = costs.unitPrice ?? (quote.qty > 0 ? total / quote.qty : 0);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${quote.codigo || quote.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      color: #333;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .company-info h1 {
      font-size: 24px;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .company-info p {
      font-size: 12px;
      color: #666;
    }
    .quote-info {
      text-align: right;
    }
    .quote-info h2 {
      font-size: 28px;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .quote-info p {
      font-size: 13px;
      color: #555;
      margin: 3px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .status-draft { background: #e0e7ff; color: #3730a3; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .client-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .client-section h3 {
      font-size: 14px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .client-section p {
      font-size: 15px;
      margin: 5px 0;
    }
    .client-section strong {
      color: #1e293b;
    }
    .breakdown-section {
      margin: 30px 0;
    }
    .breakdown-section h3 {
      font-size: 18px;
      color: #1e293b;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .totals-section {
      margin-top: 30px;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
    }
    .totals-row.subtotal {
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 8px;
    }
    .totals-row.total {
      border-top: 2px solid #2563eb;
      padding-top: 15px;
      margin-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #1e40af;
    }
    .notes-section {
      margin-top: 30px;
      padding: 20px;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
    .notes-section h4 {
      font-size: 14px;
      color: #92400e;
      margin-bottom: 8px;
    }
    .notes-section p {
      font-size: 13px;
      color: #78350f;
      line-height: 1.6;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>Tu Empresa</h1>
      <p>Taller de Torneado y Mecanizado</p>
      <p>RUC: 20XXXXXXXXX</p>
      <p>Dirección completa</p>
    </div>
    <div class="quote-info">
      <h2>${quote.codigo || `#${quote.id.slice(0, 8)}`}</h2>
      <p><strong>Fecha:</strong> ${formatDate(quote.createdAt)}</p>
      ${quote.validUntil ? `<p><strong>Válida hasta:</strong> ${formatDate(quote.validUntil)}</p>` : ''}
      ${quote.pedidoReferencia ? `<p><strong>Ref. Pedido:</strong> ${quote.pedidoReferencia}</p>` : ''}
      <span class="status-badge status-${quote.status.toLowerCase()}">${quote.status}</span>
    </div>
  </div>

  <div class="client-section">
    <h3>Cliente</h3>
    <p><strong>${quote.cliente.nombre}</strong></p>
    <p>RUC: ${quote.cliente.ruc}</p>
    ${quote.cliente.email ? `<p>Email: ${quote.cliente.email}</p>` : ''}
  </div>

  <!-- Resumen rápido -->
  <div style="margin-bottom: 20px; font-size: 14px; color: #475569;">
    <p><strong>Cantidad solicitada:</strong> ${quote.qty} unidades</p>
    <p><strong>Moneda:</strong> ${quote.currency}</p>
  </div>

  <div class="breakdown-section">
    <h3>Desglose de Costos</h3>
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="text-right">Cantidad</th>
          <th class="text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Materiales</td>
          <td class="text-right">—</td>
          <td class="text-right">${formatCurrency(materials, quote.currency)}</td>
        </tr>
        <tr>
          <td>Mano de Obra</td>
          <td class="text-right">${toNum(quote.hours)} hrs</td>
          <td class="text-right">${formatCurrency(labor, quote.currency)}</td>
        </tr>
        <tr>
          <td>Energía</td>
          <td class="text-right">—</td>
          <td class="text-right">${formatCurrency(energy, quote.currency)}</td>
        </tr>
        <tr>
          <td>Depreciación</td>
          <td class="text-right">—</td>
          <td class="text-right">${formatCurrency(depreciation, quote.currency)}</td>
        </tr>
        <tr>
          <td>Herramientas</td>
          <td class="text-right">${quote.qty} pzas</td>
          <td class="text-right">${formatCurrency(tooling, quote.currency)}</td>
        </tr>
        <tr>
          <td>Alquiler</td>
          <td class="text-right">—</td>
          <td class="text-right">${formatCurrency(rent, quote.currency)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="totals-section">
    <div class="totals-row">
      <span>Costo Directo:</span>
      <strong>${formatCurrency(direct, quote.currency)}</strong>
    </div>
    <div class="totals-row">
      <span>Gastos Indirectos (${(toNum(quote.giPct) * 100).toFixed(1)}%):</span>
      <strong>${formatCurrency(giAmount, quote.currency)}</strong>
    </div>
    <div class="totals-row subtotal">
      <span>Subtotal:</span>
      <strong>${formatCurrency(subtotal, quote.currency)}</strong>
    </div>
    <div class="totals-row">
      <span>Margen (${(toNum(quote.marginPct) * 100).toFixed(1)}%):</span>
      <strong>${formatCurrency(marginAmount, quote.currency)}</strong>
    </div>
    <div class="totals-row total">
      <span>TOTAL:</span>
      <strong>${formatCurrency(total, quote.currency)}</strong>
    </div>
    <div class="totals-row" style="margin-top: 10px; font-size: 16px; color: #475569;">
      <span>Precio Unitario:</span>
      <strong>${formatCurrency(unitPrice, quote.currency)}</strong>
    </div>
  </div>

  ${quote.notes ? `
  <div class="notes-section">
    <h4>Notas Adicionales</h4>
    <p>${quote.notes}</p>
  </div>
  ` : ''}

  <!-- Firma y condiciones -->
  <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
    <div style="width: 45%; text-align: center;">
      <p>_______________________________</p>
      <p>Representante de la Empresa</p>
    </div>
    <div style="width: 45%; text-align: center;">
      <p>_______________________________</p>
      <p>Cliente</p>
    </div>
  </div>

  <div style="margin-top: 20px; font-size: 11px; color: #6b7280; line-height: 1.5;">
    <p><strong>Condiciones:</strong></p>
    <ul style="margin-top: 4px; padding-left: 18px;">
      <li>Los precios no incluyen IGV salvo que se indique lo contrario.</li>
      <li>Plazo de entrega sujeto a disponibilidad de materia prima y carga de trabajo.</li>
      <li>Validez de la cotización según fecha indicada en este documento.</li>
    </ul>
  </div>

  <div class="footer">
    <p>Este documento es una cotización formal. Condiciones y términos sujetos a aceptación.</p>
    <p>Generado el ${formatDate(new Date())}</p>
  </div>

  <script>
    // Auto-print cuando se abre en nueva ventana
    if (window.location.search.includes('print=true')) {
      window.print();
    }
  </script>
</body>
</html>
  `;
}
