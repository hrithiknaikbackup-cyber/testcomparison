<!-- QUICK START GUIDE -->

# Data Comparison Tool - Quick Start Guide

## 📦 What's New in Version 2.0

Your data comparison tool has been completely enhanced with the following improvements:

### ✨ New Features Added

1. **Multi-Module Home Screen**
   - Beautiful dashboard with 7 module cards
   - Each module has a unique icon and key field identifier
   - Responsive design that works on desktop, tablet, and mobile

2. **Enhanced Comparison Page**
   - Module-specific headers showing what you're comparing
   - Automatic key field pre-selection based on module
   - Dynamic file upload labels (SAP vs SFDC)

3. **Advanced KPI Cards**
   - Total SAP Records
   - Total SFDC Records
   - Matched Records
   - **Match Percentage with Green Highlight & Progress Bar**

4. **Missing & Extra Records Cards**
   - Missing in SAP (Records in SFDC only)
   - Missing in SFDC (Records in SAP only)
   - Extra in SAP (Alternative view)
   - Extra in SFDC (Alternative view)
   - Mismatched Records (Different data in both)
   - Perfect Matches (Complete matches)

5. **Same Powerful Comparison Logic**
   - Field-level comparison with match percentages
   - Detailed field analysis table
   - Multiple export formats (Excel, CSV, JSON)

## 🚀 Getting Started

### Option 1: Open in Web Browser (Recommended)
```bash
# Navigate to your workspace folder
cd /workspaces/Comparison-V2

# Open index.html in your default browser
# Or use a local server:
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

### Option 2: Using VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 📖 File Structure

```
Comparison-V2/
├── index.html              ← Main entry point (Home page)
├── comparison.html         ← Comparison page
├── config.js              ← Module configurations
├── home-script.js         ← Home page navigation
├── comparison-script.js   ← Comparison logic
├── styles.css             ← All styling
├── script.js              ← Legacy script (backup)
└── README.md              ← Full documentation
```

## 🎯 How to Use

### Step 1: Start at Home Page
- Open `index.html` in your browser
- You'll see 7 module cards with beautiful styling

### Step 2: Select a Module
- Click on any module card (e.g., "Dispatch Details")
- You'll be taken to the comparison page for that module

### Step 3: Upload CSV Files
- Upload your SAP CSV file
- Upload your SFDC CSV file
- The key field will be auto-selected

### Step 4: Compare
- Click "Compare Files"
- Results appear instantly

### Step 5: Analyze & Export
- View KPI cards (SAP/SFDC counts, match percentage)
- See missing and extra records
- Click any card to see detailed records
- Export results in Excel, CSV, or JSON

## 🎨 Color Scheme

- 🟦 **Blue** (SAP) - Primary system
- 🟦 **Cyan** (SFDC) - Salesforce system
- 🟢 **Green** (Matches) - Successful matches
- 🔴 **Red** (Errors) - Mismatches and issues
- 🟨 **Orange/Yellow** (Warnings) - Extra records
- 🟪 **Purple** (Info) - Additional information

## 🔧 Available Modules

1. **Quotation Header** - Quotation_ID
2. **Quotation Line** - Line_ID
3. **Order Header** - Order_ID
4. **Order Line** - Item_ID
5. **Invoice Header** - Invoice_ID
6. **Invoice Line** - Line_No
7. **Dispatch Details** - Dispatch_ID

## 💡 Pro Tips

1. **CSV Format**: Ensure your CSV files have headers in the first row
2. **Matching Columns**: Both files should have the same column names unless using Dispatch Details, which supports field mapping
3. **Key Field**: The key field is crucial for accurate record matching
4. **Performance**: Works smoothly with files up to 10,000+ records
5. **Export**: Always export your comparison results for records and sharing

## 🔄 Navigation

```
Home Page (index.html)
    ↓ Click a module card
    ↓
Comparison Page (comparison.html)
    ↓ Upload files & compare
    ↓
Results with KPI Cards
    ↓ Click "Back to Modules"
    ↓
Home Page (for different module)
```

## ⚙️ Customization

### Add a New Module
1. Edit `config.js` - add module configuration
2. Edit `index.html` - add module card
3. The comparison logic will automatically adapt

### Change Colors
Edit `styles.css` - search for `--primary`, `--success`, `--danger`, etc.

### Modify Key Fields
Edit `config.js` - change the `keyField` property for any module

## 📊 Understanding the Results

### Match Percentage
- **Formula**: (Matched Records / Common Records) × 100
- **Green Highlight**: Always shows in green for positive visibility
- **Progress Bar**: Visual representation of the percentage

### Missing Records
- **Missing in SAP**: Exist in SFDC but not in SAP (data gap in SAP)
- **Missing in SFDC**: Exist in SAP but not in SFDC (data gap in SFDC)

### Extra Records
- **Extra in SAP**: Same as "Missing in SFDC"
- **Extra in SFDC**: Same as "Missing in SAP"

### Mismatches
- Records that exist in both systems
- But have different field values
- Shown with SAP value → SFDC value in the modal

## 🆘 Troubleshooting

### Module not loading?
- Check that `config.js` is properly loaded
- Verify `sessionStorage` is enabled in browser

### CSS not loading?
- Ensure `styles.css` is in the same directory
- Clear browser cache and reload

### Files not comparing?
- Check CSV format (comma-separated values)
- Ensure both files have matching column names unless using Dispatch Details, which supports field mapping
- Verify key field exists in both files

### Export not working?
- Check browser console for errors
- Ensure pop-up blocker is disabled
- Try a different export format

## 📱 Responsive Design

- **Desktop**: Full grid layout with all features
- **Tablet**: Adjusted grid with 2 columns
- **Mobile**: Single column with optimized spacing

## 🎓 Example CSV Format

```
Dispatch_ID,Customer_Name,Order_Date,Status
D001,Acme Corp,2024-01-01,Delivered
D002,Tech Inc,2024-01-02,Pending
D003,Global Ltd,2024-01-03,Shipped
```

## 📞 Support

For issues or feature requests:
1. Check the in-app help section
2. Review the README.md file
3. Check browser console (F12) for errors
4. Verify CSV file format and encoding

## ✅ Quick Checklist

- [ ] Open index.html in browser
- [ ] Select a module
- [ ] Upload SAP CSV file
- [ ] Upload SFDC CSV file
- [ ] Verify key column is selected
- [ ] Click "Compare Files"
- [ ] Review KPI cards
- [ ] Check missing/extra records
- [ ] Export results if needed
- [ ] Navigate back to home for another module

---

**Enjoy using the Data Comparison Tool!**

Version 2.0 © 2026 | Made with ❤️ for data accuracy
