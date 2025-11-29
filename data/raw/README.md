# 📁 Carpeta de Datos Raw

Coloca aquí los archivos Excel o CSV de campañas para ingestión.

## Archivos soportados

| Formato | Extensiones |
|---------|-------------|
| Excel | `.xlsx`, `.xls` |
| CSV | `.csv` |

## Nomenclatura de archivos

El sistema detecta la plataforma por el nombre del archivo:

| Plataforma | Nombres válidos |
|------------|-----------------|
| Google Ads | `google_ads.xlsx`, `google.csv`, cualquier nombre con "google" |
| Meta Ads | `meta_ads.xlsx`, `facebook.csv`, cualquier nombre con "meta" o "facebook" |
| TikTok Ads | `tiktok_ads.xlsx`, `tiktok.csv`, cualquier nombre con "tiktok" |

---

## 📊 Columnas por Plataforma

### TikTok Ads
| Columna en tu Excel | Métrica mapeada |
|---------------------|-----------------|
| `Campaign name` | Nombre de campaña |
| `Cost` | Gasto |
| `CPC (destination)` | CPC |
| `CPM` | CPM |
| `Impressions` | Impresiones |
| `Clicks (destination)` | Clics |
| `CTR (destination)` | CTR |
| `Conversions [MMP]` | Conversiones |
| `Results` | Resultados (alternativo a conversiones) |

**Nota:** TikTok no incluye fecha por fila. Se usa la fecha actual o la que especifiques.

---

### Meta Ads (Facebook/Instagram)
| Columna en tu Excel | Métrica mapeada |
|---------------------|-----------------|
| `Inicio del informe` | Fecha |
| `Nombre de la campaña` | Nombre de campaña |
| `Resultados` | Conversiones/Resultados |
| `Importe gastado (USD)` | Gasto |
| `Impresiones` | Impresiones |
| `CPM (costo por mil impresiones) (USD)` | CPM |
| `Clics en el enlace` | Clics |
| `CPC (costo por clic en el enlace) (USD)` | CPC |

---

### Google Ads
**⚠️ Formato especial:** Las columnas están en la **fila 3**. La fila 2 contiene el rango de fechas.

| Columna en tu Excel | Métrica mapeada |
|---------------------|-----------------|
| `Campaña` | Nombre de campaña |
| `Clics` | Clics |
| `Impr.` | Impresiones |
| `CTR` | CTR |
| `Prom. CPC` | CPC |
| `Costo` | Gasto |
| `Conversiones` | Conversiones |

**Nota:** La fecha se extrae del rango en la fila 2 (ej: "1 nov 2024 - 29 nov 2024").

---

## 🚀 Comandos para ingestar

```bash
# Ingestar todos los archivos
npm run ingest:all

# Ingestar por plataforma
npm run ingest:google
npm run ingest:meta
npm run ingest:tiktok
```

---

## 📁 Estructura esperada

```
data/raw/
├── tiktok_campaigns.xlsx    # o .csv
├── meta_ads_report.xlsx     # o .csv  
├── google_ads_export.xlsx   # o .csv
└── README.md
```

---

## ✅ Verificar datos cargados

```bash
# Ver en Prisma Studio
npx prisma studio

# O vía API (con backend corriendo)
# GET http://localhost:4007/api/ingest/stats
```
