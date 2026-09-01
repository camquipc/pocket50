/**
 * Pocket50 — Google Apps Script Backend
 * 
 * Este archivo se pega en el editor de Google Apps Script
 * vinculado a un Google Sheet con 3 hojas:
 *   - Gastos: registro de transacciones
 *   - Config: ingreso mensual y configuración
 *   - MesActual: acumulados del mes actual
 * 
 * Pasos para configurar:
 *   1. Crear un Google Sheet nuevo
 *   2. Renombrar la hoja por defecto a "Gastos"
 *   3. Crear hoja "Config" con columnas: Clave | Valor
 *   4. Crear hoja "MesActual" con columnas: Categoría | Total USD | Límite USD | %Usado
 *   5. Abrir Extensions > Apps Script
 *   6. Pegar este archivo
 *   7. Desplegar > Nuevo despliegue > Web app > Acceso: cualquiera
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================

const SHEET_GASTOS = 'Gastos';
const SHEET_CONFIG = 'Config';
const SHEET_MES = 'MesActual';

const CATEGORIES = ['need', 'want', 'saving'];
const CATEGORY_LABELS = { need: 'Necesidades', want: 'Deseos', saving: 'Ahorro' };

// ============================================================
// SETUP — Ejecutar una vez para crear hojas y datos iniciales
// ============================================================

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Crear hoja Gastos si no existe
  let gastos = ss.getSheetByName(SHEET_GASTOS);
  if (!gastos) {
    gastos = ss.insertSheet(SHEET_GASTOS);
    gastos.appendRow(['Fecha', 'Descripción', 'Categoría', 'Subcategoría', 'Monto VES', 'Tasa USD', 'Monto USD']);
    gastos.getRange('A1:G1').setFontWeight('bold');
  }
  
  // Crear hoja Config si no existe
  let config = ss.getSheetByName(SHEET_CONFIG);
  if (!config) {
    config = ss.insertSheet(SHEET_CONFIG);
    config.appendRow(['Clave', 'Valor']);
    config.getRange('A1:B1').setFontWeight('bold');
    config.appendRow(['ingreso_mensual_usd', '800']);
    config.appendRow(['mes_actual', getCurrentMonth()]);
  }
  
  // Crear hoja MesActual si no existe
  let mes = ss.getSheetByName(SHEET_MES);
  if (!mes) {
    mes = ss.insertSheet(SHEET_MES);
    mes.appendRow(['Categoría', 'Total USD', 'Límite USD', '%Usado']);
    mes.getRange('A1:D1').setFontWeight('bold');
    // Inicializar categorías
    CATEGORIES.forEach(cat => {
      mes.appendRow([cat, 0, 0, 0]);
    });
  }
  
  Logger.log('✅ Hojas creadas/verificadas correctamente');
}

// ============================================================
// HELPERS
// ============================================================

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getConfig(key) {
  const sheet = getSheet(SHEET_CONFIG);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function setConfig(key, value) {
  const sheet = getSheet(SHEET_CONFIG);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // Si no existe, agregarla
  sheet.appendRow([key, value]);
}

// ============================================================
// TASA DE CAMBIO — Proxy ve.dolarapi.com
// ============================================================

const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const TASA_KEY = 'tasa_usd_hoy';
const TASA_FECHA_KEY = 'tasa_fecha';

function getCurrentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isTasaCacheFresh() {
  const fechaCache = getConfig(TASA_FECHA_KEY);
  if (!fechaCache) return false;
  return fechaCache === getCurrentDate();
}

function fetchYTasaFromBCV() {
  try {
    const response = UrlFetchApp.fetch(BCV_API_URL, {
      muteHttpExceptions: true,
      followRedirects: true,
    });
    const json = JSON.parse(response.getContentText());
    const tasa = json.promedio;
    if (typeof tasa !== 'number' || tasa <= 0) {
      throw new Error('Tasa inválida en respuesta: ' + JSON.stringify(json));
    }
    setConfig(TASA_KEY, tasa);
    setConfig(TASA_FECHA_KEY, getCurrentDate());
    return { valor: Math.round(tasa * 100) / 100, fuente: 'bcv', fecha: getCurrentDate(), manual: false };
  } catch (error) {
    Logger.log('Error consultando API BCV: ' + error.toString());
    return null;
  }
}

function getTasaDelDia() {
  // 1. Si la cache es de hoy, usarla
  if (isTasaCacheFresh()) {
    const tasaCache = parseFloat(getConfig(TASA_KEY));
    if (tasaCache > 0) {
      return { valor: tasaCache, fuente: 'cache', fecha: getConfig(TASA_FECHA_KEY), manual: false };
    }
  }
  // 2. Consultar API
  const resultado = fetchYTasaFromBCV();
  if (resultado) {
    return resultado;
  }
  // 3. Fallback: usar cache vieja si existe
  const tasaVieja = parseFloat(getConfig(TASA_KEY));
  if (tasaVieja > 0) {
    return { valor: tasaVieja, fuente: 'cache', fecha: getConfig(TASA_FECHA_KEY) || 'desconocida', manual: false };
  }
  // 4. Sin datos disponibles
  return { valor: null, fuente: 'manual', fecha: getCurrentDate(), manual: true };
}

function recalcularMesActual() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gastosSheet = ss.getSheetByName(SHEET_GASTOS);
  const mesSheet = ss.getSheetByName(SHEET_MES);
  
  if (!gastosSheet || !mesSheet) return;
  
  const ingreso = parseFloat(getConfig('ingreso_mensual_usd')) || 0;
  const mesActual = getCurrentMonth();
  
  // Leer gastos del mes actual
  const data = gastosSheet.getDataRange().getValues();
  const totales = { need: 0, want: 0, saving: 0 };
  
  for (let i = 1; i < data.length; i++) {
    const fecha = new Date(data[i][0]);
    const mesGasto = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (mesGasto === mesActual) {
      const categoria = data[i][2];
      const montoUSD = parseFloat(data[i][6]) || 0;
      if (totales.hasOwnProperty(categoria)) {
        totales[categoria] += montoUSD;
      }
    }
  }
  
  // Calcular límites según regla 50/30/20
  const limites = {
    need: ingreso * 0.50,
    want: ingreso * 0.30,
    saving: ingreso * 0.20
  };
  
  // Actualizar hoja MesActual
  CATEGORIES.forEach((cat, idx) => {
    const row = idx + 2; // Fila 2 en adelante (1 es header)
    const total = totales[cat];
    const limite = limites[cat];
    const pct = limite > 0 ? (total / limite * 100) : 0;
    
    mesSheet.getRange(row, 2).setValue(Math.round(total * 100) / 100);
    mesSheet.getRange(row, 3).setValue(Math.round(limite * 100) / 100);
    mesSheet.getRange(row, 4).setValue(Math.round(pct * 100) / 100);
  });
}

// ============================================================
// doPost — Recibir gasto desde la PWA
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    
    // Validar campos requeridos
    if (!body.montoVES || !body.tasa || !body.categoria) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'Faltan campos: montoVES, tasa, categoria' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const montoVES = parseFloat(body.montoVES);
    const tasa = parseFloat(body.tasa);
    const montoUSD = Math.round((montoVES / tasa) * 100) / 100;
    const fecha = body.fecha || new Date().toISOString().split('T')[0];
    const descripcion = body.descripcion || '';
    const subcategoria = body.subcategoria || '';
    const categoria = body.categoria;
    
    // Validar categoría
    if (!CATEGORIES.includes(categoria)) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          error: `Categoría inválida: ${categoria}. Use: ${CATEGORIES.join(', ')}` 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Escribir en hoja Gastos
    const gastosSheet = getSheet(SHEET_GASTOS);
    gastosSheet.appendRow([fecha, descripcion, categoria, subcategoria, montoVES, tasa, montoUSD]);
    
    // Recalcular acumulados del mes
    recalcularMesActual();
    
    // Obtener estado actualizado
    const summary = getMesActualSummary();
    const alerts = checkAlerts(summary);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        summary: summary,
        alerts: alerts
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// doGet — Leer estado del presupuesto
// ============================================================

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    
    if (action === 'config') {
      // Retornar configuración
      const ingreso = getConfig('ingreso_mensual_usd') || '800';
      const mes = getConfig('mes_actual') || getCurrentMonth();
      
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true, 
          config: { ingresoMensualUSD: parseFloat(ingreso), mes: mes }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default: retornar estado del mes actual
    const summary = getMesActualSummary();
    const alerts = checkAlerts(summary);
    const tasa = getTasaDelDia();
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        summary: summary,
        alerts: alerts,
        tasa: tasa
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// HELPERS — Resumen y alertas
// ============================================================

function getMesActualSummary() {
  const mesSheet = getSheet(SHEET_MES);
  if (!mesSheet) return {};
  
  const data = mesSheet.getDataRange().getValues();
  const summary = {};
  
  for (let i = 1; i < data.length; i++) {
    const cat = data[i][0];
    summary[cat] = {
      spent: parseFloat(data[i][1]) || 0,
      limit: parseFloat(data[i][2]) || 0,
      pct: parseFloat(data[i][3]) || 0
    };
  }
  
  return summary;
}

function checkAlerts(summary) {
  const alerts = [];
  
  for (const cat of CATEGORIES) {
    if (summary[cat] && summary[cat].pct > 100) {
      const over = summary[cat].spent - summary[cat].limit;
      alerts.push({
        category: cat,
        label: CATEGORY_LABELS[cat],
        spent: summary[cat].spent,
        limit: summary[cat].limit,
        over: Math.round(over * 100) / 100,
        message: `⚠️ Superaste tu presupuesto de ${CATEGORY_LABELS[cat]} por $${Math.round(over * 100) / 100} USD`
      });
    }
  }
  
  return alerts;
}

// ============================================================
// doPost para guardar configuración (ingreso mensual)
// ============================================================

function doPostConfig(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    
    if (body.ingresoMensualUSD) {
      setConfig('ingreso_mensual_usd', body.ingresoMensualUSD);
      recalcularMesActual();
    }
    
    if (body.mes) {
      setConfig('mes_actual', body.mes);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
