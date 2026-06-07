# Dispatch Details - Field Mapping Configuration

## Overview
The **Dispatch Details** comparison module now includes intelligent field mapping and transformation logic. This document outlines the field mappings, transformations, and how they work during the comparison process.

---

## Field Mapping: SAP → SFDC

| SAP Column | SFDC Column | Transformation |
|---|---|---|
| **Delivery** | Delivery Number | Direct mapping |
| **Item** | SAP Delivery Item Number | ⚙️ **Concatenate**: `Delivery + Item` |
| **Material** | Material Code: Product Name | Direct mapping |
| **Qty (stckpkg unit)** | Quantity | Direct mapping |
| **Bill.Doc.** | Invoice No: Billing Document | Direct mapping |
| **Created on** | Delivery Date | Direct mapping |
| **Sold-to pt** | Sold To Party | Direct mapping |
| **Ship-to** | Ship to Party Code | Direct mapping |
| **Bill of lading** | Bill of Lading | 🔗 **Aggregate**: Comma-separated by LR No |
| **LR No** | LR No | Direct mapping (derived from Bill of Lading) |
| **Transporter Name** | Transporter Name | Direct mapping (derived from Bill of Lading) |
| **No Of Packages** | No Of Packages | Direct mapping (derived from Bill of Lading) |
| **Net value** | Net Value | Direct mapping (derived from Bill of Lading) |
| **ShPt** | Plant | Direct mapping |
| **Sales Doc.** | DMS Sales Order Number For Dispatch | Direct mapping |
| **Total Weight** | Gross Weight | Direct mapping |
| **WUn** | Unit | Direct mapping |

---

## Transformation Logic

### 1. Item Field - Concatenation ⚙️

**Requirement**: In SAP, Item identification requires both Delivery and Item number.  
**SAP Data**: 
```
Delivery: 123456
Item: 001
```
**Transformation Applied**:
```javascript
Item_Concatenated = Delivery + Item
Item_Concatenated = "123456001"
```
**Result**: Item field becomes `123456001` for comparison against SFDC value.

**When Used**: During file upload, before comparison starts.  
**Purpose**: Ensures SAP Item can be properly matched with SFDC's `SAP Delivery Item Number`.

---

### 2. Bill of Lading - Aggregation 🔗

**Requirement**: SAP may have multiple records with the same LR No containing different Bill of Lading values (A, B, C, D). These need to be comma-separated into a single value for comparison.

**SAP Data Before Aggregation**:
```
LR No: LR001, Bill of Lading: A
LR No: LR001, Bill of Lading: B
LR No: LR001, Bill of Lading: C
LR No: LR001, Bill of Lading: D
```

**Transformation Applied**:
```javascript
// Group by LR No
if (multiple rows with same LR No) {
    Bill of Lading = "A,B,C,D"  // comma-separated
}
```

**Result After Aggregation**:
```
LR No: LR001, Bill of Lading: "A,B,C,D"
```

**When Used**: During file upload, after parsing CSV.  
**Purpose**: Consolidates multiple SAP rows into SFDC format for accurate comparison.

---

### 3. Derived Fields - From Bill of Lading 📦

The following fields are derived/extracted from the aggregated Bill of Lading data:

| Derived Field | Source | Purpose |
|---|---|---|
| **LR No** | Bill of Lading aggregation | Reference number for aggregated shipment |
| **Transporter Name** | Bill of Lading aggregation | Name of transport provider |
| **No Of Packages** | Bill of Lading aggregation | Total package count from aggregation |
| **Net value** | Bill of Lading aggregation | Net value of shipment items |

These fields maintain their source column values but are compared based on the aggregated Bill of Lading context.

---

## How It Works: Step-by-Step

### Before Comparison
1. **User uploads SAP file** → parseCSV() → applySapMappings() → **applyFieldMappingTransformations()**
2. **User uploads SFDC file** → parseCSV() → **applyFieldMappingTransformations()**

### During File Upload
```
SAP File Processing:
├─ Parse CSV data
├─ Apply SAP-specific mappings (value conversions if any)
├─ Apply Field Mapping Transformations:
│  ├─ Concatenate: Delivery + Item → Item
│  └─ Aggregate: Group Bill of Lading by LR No → comma-separated values
└─ Store transformed data in file1Data

SFDC File Processing:
├─ Parse CSV data
├─ Apply Field Mapping Transformations (same as SAP for consistency)
└─ Store transformed data in file2Data
```

### During Comparison
```
performComparison():
├─ Match records by key field (Dispatch_ID)
├─ For each record pair:
│  ├─ Compare Item (now: Delivery+Item format)
│  ├─ Compare Bill of Lading (now: comma-separated format)
│  └─ Compare derived fields based on aggregated values
└─ Generate comparison results with transformed data
```

---

## Example Scenario

### Scenario: Bill of Lading Aggregation

**Input - SAP File** (multiple rows with same LR No):
```csv
Dispatch_ID,LR No,Bill of Lading,Transporter Name,No Of Packages,Net value
DISP001,LR001,A,FedEx,50,10000
DISP001,LR001,B,FedEx,50,10000
DISP001,LR001,C,FedEx,50,10000
DISP001,LR001,D,FedEx,50,10000
```

**After Transformation**:
```csv
Dispatch_ID,LR No,Bill of Lading,Transporter Name,No Of Packages,Net value
DISP001,LR001,"A,B,C,D",FedEx,50,10000
DISP001,LR001,"A,B,C,D",FedEx,50,10000
DISP001,LR001,"A,B,C,D",FedEx,50,10000
DISP001,LR001,"A,B,C,D",FedEx,50,10000
```

**Input - SFDC File** (already aggregated):
```csv
Dispatch_ID,LR No,Bill of Lading,Transporter Name,No Of Packages,Net Value
DISP001,LR001,"A,B,C,D",FedEx,50,10000
```

**Comparison Result**: ✅ **Perfect Match!**

---

## Example Scenario 2

### Scenario: Item Concatenation

**Input - SAP File**:
```csv
Dispatch_ID,Delivery,Item,SAP Delivery Item Number,...
DISP001,123456,001,123456001,...
```

**After Transformation**:
```
Item field: "001" → "123456001" (Delivery + Item concatenated)
```

**Input - SFDC File**:
```csv
Dispatch_ID,Delivery Number,SAP Delivery Item Number,...
DISP001,123456,123456001,...
```

**Comparison Result**: ✅ **Perfect Match!**

---

## Implementation Details

### Code Location
- **Configuration**: [config.js](config.js#L54-L95) - `dispatch_details` module definition
- **Transformation Logic**: [comparison-script.js](comparison-script.js#L138-L210)
  - `applyFieldMappingTransformations()` - Main transformation orchestrator
  - `applyDispatchDetailsTransformations()` - Dispatch-specific logic
- **File Upload Handler**: [comparison-script.js](comparison-script.js#L95-L120) - Calls transformations on upload

### Functions

#### `applyFieldMappingTransformations(parsed, moduleKey)`
- **Purpose**: Apply module-specific field mapping transformations
- **Parameters**: 
  - `parsed`: Parsed CSV data object with headers and data arrays
  - `moduleKey`: Module identifier (e.g., 'dispatch_details')
- **Returns**: Transformed data object

#### `applyDispatchDetailsTransformations(parsed, transformations)`
- **Purpose**: Execute Dispatch Details specific transformations
- **Applies**:
  1. Item concatenation (Delivery + Item)
  2. Bill of Lading aggregation (group by LR No, comma-separate)
- **Returns**: Transformed data object

---

## Key Features

✅ **No Pre-Processing Required**: Transformations happen DURING comparison, not before upload  
✅ **Automatic Aggregation**: Multiple SAP rows with same LR No automatically consolidated  
✅ **Smart Concatenation**: Item field properly formatted for SAP-to-SFDC matching  
✅ **Derived Field Handling**: Maintains context of derived fields from aggregations  
✅ **Configurable**: Easy to add more field mappings or transformations  

---

## Adding More Field Mappings (Future)

To add field mappings for another module:

1. **Update config.js** - Add `fieldMapping` object to module config:
```javascript
moduleName: {
    name: "Module Name",
    fieldMapping: {
        sapToSfdc: { "SAP_Col": "SFDC_Col", ... },
        transformations: { "Col": { type: "...", ... }, ... }
    }
}
```

2. **Add Transformation Function** - In comparison-script.js:
```javascript
function applyModuleNameTransformations(parsed, transformations) {
    // Your transformation logic here
    return parsed;
}
```

3. **Call in Orchestrator** - Update `applyFieldMappingTransformations()`:
```javascript
if (moduleKey === 'module_name') {
    parsed = applyModuleNameTransformations(parsed, transformations);
}
```

---

## Testing Checklist

- [ ] Upload SAP file with multiple Bill of Lading values per LR No
- [ ] Verify aggregation: values should be comma-separated
- [ ] Upload SFDC file with pre-aggregated values
- [ ] Run comparison
- [ ] Verify Item field shows concatenated Delivery+Item
- [ ] Verify Bill of Lading values match after aggregation
- [ ] Check comparison results show accurate matches
- [ ] Export data and verify transformations are reflected in CSV

---

## FAQ

**Q: Do I need to preprocess the data before uploading?**  
A: No! Transformations are applied automatically during upload for Dispatch Details comparison.

**Q: Will the original data be modified?**  
A: No. The original column values are preserved; transformations create new fields/aggregations used for comparison only.

**Q: What if SAP and SFDC have different Bill of Lading formats?**  
A: The aggregation logic will normalize them. Ensure both files follow the mapping structure.

**Q: Can I disable these transformations?**  
A: The transformations are automatically applied for Dispatch Details. To use raw data, remove the `fieldMapping` config from the module.

---

**Version**: 1.0  
**Created**: 2026-06-07  
**Module**: Dispatch Details  
**Status**: ✅ Active
