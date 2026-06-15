# 📝 NOTAS.md — Bitácora de Desarrollo y Transparencia (IA & Desarrollador)

Este archivo detalla qué partes del código fueron diseñadas y generadas con asistencia de Inteligencia Artificial (IA) y qué partes fueron refinadas, ajustadas o escritas manualmente por el desarrollador para garantizar la robustez, claridad y correctitud del sistema.

---

## 🛠️ Desglose de Contribuciones

### 1. Diseño Arquitectónico (Colaborativo)
- **Sugerido por la IA**: El plan original sugería usar Next.js App Router.
- **Ajustado por el Desarrollador**: Se tomó la decisión de simplificar a **Express.js + TypeScript** (con arquitectura limpia por capas: Dominio, Repositorios, Servicios, HTTP e Infraestructura). Esta decisión se justifica por ser el stack ideal ("just-in-time") para una API HTTP sin UI, reduciendo el acoplamiento y facilitando la defensa técnica en la entrevista.

### 2. Capa de Dominio (Desarrollador)
- **Saneamiento de Zona Horaria (America/Bogota)**: Se implementó `DateTimeService` utilizando `date-fns-tz` para encapsular toda conversión horaria. El desarrollador garantizó que las fechas se guarden siempre en UTC, pero la lógica de reglas se evalúe bajo la hora local de Bogotá.
- **Festivos Oficiales de Colombia 2026**: El listado de 18 días feriados nacionales oficiales (con la Ley Emiliani de traslado aplicada) fue investigado y hardcodeado manualmente en `src/domain/colombian-holidays.ts` para asegurar fidelidad legal al año 2026.
- **Validador de Reglas de Creación (`BookingRulesValidator`)**: Diseñado como un conjunto de funciones puras fáciles de testear. El desarrollador incluyó la validación de solapamiento de profesionales usando la fórmula de intersección matemática de intervalos (`startA < endB && startB < endA`), y el control estricto de límite de 3 reservas activas.

### 3. Normalizador de Semilla (`SeedNormalizer`) (IA & Desarrollador)
- **Estructura Zod (IA)**: Estructuras básicas de validación generadas con Zod.
- **Procesamiento de Fechas Mixtas (Desarrollador)**: Se escribió lógica personalizada con expresiones regulares para capturar el formato local colombiano `DD/MM/YYYY HH:mm`, convertir timestamps numéricos Unix, e interpretar fechas ISO sin huso horario como locales de Bogotá (-05:00).
- **Advertencias y Fallbacks (Desarrollador)**: El desarrollador configuró avisos preventivos con `console.warn` para alertar cuando un dato del `seed.json` era corregido o completado por defecto (p.ej., asignación de plan `"standard"`, o `nonRefundable` en `false`).

### 4. Capa de Servicios y Errores Tipados (Desarrollador)
- **Mapeo de Excepciones**: Se definieron clases de error de negocio (`ValidationError`, `NotFoundError`, `ConflictError`).
- **Manejo de Tiempos Determinista (`getNow`)**: El desarrollador inyectó la función `getNow: () => Date` en el constructor de `ReservationService`. Esto permite que los tests congelen o manipulen el reloj del sistema a voluntad, logrando una suite de pruebas 100% determinista e independiente de cuándo se ejecuten.

### 5. Suite de Pruebas (Vitest) (Colaborativo)
- **Casos de Prueba E2E e Integración (IA)**: Estructura base de llamadas usando `supertest` y llamadas HTTP.
- **Pruebas Parametrizadas (Desarrollador)**: Se reestructuraron las pruebas de reembolso (`refund-calculator.test.ts`) usando `test.each` para validar de forma exhaustiva e inclusiva los límites horarios y de anticipación (p.ej. probar exactamente 24 horas, 23.9 horas, 4 horas, 3.9 horas para usuarios Estándar y Premium).

---

## 💡 Defensa de Decisiones Técnicas Clave (Para el Live Coding)

1. **¿Por qué Express.js?**
   Express.js es ligero, no impone convenciones mágicas de carpetas como Next.js, y permite una inyección de dependencias limpia y explícita por constructores, lo cual hace que los repositorios en memoria sean fáciles de mantener.

2. **¿Cómo se previene el solapamiento de profesionales?**
   Cada `Service` cuenta con un `professionalId`. Al crear una reserva, consultamos las reservas existentes activas para el profesional en cuestión y comparamos si el intervalo solicitado `[start, start + duration)` se cruza con algún `[existingStart, existingEnd)`.

3. **¿Cómo se saneó el seed.json?**
   Usamos la directiva `z.preprocess()` de Zod para capturar el valor antes de la validación. Si el valor es de un tipo o formato inesperado (como DD/MM/YYYY HH:mm), se intercepta, se parsea a una fecha válida de JS en UTC/Bogotá, y se reporta una advertencia con `console.warn`.
