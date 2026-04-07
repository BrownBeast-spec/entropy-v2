# CMS API Endpoints Reference

**Last Updated:** 2026-04-08  
**Purpose:** Developer reference for CMS drug pricing and Medicare Part D spending data APIs used in commercial intelligence MCP tools.

---

## Overview

CMS provides two primary data portals:

- **data.medicaid.gov** - Medicaid drug pricing (NADAC) and utilization data
- **data.cms.gov** - Medicare Part D prescriber and spending data

Both portals have migrated away from legacy Socrata SODA APIs to new REST-based endpoints.

---

## 1. CMS NADAC (National Average Drug Acquisition Cost)

### Dataset Information

**Dataset:** NADAC (National Average Drug Acquisition Cost)  
**Publisher:** data.medicaid.gov  
**Update Frequency:** Weekly  
**Coverage:** Current year + historical years back to 2014

### Current API Endpoints

#### Latest NADAC Data (2026)

**CSV Download URL:**

```
https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-04-08-2026.csv
```

**Dataset Metadata API:**

```
https://data.medicaid.gov/api/1/metastore/schemas/dataset/items/fbb83258-11c7-47f5-8b18-5f8e79f7e704
```

**Dataset ID:** `fbb83258-11c7-47f5-8b18-5f8e79f7e704`

#### Historical NADAC Data

NADAC data is organized by calendar year. Each year has its own dataset ID and download URL.

**Pattern:**

```
https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-MM-DD-YYYY.csv
```

**Available Years:**

- 2026: `fbb83258-11c7-47f5-8b18-5f8e79f7e704`
- 2025: `f38d0706-1239-442c-a3cc-40ef1b686ac0`
- 2024: `99315a95-37ac-4eee-946a-3c523b4c481e`
- 2023: `4a00010a-132b-4e4d-a611-543c9521280f`
- 2022 and earlier: Available via metastore API

#### NADAC Comparison Dataset

Weekly comparison file showing price changes:

**CSV Download URL:**

```
https://download.medicaid.gov/data/nadac-comparison-04-08-2026.csv
```

**Dataset ID:** `a217613c-12bc-5137-8b3a-ada0e4dad1ff`

### Data Format

**CSV Columns:**

- `NDC Description` - Drug name and strength
- `NDC` - National Drug Code (11-digit)
- `NADAC Per Unit` - Average acquisition cost per unit
- `Effective Date` - Date price became effective
- `Pricing Unit` - Unit of measure (EA, ML, GM)
- `Pharmacy Type Indicator` - Community/Institutional (C/I)
- `OTC` - Over-the-counter indicator (Y/N)
- `Explanation Code` - Pricing methodology code
- `Classification for Rate Setting` - Brand (B) or Generic (G)
- `Corresponding Generic Drug NADAC Per Unit` - Generic equivalent price
- `Corresponding Generic Drug Effective Date` - Generic price date
- `As of Date` - Data snapshot date

### Example Data

```csv
NDC Description,NDC,NADAC Per Unit,Effective Date,Pricing Unit,Pharmacy Type Indicator,OTC,Explanation Code,Classification for Rate Setting,Corresponding Generic Drug NADAC Per Unit,Corresponding Generic Drug Effective Date,As of Date
12HR NASAL DECONGEST ER 120 MG,24385005452,0.28683,12/18/2024,EA,C/I,Y,1,G,,,01/01/2025
24H NASAL ALLERGY 55 MCG SPRAY,46122038576,0.72316,12/18/2024,ML,C/I,Y,"1, 5",G,,,01/01/2025
```

### Discovery API

To find all available NADAC datasets:

```bash
curl -s "https://data.medicaid.gov/api/1/metastore/schemas/dataset/items" | \
  jq '[.[] | select(.title | contains("NADAC"))]'
```

### Implementation Notes

1. **No JSON REST API** - NADAC data is only available as CSV downloads
2. **Weekly Updates** - New files published weekly with updated prices
3. **File Size** - Current year file is ~50MB, contains all active NDCs
4. **Historical Data** - Each calendar year is a separate dataset/file
5. **Rate Limits** - Standard HTTP download, no documented rate limits
6. **Authentication** - Not required, public data

### Example Usage

```bash
# Download latest NADAC data
curl -o nadac_latest.csv \
  "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-04-08-2026.csv"

# Get metadata for NADAC 2026 dataset
curl "https://data.medicaid.gov/api/1/metastore/schemas/dataset/items/fbb83258-11c7-47f5-8b18-5f8e79f7e704" | jq '.'

# Search for specific NDC (requires local processing)
curl -s "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-04-08-2026.csv" | \
  grep "00002-7596-02"
```

---

## 2. Medicare Part D Spending Data

### Dataset Information

**Publisher:** data.cms.gov  
**API Type:** REST JSON API (data-api/v1)  
**Update Frequency:** Annual  
**Coverage:** 2019-2023 (annual), 2024-2026 (quarterly)

### Available Datasets

#### A. Medicare Part D Prescribers - by Provider and Drug

**Description:** Prescription drugs prescribed by individual providers to Medicare Part D beneficiaries.

**Dataset ID:** `9552739e-3d05-4c1b-8eff-ecabf391e2e5`

**API Endpoint:**

```
https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data
```

**CSV Download:**

```
https://data.cms.gov/sites/default/files/2025-04/0d5915ce-002c-4d87-bde8-24ffb08bb6cc/MUP_DPR_RY25_P04_V10_DY23_NPIBN.csv
```

**Metadata Endpoint:**

```
https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data-viewer
```

#### B. Medicare Part D Spending by Drug

**Description:** Multi-year drug spending data aggregated by drug name and manufacturer (2019-2023).

**Dataset ID:** `7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b`

**API Endpoint:**

```
https://data.cms.gov/data-api/v1/dataset/7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b/data
```

#### C. Medicare Quarterly Part D Spending by Drug

**Description:** Quarterly drug spending updates (latest data).

**Dataset ID:** `4ff7c618-4e40-483a-b390-c8a58c94fa15`

**API Endpoint:**

```
https://data.cms.gov/data-api/v1/dataset/4ff7c618-4e40-483a-b390-c8a58c94fa15/data
```

**CSV Download (Q1 2026):**

```
https://data.cms.gov/sites/default/files/2026-01/2d43e067-c2f2-4dfd-a991-95655df72052/QDD_PTD_RQ2601_P01_V10_DQT2502_20260106.csv
```

### API Parameters

#### Query Parameters

| Parameter     | Type    | Description                                | Example                    |
| ------------- | ------- | ------------------------------------------ | -------------------------- |
| `size`        | integer | Number of records to return (default: 100) | `?size=1000`               |
| `offset`      | integer | Skip N records for pagination              | `?offset=100`              |
| `column_name` | string  | Filter by exact column value               | `?Prscrbr_State_Abrvtn=CA` |

**Note:** Advanced filtering (operators like `>`, `<`, `contains`) is not currently supported. Column-value equality filtering works by passing column name as parameter.

### Data Schema

#### Part D Prescribers by Provider and Drug

**Key Fields:**

- `Prscrbr_NPI` - National Provider Identifier
- `Prscrbr_Last_Org_Name` - Provider last name or organization
- `Prscrbr_First_Name` - Provider first name
- `Prscrbr_City` - Provider city
- `Prscrbr_State_Abrvtn` - Provider state (2-letter code)
- `Prscrbr_State_FIPS` - FIPS state code
- `Prscrbr_Type` - Provider specialty/type
- `Brnd_Name` - Brand name of drug
- `Gnrc_Name` - Generic name of drug
- `Tot_Clms` - Total number of claims
- `Tot_30day_Fills` - Total 30-day standardized fills
- `Tot_Day_Suply` - Total days supply
- `Tot_Drug_Cst` - Total drug cost ($)
- `Tot_Benes` - Total beneficiaries (suppressed if <11)
- `GE65_*` - Corresponding fields for beneficiaries 65+

**File Size:** ~3.8GB CSV (tens of millions of records)

#### Part D Spending by Drug

**Key Fields:**

- `Brnd_Name` - Brand name
- `Gnrc_Name` - Generic name
- `Tot_Mftr` - Number of manufacturers
- `Mftr_Name` - Manufacturer name (or "Overall")
- `Tot_Spndng_YYYY` - Total spending for year YYYY
- `Tot_Dsg_Unts_YYYY` - Total dosage units for year YYYY
- `Tot_Clms_YYYY` - Total claims for year YYYY
- `Tot_Benes_YYYY` - Total beneficiaries for year YYYY
- `Avg_Spnd_Per_Dsg_Unt_Wghtd_YYYY` - Average spend per dosage unit
- `Avg_Spnd_Per_Clm_YYYY` - Average spend per claim
- `Avg_Spnd_Per_Bene_YYYY` - Average spend per beneficiary
- `Chg_Avg_Spnd_Per_Dsg_Unt_22_23` - Year-over-year change
- `CAGR_Avg_Spnd_Per_Dsg_Unt_19_23` - Compound annual growth rate

**Time Range:** 2019-2023 (annual data)

### Example API Calls

#### Basic Query - Get First 5 Records

```bash
curl "https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data?size=5"
```

#### Pagination - Get Next 100 Records

```bash
curl "https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data?size=100&offset=100"
```

#### Get Spending Data for Specific Drug

```bash
curl "https://data.cms.gov/data-api/v1/dataset/7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b/data?size=10" | \
  jq '.[] | select(.Gnrc_Name == "Atorvastatin")'
```

#### Get Metadata for Dataset

```bash
curl "https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data-viewer" | \
  jq '.meta'
```

### Example Response (Prescribers by Provider and Drug)

```json
[
  {
    "Prscrbr_NPI": "1003000126",
    "Prscrbr_Last_Org_Name": "Enkeshafi",
    "Prscrbr_First_Name": "Ardalan",
    "Prscrbr_City": "Bethesda",
    "Prscrbr_State_Abrvtn": "MD",
    "Prscrbr_State_FIPS": "24",
    "Prscrbr_Type": "Hospitalist",
    "Prscrbr_Type_Src": "Claim-Specialty",
    "Brnd_Name": "Eliquis",
    "Gnrc_Name": "Apixaban",
    "Tot_Clms": "13",
    "Tot_30day_Fills": "15.3",
    "Tot_Day_Suply": "437",
    "Tot_Drug_Cst": "8828.74",
    "Tot_Benes": "",
    "GE65_Sprsn_Flag": "#",
    "GE65_Tot_Clms": "",
    "GE65_Tot_30day_Fills": "",
    "GE65_Tot_Drug_Cst": "",
    "GE65_Tot_Day_Suply": "",
    "GE65_Bene_Sprsn_Flag": "*",
    "GE65_Tot_Benes": ""
  }
]
```

### Example Response (Spending by Drug)

```json
[
  {
    "Brnd_Name": "1st Tier Unifine Pentips",
    "Gnrc_Name": "Pen Needle, Diabetic",
    "Tot_Mftr": "1",
    "Mftr_Name": "Overall",
    "Tot_Spndng_2023": "44355.04",
    "Tot_Dsg_Unts_2023": "195672",
    "Tot_Clms_2023": "1613",
    "Tot_Benes_2023": "699",
    "Avg_Spnd_Per_Dsg_Unt_Wghtd_2023": "0.2271618646",
    "Avg_Spnd_Per_Clm_2023": "27.498474892",
    "Avg_Spnd_Per_Bene_2023": "63.454992847",
    "Outlier_Flag_2023": "0",
    "Chg_Avg_Spnd_Per_Dsg_Unt_22_23": "0.0057017529",
    "CAGR_Avg_Spnd_Per_Dsg_Unt_19_23": "0.0117543595"
  }
]
```

### Rate Limits and Performance

**Rate Limits:**

- No documented rate limits on CMS data.cms.gov API
- Standard HTTP/2 connection limits apply
- Recommend implementing exponential backoff for robustness

**Performance Characteristics:**

- API response time: 200-500ms for small queries (size ≤ 100)
- Large queries (size = 1000): ~2-3 seconds
- CSV downloads: Multi-GB files, use streaming/chunked downloads
- API returns JSON arrays, no pagination metadata in response

**Best Practices:**

1. Use `size` parameter to limit response size (max tested: 1000)
2. Implement pagination with `offset` for large datasets
3. Cache responses locally - data updates annually
4. For full dataset access, download CSV files instead of API
5. Use metadata endpoint once to understand schema

### Discovery API

To find all available CMS datasets:

```bash
curl "https://data.cms.gov/data.json" | jq '.dataset[] | select(.title | contains("Part D"))'
```

To search for specific topics:

```bash
# Search for drug spending datasets
curl "https://data.cms.gov/data.json" | \
  jq '.dataset[] | select(.title | contains("Drug") and .title | contains("Spending"))'
```

---

## Implementation Recommendations

### For Commercial Intelligence MCP Tools

#### 1. Data Ingestion Strategy

**NADAC Data:**

- Implement weekly CSV download job
- Parse CSV into structured database (e.g., PostgreSQL)
- Index on NDC, drug name, and effective date
- Keep 2-3 years of historical data for trend analysis

**Part D Data:**

- Use API for targeted queries (specific drugs, providers)
- Download annual CSV files for bulk analytics
- Update quarterly for latest spending trends
- Index on NPI, drug name, state, and cost fields

#### 2. Caching Layer

```typescript
// Example caching strategy
interface CacheConfig {
  nadac: {
    ttl: "7 days"; // Weekly updates
    strategy: "full-refresh";
  };
  partd_prescribers: {
    ttl: "1 year"; // Annual updates
    strategy: "incremental";
  };
  partd_spending: {
    ttl: "90 days"; // Quarterly updates
    strategy: "incremental";
  };
}
```

#### 3. Query Optimization

- **Small Queries:** Use API with appropriate `size` parameter
- **Large Queries:** Download CSV and query locally
- **Targeted Queries:** Filter by state/drug name at application level
- **Aggregations:** Pre-compute common aggregations (top drugs, regional trends)

#### 4. Error Handling

```typescript
// Recommended retry logic
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      if (response.status === 429) {
        await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
```

#### 5. Data Quality Checks

- **NADAC:** Validate NDC format (11 digits), check for null prices
- **Part D:** Handle suppression flags (`*`, `#`) for privacy protection
- **Both:** Validate date formats, numeric ranges, and required fields

---

## API Status and Migration Notes

### What Changed (2024-2026)

**Old (Deprecated):**

- Socrata SODA API endpoints (e.g., `/api/views/a4y5-998d/rows.csv`)
- Single monolithic NADAC dataset with all years
- Legacy data.medicaid.gov structure

**New (Current):**

- Year-specific NADAC datasets with individual UUIDs
- REST JSON API for Medicare data (`/data-api/v1/`)
- Metadata API for discovery (`/api/1/metastore/`)
- Direct CSV downloads from `download.medicaid.gov`

### Migration Checklist

- [x] Update NADAC URLs to year-specific endpoints
- [x] Migrate from Socrata SODA to CMS data-api/v1
- [x] Update Part D endpoints to new dataset IDs
- [x] Implement pagination (offset/size instead of SODA $limit/$offset)
- [x] Update column name references (some fields renamed)
- [ ] Test integration with new API response formats
- [ ] Update documentation and error messages

---

## Support and Resources

**Official Documentation:**

- CMS Data Portal: https://data.cms.gov
- Medicaid Data Portal: https://data.medicaid.gov
- Contact: Medicaid.gov@cms.hhs.gov

**Data Dictionary:**

- NADAC: Embedded in metadata API responses
- Part D: Available via data-viewer endpoints

**Legal:**

- All data is public domain (no API key required)
- Standard government data use policies apply
- Attribution recommended but not required

---

## Appendix: Quick Reference

### Essential URLs

```bash
# NADAC Latest (2026)
NADAC_LATEST="https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-04-08-2026.csv"

# Part D Prescribers API
PARTD_PRESCRIBERS="https://data.cms.gov/data-api/v1/dataset/9552739e-3d05-4c1b-8eff-ecabf391e2e5/data"

# Part D Spending API
PARTD_SPENDING="https://data.cms.gov/data-api/v1/dataset/7e0b4365-fd63-4a29-8f5e-e0ac9f66a81b/data"

# Part D Quarterly API
PARTD_QUARTERLY="https://data.cms.gov/data-api/v1/dataset/4ff7c618-4e40-483a-b390-c8a58c94fa15/data"

# Dataset Discovery
CMS_CATALOG="https://data.cms.gov/data.json"
MEDICAID_CATALOG="https://data.medicaid.gov/api/1/metastore/schemas/dataset/items"
```

### Common Use Cases

| Use Case                     | Recommended Endpoint              | Method           |
| ---------------------------- | --------------------------------- | ---------------- |
| Latest drug prices           | NADAC CSV Download                | HTTP GET         |
| Price for specific NDC       | NADAC CSV Download + local search | CSV parse        |
| Prescriber spending by state | Part D Prescribers API            | API + pagination |
| Drug spending trends         | Part D Spending by Drug           | API or CSV       |
| Quarterly updates            | Part D Quarterly API              | API              |
| Bulk analytics               | CSV downloads                     | ETL pipeline     |

---

**Document Version:** 1.0  
**API Version:** data-api/v1 (2024+)  
**Last Verified:** 2026-04-08
