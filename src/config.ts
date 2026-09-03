// Pocket50 — Configuración del cliente
// Cambiar GAS_ENDPOINT después de desplegar el Google Apps Script

export const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzb9Hb9iKGcZJ1V2fSgg-ia4G4ncjL41-TWFxf7Hdf0mma-20CPvxJgX2a8c1y-Yyvq/exec';

export const CATEGORIES = {
  need: { label: 'Necesidades', pct: 50 },
  want: { label: 'Deseos', pct: 30 },
  saving: { label: 'Ahorro', pct: 20 }
} as const;

export const SYNONYM_MAP: Record<string, string[]> = {
  need: [
    'mercado', 'supermercado', 'alimentación', 'carnicería', 'frutería',
    'transporte', 'gasolina', 'bus', 'metro', 'alquiler', 'arriendo',
    'servicio', 'electricidad', 'agua', 'internet', 'salud', 'farmacia',
    'médico', 'educación', 'colegio', 'universidad', 'farmacia', 'doctor'
  ],
  want: [
    'cine', 'restaurante', 'café', 'bar', 'discoteca', 'suscripción',
    'netflix', 'spotify', 'ropa', 'zapatos', 'tecnología', 'gadget',
    'videojuego', 'hobby', 'deporte', 'gimnasio', 'salida', 'viaje',
    'diversión', 'ocio', 'entretenimiento'
  ],
  saving: [
    'ahorro', 'inversión', 'deuda', 'préstamo',
    'tarjeta', 'crédito', 'fondo', 'emergencia'
  ]
};
