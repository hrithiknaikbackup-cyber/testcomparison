# Data Comparison Tool - Multi-Module Edition

A comprehensive data comparison tool that allows users to compare CSV files from SAP and Salesforce (SFDC) across multiple business modules.

## 🎯 Features

### Main Features
- **Multi-Module Support**: Compare data across 7 different business modules
- **Smart Module Selection**: Attractive home screen with module cards
- **Automatic Key Field Detection**: Pre-selects the appropriate key field for each module
- **Advanced Comparison Analytics**: KPI cards showing match percentage, missing records, and extra records
- **Color-Coded Match Percentage**: Green highlight for match rate with visual progress bar
- **Separate Missing/Extra Records Tracking**: Identify records missing in SAP or SFDC and extra records in each system
- **Field-Level Analysis**: Detailed field comparison with match percentages
- **Multiple Export Formats**: Export to Excel, CSV, and JSON

### Supported Modules
1. **Quotation Header** (Key: Quotation_ID)
2. **Quotation Line** (Key: Line_ID)
3. **Order Header** (Key: Order_ID)
4. **Order Line** (Key: Item_ID)
5. **Invoice Header** (Key: Invoice_ID)
6. **Invoice Line** (Key: Line_No)
7. **Dispatch Details** (Key: Dispatch_ID)

## 📁 File Structure

### Core Files
- **index.html** - Home/landing page with module selection cards
- **comparison.html** - Comparison page for analyzing two CSV files
- **config.js** - Module configuration with key fields and metadata
- **home-script.js** - Navigation logic for home page
- **comparison-script.js** - Comparison logic with enhanced features
- **styles.css** - All styling for home page, comparison page, and responsive design

## 🔄 Navigation Flow

```
Home Page (index.html)
    ↓
  (Select Module)
    ↓
Comparison Page (comparison.html)
    ↓
  (Upload Files)
    ↓
Results & Analysis
```

## 📊 Comparison Results

### KPI Cards
- **Total SAP Records**: Count of all records in SAP file
- **Total SFDC Records**: Count of all records in SFDC file
- **Matched Records**: Records found in both systems
- **Match Percentage**: Percentage of matched records (green highlight)

### Missing & Extra Records
- **Missing in SAP**: Records in SFDC but not in SAP
- **Missing in SFDC**: Records in SAP but not in SFDC
- **Extra in SAP**: Same as "Missing in SFDC" (records only in SAP)
- **Extra in SFDC**: Same as "Missing in SAP" (records only in SFDC)
- **Mismatched Records**: Records in both systems but with different data
- **Perfect Matches**: Records that match completely

### Field-Level Comparison
Detailed breakdown showing:
- Field Name
- Total Records Compared
- Matching Records
- Non-Matching Records
- Match Percentage

## 🎨 User Interface

### Home Page
- Attractive gradient background
- Introduction card with features
- Module selection grid (7 cards)
- How-to guide and tips sections
- Responsive design for all devices

### Comparison Page
- Module-specific header with back button
- Side-by-side file upload with drag-and-drop
- Key column auto-selection based on module
- KPI summary cards
- Missing/Extra records cards
- Field-level comparison table
- Export options

## 🚀 How to Use

### Step 1: Select a Module
1. Open the application (opens at index.html)
2. Click on any module card from the grid

### Step 2: Upload Files
1. Upload your SAP CSV file (or drag-and-drop)
2. Upload your SFDC CSV file (or drag-and-drop)
3. The key column will be auto-selected based on the module

### Step 3: Compare
1. Click the "Compare Files" button
2. View instant results with KPI cards and missing/extra records

### Step 4: Analyze & Export
1. Review the field-level comparison table
2. Click on any card to view detailed records
3. Export results in Excel, CSV, or JSON format

## 📈 Analytics Explained

### Match Percentage
- Calculated as: (Matching Records / Common Records) × 100
- Highlighted in green for easy identification
- Includes a visual progress bar

### Missing Records
- **Missing in SAP**: Records that exist in SFDC but were not found in SAP
- Used to identify incomplete data in SAP system

### Extra Records
- **Extra in SAP**: Records in SAP that don't have corresponding entries in SFDC
- Used to identify data that may need to be cleaned or verified

### Mismatched Records
- Records that exist in both systems but have different field values
- Shows the comparison between SAP and SFDC values

## 🔧 Configuration

### Adding a New Module
Edit `config.js` and add a new entry:

```javascript
module_key: {
    name: "Module Name",
    icon: "🎯",
    description: "Module description",
    keyField: "Key_Column_Name",
    sapLabel: "SAP Label",
    sfdcLabel: "SFDC Label",
    color: "#hexcolor"
}
```

Then add corresponding card in `index.html`:

```html
<div class="module-card" onclick="navigateToComparison('module_key')">
    <div class="module-icon">🎯</div>
    <h3>Module Name</h3>
    <p>Description</p>
    <div class="module-meta">
        <span class="meta-badge">Key: Key_Column_Name</span>
    </div>
    <div class="module-arrow">→</div>
</div>
```

## 📱 Responsive Design

The application is fully responsive:
- **Desktop**: Full-width layout with multiple columns
- **Tablet**: Adjusted grid layout
- **Mobile**: Single-column layout with optimized spacing

## 💾 Data Export

### Excel Export
- Exports field-level comparison as an Excel file
- Includes all fields, totals, matching counts, and percentages

### CSV Export
- Standard CSV format with headers
- Compatible with Excel and other spreadsheet applications

### JSON Export
- Complete comparison data including:
  - Module information
  - Summary statistics
  - Detailed field comparison
  - System record counts

## ⚠️ Important Notes

1. **Column Names**: Ensure CSV files have matching column names for comparison, except Dispatch Details which supports field mapping
2. **Key Field**: The key field is crucial for accurate record matching
3. **CSV Format**: Use standard comma-separated format without special characters in header rows
4. **Session Storage**: Module selection is stored in session storage during comparison

## 🎯 Color Coding

- 🟦 **Blue**: SAP/Primary information
- 🟦 **Cyan**: SFDC information
- 🟢 **Green**: Matches and positive results
- 🔴 **Red**: Mismatches and missing data
- 🟨 **Yellow/Orange**: Warnings and extra records
- 🟪 **Purple**: Additional information

## 📝 Version Info

- **Version**: 2.0 (Multi-Module Edition)
- **Last Updated**: 2026
- **Status**: Production Ready

---

**Data Comparison Tool © 2026** | Compare SAP and SFDC data with precision