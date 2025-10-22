# Parámetros del Sistema (resumen)

Este documento unifica y simplifica la guía rápida, mejoras de UI y notas de refactor para el módulo de Parámetros.

## Qué configura
- Moneda base del sistema (currency) y tipo de cambio (usdRate)
- Porcentajes: gastos indirectos (gi), margen (margin)
- Costos compartidos: kwhRate, toolingPerPiece, rentPerHour

Los valores se almacenan en `CostingParam` y se consumen vía `getCostingValues()`.

## Reglas clave
- currency: texto ISO-4217 (ej. PEN, USD)
- usdRate: PEN por 1 USD (número > 0)
- Porcentajes: valores entre 0 y 1 (ej. 0.15 = 15%)
- CURRENCY/NUMBER: no negativos

## Efectos en módulos
- Cotizador y OT: formateo y cálculos en moneda vigente
- Inventario/Compras: costos mostrados en moneda actual
- Programación: encabezados y totales coherentes

## UX (resumen)
- Tabs con conteos y tooltips
- Tarjetas por parámetro con iconos por tipo (PERCENT, CURRENCY, NUMBER, TEXT)
- Estados de cambio y validación en tiempo real

## Buenas prácticas
- Cambiar moneda fuera de horario crítico; verifica conversión esperada
- Mantener `usdRate` actualizado
- Revisar `docs/TESTING.md` para validar cálculos tras cambios

## Referencias
- Código: `src/app/server/queries/costing-params.ts`
- Conversión y propagación: páginas en `(protected)/admin/parametros`
- Costos por categoría de máquina: ver `machine-costing-categories.ts`