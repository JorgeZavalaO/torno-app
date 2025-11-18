import { fractionToDecimal, decimalToFraction, parseInchInput, getFractionSuggestions } from '@/lib/fraction-utils';

// Ejemplos de uso del sistema de fracciones de pulgada

console.log('=== EJEMPLOS DE CONVERSIÓN ===\n');

// De fracción a decimal
console.log('Fracción → Decimal:');
console.log('1/2 →', fractionToDecimal('1/2'));           // 0.5
console.log('1 1/4 →', fractionToDecimal('1 1/4'));       // 1.25
console.log('3/4" →', fractionToDecimal('3/4"'));         // 0.75
console.log('2 3/8 →', fractionToDecimal('2 3/8'));       // 2.375

// De decimal a fracción
console.log('\nDecimal → Fracción:');
console.log('0.5 →', decimalToFraction(0.5));             // "1/2"
console.log('1.25 →', decimalToFraction(1.25));           // "1 1/4"
console.log('0.75 →', decimalToFraction(0.75));           // "3/4"
console.log('2.375 →', decimalToFraction(2.375));         // "2 3/8"

// Sugerencias
console.log('\nSugerencias para entrada "1":');
console.log(getFractionSuggestions('1'));

console.log('\nSugerencias para entrada "1.5":');
console.log(getFractionSuggestions('1.5'));

console.log('\nSugerencias para entrada "2 1":');
console.log(getFractionSuggestions('2 1'));
