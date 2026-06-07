// Comparison page script

// Global state
let file1Data = null;
let file2Data = null;
let comparisonResult = null;
let currentModalData = [];
let currentModalType = null;
let selectedModule = null;
let moduleConfig = null;
let currentFieldDetail = null;
let fieldDetailView = 'all'; // 'all', 'matching', 'non-matching'

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeModule();
    setupFileUpload('file1', 'uploadBox1', 'fileName1');
    setupFileUpload('file2', 'uploadBox2', 'fileName2');
    
    document.getElementById('compareBtn').addEventListener('click', performComparison);
    document.getElementById('searchTable').addEventListener('input', searchTable);
});

// Initialize module
function initializeModule() {
    selectedModule = sessionStorage.getItem('selectedModule');
    
    if (!selectedModule || !MODULE_CONFIG[selectedModule]) {
        // Redirect to home if no module selected
        window.location.href = 'home.html';
        return;
    }
    
    moduleConfig = MODULE_CONFIG[selectedModule];
    
    // Update header
    document.getElementById('moduleTitle').innerHTML = `${moduleConfig.icon} ${moduleConfig.name}`;
    document.getElementById('moduleSubtitle').textContent = moduleConfig.description;
    
    // Update file labels
    document.getElementById('sapFileLabel').textContent = `Upload ${moduleConfig.sapLabel}`;
    document.getElementById('sfdcFileLabel').textContent = `Upload ${moduleConfig.sfdcLabel}`;
}

// Setup file upload for each box
function setupFileUpload(fileInputId, boxId, fileNameId) {
    const fileInput = document.getElementById(fileInputId);
    const uploadBox = document.getElementById(boxId);
    const fileNameDisplay = document.getElementById(fileNameId);

    // Click to upload
    fileInput.addEventListener('change', (e) => handleFileSelect(e, fileNameId));

    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('drag-over');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('drag-over');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput }, fileNameId);
        }
    });
}

// Handle file selection
function handleFileSelect(event, fileNameId) {
    const file = event.target.files[0];
    
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
        showAlert('Please select a valid CSV file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csv = e.target.result;
            
            // Validate CSV format first
            validateCSV(csv, selectedModule);
            
            const data = parseCSV(csv);
            
            if (!data || !data.headers || data.headers.length === 0) {
                throw new Error('Invalid CSV format: No headers found');
            }
            
            // Apply transformations for SAP file
            if (fileNameId === 'fileName1') {
                // Filter columns based on field mapping for modules that support it
                data = filterColumnsByMapping(data, selectedModule, true);

                // Apply SAP-to-business value mappings for Order Header/Line modules
                applySapMappings(data, selectedModule);
                // Apply field mapping transformations for modules like Dispatch Details
                applyFieldMappingTransformations(data, selectedModule);
                file1Data = data;
                document.getElementById('fileName1').textContent = `✅ ${file.name}`;
            } else {
                // Filter columns based on field mapping for modules that support it
                data = filterColumnsByMapping(data, selectedModule, false);

                // Apply field mapping transformations for modules like Dispatch Details
                applyFieldMappingTransformations(data, selectedModule);
                file2Data = data;
                document.getElementById('fileName2').textContent = `✅ ${file.name}`;
            }

            updateKeyColumnOptions();
            showAlert(`File "${file.name}" uploaded successfully (${data.data.length} records)`, 'success');
        } catch (error) {
            showAlert(`Error parsing CSV: ${error.message}`, 'error');
            console.error('CSV Parsing Error:', error);
        }
    };

    reader.readAsText(file);
}

// Parse CSV to array of objects with better handling of edge cases
function parseCSV(csv) {
    try {
        const lines = csv.trim().split('\n').filter(line => line.trim()); // Remove empty lines
        if (lines.length < 1) throw new Error('CSV file is empty');

        // Parse header row - handle quoted values
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);
        
        if (headers.length === 0) throw new Error('No headers found in CSV file');

        const data = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const obj = {};
                
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });

                data.push(obj);
            } catch (rowError) {
                console.warn(`Warning: Skipping row ${i + 1} due to parsing error: ${rowError.message}`);
            }
        }

        if (data.length === 0) throw new Error('No data rows found in CSV file');

        return { headers, data };
    } catch (error) {
        throw new Error(`CSV parsing failed: ${error.message}`);
    }
}

// Validate CSV format
function validateCSV(csv, moduleKey) {
    try {
        const lines = csv.trim().split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV must have at least header row and one data row');
        
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);
        
        if (headers.length === 0) throw new Error('No headers found');
        
        // Validate data rows
        let validRowCount = 0;
        for (let i = 1; i < Math.min(lines.length, 10); i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length !== headers.length) {
                console.warn(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
            } else {
                validRowCount++;
            }
        }
        
        if (validRowCount === 0 && lines.length > 1) {
            throw new Error('No valid data rows found (all rows have incorrect column count)');
        }
        
        return true;
    } catch (error) {
        throw new Error(`CSV validation failed: ${error.message}`);
    }
}

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote: ""
                currentValue += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote mode
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of field
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Add last value
    values.push(currentValue.trim());
    
    return values;
}

// Filter columns based on field mapping configuration for specific modules
function filterColumnsByMapping(parsed, moduleKey, isSourceFile) {
    if (!parsed || !parsed.headers || !Array.isArray(parsed.data)) return parsed;
    moduleKey = moduleKey || selectedModule;
    if (!moduleKey) return parsed;
    
    const moduleConfig = MODULE_CONFIG[moduleKey];
    if (!moduleConfig || !moduleConfig.fieldMapping) return parsed;
    
    const fieldMapping = moduleConfig.fieldMapping;
    const sapToSfdcMapping = fieldMapping.sapToSfdc || {};
    
    // Apply field mapping based filtering for modules with mapping configuration
    const allowedColumns = new Set();

    if (isSourceFile) {
        Object.keys(sapToSfdcMapping).forEach(col => allowedColumns.add(col));
        if (moduleConfig.keyField) allowedColumns.add(moduleConfig.keyField);
    } else {
        Object.values(sapToSfdcMapping).forEach(col => allowedColumns.add(col));
        if (moduleConfig.keyField) allowedColumns.add(moduleConfig.keyField);
    }

    const originalHeaders = parsed.headers;
    const filteredHeaders = originalHeaders.filter(h => allowedColumns.has(h));

    // If we have at least one mapped or required header, keep the filtered dataset.
    if (filteredHeaders.length > 0) {
        const filteredData = parsed.data.map(row => {
            const filteredRow = {};
            filteredHeaders.forEach(header => {
                filteredRow[header] = row[header] !== undefined ? row[header] : '';
            });
            return filteredRow;
        });

        return { headers: filteredHeaders, data: filteredData };
    }

    // No mapped headers found, preserve the original parsed data so comparison can still use raw column names.
    console.warn(`No mapped columns found for ${isSourceFile ? 'SAP' : 'SFDC'} file in module "${moduleKey}". Available headers: ${originalHeaders.join(', ')}`);
    return parsed;
}

// Apply field mapping transformations for specific modules (e.g., Dispatch Details)
function applyFieldMappingTransformations(parsed, moduleKey) {
    if (!parsed || !parsed.headers || !Array.isArray(parsed.data)) return parsed;
    moduleKey = moduleKey || selectedModule;
    if (!moduleKey) return parsed;
    
    const moduleConfig = MODULE_CONFIG[moduleKey];
    if (!moduleConfig || !moduleConfig.fieldMapping) return parsed;
    
    const fieldMapping = moduleConfig.fieldMapping;
    const transformations = fieldMapping.transformations || {};
    
    // Handle special transformations
    if (moduleKey === 'dispatch_details') {
        parsed = applyDispatchDetailsTransformations(parsed, transformations);
    }
    
    return parsed;
}

// Apply specific transformations for Dispatch Details module
function applyDispatchDetailsTransformations(parsed, transformations) {
    if (!parsed || !parsed.data || parsed.data.length === 0) return parsed;
    
    // 1. ITEM TRANSFORMATION: Concatenate Delivery + Item
    // SAP Item should be transformed by concatenating Delivery + Item
    // Example: Delivery=123456, Item=001 → SAP Delivery Item Number=123456001
    const deliveryCol = "Delivery";
    const itemCol = "Item";
    
    parsed.data.forEach(row => {
        if (row[deliveryCol] !== undefined || row[itemCol] !== undefined) {
            const delivery = String(row[deliveryCol] || '').trim();
            const item = String(row[itemCol] || '').trim();
            // Update Item field to contain concatenated value
            row["Item"] = delivery + item;
        }
    });
    
    // 2. BILL OF LADING TRANSFORMATION: Parse comma-separated format
    // Bill of Lading contains: "LR No, Date, Transporter Name, No Of Packages"
    // Extract: LR No (1st), Transporter Name (3rd), No Of Packages (4th)
    // Ignore: Date (2nd)
    const billOfLadingCol = "Bill of lading";
    
    parsed.data.forEach(row => {
        if (row[billOfLadingCol]) {
            const billValue = String(row[billOfLadingCol] || '').trim();
            const parts = billValue.split(',');
            
            // Extract components (with safety for fewer than 4 values)
            row["LR No"] = parts[0] ? parts[0].trim() : "";
            // parts[1] is Date - ignore completely
            row["Transporter Name"] = parts[2] ? parts[2].trim() : "";
            row["No Of Packages"] = parts[3] ? parts[3].trim() : "";
            
            console.debug(`Bill of Lading parsed: "${billValue}" → LR No="${row["LR No"]}", Transporter="${row["Transporter Name"]}", Packages="${row["No Of Packages"]}"`);
        }
    });

    // Include any generated columns in the header list so derived fields are available for comparison.
    const generatedFields = ["LR No", "Transporter Name", "No Of Packages"];
    const newHeaders = new Set(parsed.headers);
    generatedFields.forEach(field => {
        if (parsed.data.some(row => row[field] !== undefined)) {
            newHeaders.add(field);
        }
    });
    parsed.headers = Array.from(newHeaders);
    
    return parsed;
}

// Apply SAP value mappings for Order Header and Order Line modules
function applySapMappings(parsed, moduleKey) {
    if (!parsed || !parsed.headers || !Array.isArray(parsed.data)) return parsed;
    moduleKey = moduleKey || selectedModule;
    if (!moduleKey) return parsed;
    // Only apply for order header / order line modules
    if (!['order_header', 'order_line'].includes(moduleKey)) return parsed;

    const statusRegex = /status/i;
    const salesOrgRegex = /sales[_\s-]*org|sales[_\s-]*organization|salesorg/i;
    const orderTypeRegex = /order[_\s-]*type|ordertype/i;

    const salesOrgMap = {
        '1511': 'ESP LV',
        '1512': 'ESP-Automation',
        '1513': 'ESP Agri',
        '1514': 'ESP Retail',
        '1515': 'ESP Services'
    };

    parsed.data.forEach(row => {
        parsed.headers.forEach(header => {
            const raw = row[header] !== undefined ? String(row[header]).trim() : '';
            if (statusRegex.test(header)) {
                if (raw === 'A') row[header] = 'Not Yet Processed';
                else if (raw === 'B') row[header] = 'Partially Processed';
                else if (raw === 'C') row[header] = 'Completely Processed';
            } else if (salesOrgRegex.test(header)) {
                if (salesOrgMap[raw]) row[header] = salesOrgMap[raw];
            } else if (orderTypeRegex.test(header)) {
                const up = raw.toUpperCase();
                if (up === 'ZORS') row[header] = 'Standard Order';
                else if (up === 'ZPRS') row[header] = 'Project Quotation';
            }
        });
    });

    return parsed;
}

// Normalize data formats across both SAP and SFDC files
function normalizeDataFormats(parsed) {
    if (!parsed || !parsed.headers || !Array.isArray(parsed.data)) return parsed;

    // Helper to detect if a value looks like a date
    function isDateLike(val) {
        if (!val) return false;
        const s = String(val).trim();
        return /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})(?:\s+\d{1,2}:\d{1,2}:\d{1,2})?$/.test(s);
    }

    // Helper to parse date and return ISO string (YYYY-MM-DD)
    function parseDate(val) {
        if (!val) return '';
        const s = String(val).trim();

        const ymd = /^([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})(?:\s+([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}))?$/.exec(s);
        if (ymd) {
            const [_, year, month, day] = ymd;
            return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        const dmy = /^([0-9]{1,2})[-/.]([0-9]{1,2})[-/.]([0-9]{4})(?:\s+([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}))?$/.exec(s);
        if (dmy) {
            const [_, day, month, year] = dmy;
            return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        const date = new Date(s);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        return s;
    }

    // Helper to detect if a value looks like a number
    function isNumberLike(val) {
        if (!val) return false;
        const s = String(val).trim();
        // Match numbers including those with commas, decimal points, or spaces as thousands separator
        return /^-?[\d,.\s]+$/.test(s) && /\d/.test(s);
    }

    // Helper to normalize numbers to a consistent format (remove spaces, handle commas)
    function normalizeNumber(val) {
        if (!val) return val;
        const s = String(val).trim();
        // Remove spaces (thousands separator in some locales)
        let normalized = s.replace(/\s/g, '');
        // If it contains both comma and period, determine which is decimal separator
        if (normalized.includes(',') && normalized.includes('.')) {
            const lastCommaIdx = normalized.lastIndexOf(',');
            const lastDotIdx = normalized.lastIndexOf('.');
            if (lastCommaIdx > lastDotIdx) {
                // Comma is decimal: remove dots, replace comma with period
                normalized = normalized.replace(/\./g, '').replace(',', '.');
            } else {
                // Dot is decimal: remove commas
                normalized = normalized.replace(/,/g, '');
            }
        } else if (normalized.includes(',')) {
            // Only comma: could be decimal (EU) or thousands (US with only one group)
            // If there are <= 2 digits after comma, treat as decimal
            const parts = normalized.split(',');
            if (parts[1] && parts[1].length <= 2) {
                normalized = parts[0].replace(/\./g, '') + '.' + parts[1];
            } else {
                normalized = normalized.replace(/,/g, '');
            }
        }
        return normalized;
    }

    // Analyze column data types and normalize
    const columnTypes = {};
    
    parsed.headers.forEach(header => {
        let hasDateLike = false;
        let hasNumberLike = false;
        let sampleValues = [];

        for (let i = 0; i < Math.min(parsed.data.length, 10); i++) {
            const val = parsed.data[i][header];
            if (val && String(val).trim().length > 0) {
                sampleValues.push(val);
                if (isDateLike(val)) hasDateLike = true;
                if (isNumberLike(val)) hasNumberLike = true;
            }
        }

        // Determine primary type: date > number > text
        if (hasDateLike && sampleValues.length >= 2 && sampleValues.filter(isDateLike).length >= sampleValues.length * 0.5) {
            columnTypes[header] = 'date';
        } else if (hasNumberLike && sampleValues.length >= 2 && sampleValues.filter(isNumberLike).length >= sampleValues.length * 0.8) {
            columnTypes[header] = 'number';
        } else {
            columnTypes[header] = 'text';
        }
    });

    // Normalize values by detected type
    parsed.data.forEach(row => {
        parsed.headers.forEach(header => {
            const type = columnTypes[header];
            let val = row[header];
            
            if (val === undefined || val === null || val === '') {
                row[header] = '';
            } else {
                const s = String(val).trim();
                if (type === 'date') {
                    row[header] = parseDate(s);
                } else if (type === 'number') {
                    row[header] = normalizeNumber(s);
                } else {
                    // For text: trim and preserve case
                    row[header] = s;
                }
            }
        });
    });

    // Store column type info for reference
    parsed.columnTypes = columnTypes;
    return parsed;
}

// Update key column options
function updateKeyColumnOptions() {
    const select = document.getElementById('keyColumn');
    
    if (!file1Data || !file2Data) {
        select.disabled = true;
        return;
    }

    // Get field mapping if available
    const moduleConfig = MODULE_CONFIG[selectedModule];
    let commonColumns = [];
    let sapToSfdcMapping = {};

    if (moduleConfig && moduleConfig.fieldMapping) {
        // Use field mapping to determine common columns
        sapToSfdcMapping = moduleConfig.fieldMapping.sapToSfdc || {};
        commonColumns = Object.keys(sapToSfdcMapping).filter(sapCol => {
            const sfdcCol = sapToSfdcMapping[sapCol];
            return file1Data.headers.includes(sapCol) && file2Data.headers.includes(sfdcCol);
        });
        console.debug(`Using field mapping: Found ${commonColumns.length} mapped columns`);
    } else {
        // Fallback to exact column name matches
        commonColumns = file1Data.headers.filter(h => 
            file2Data.headers.includes(h)
        );
        console.debug(`Using common column names: Found ${commonColumns.length} common columns`);
    }

    if (commonColumns.length === 0) {
        showAlert('No common columns found between files', 'error');
        select.disabled = true;
        return;
    }

    // Pre-select the module's key field if it exists
    select.innerHTML = '<option value="">Select a column...</option>';
    commonColumns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        
        // Pre-select if this is the module's key field
        if (col === moduleConfig?.keyField) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });

    // If module's key field exists in both files, enable compare
    if (commonColumns.includes(moduleConfig?.keyField)) {
        select.value = moduleConfig.keyField;
    }
    
    select.disabled = false;
}

// Enable/disable compare button
document.addEventListener('change', () => {
    const keyColumn = document.getElementById('keyColumn').value;
    document.getElementById('compareBtn').disabled = !keyColumn;
});

// Perform comparison
// Normalize values for comparison according to Dispatch Details requirements
// - Trim leading and trailing spaces
// - Case-insensitive comparison
// - NULL, undefined, and blank treated as empty string
// - 0 and blank treated as MATCH
// - 01, 1, 001 treated as MATCH (remove leading zeros for numeric values)
// - Ignore extra spaces between values
function normalizeValue(value) {
    if (value === null || value === undefined) return '';
    
    let str = String(value).trim();
    
    // Remove extra spaces between values
    str = str.replace(/\s+/g, ' ');
    
    // For numeric-only values, remove leading zeros
    // "001" → "1", "01" → "1", "00" → "0"
    if (/^\d+$/.test(str)) {
        const num = parseInt(str, 10);
        str = String(num);
    }
    
    // Treat 0 and blank as empty for matching purposes
    if (str === '0' || str === '') {
        str = '';
    }
    
    return str;
}

function performComparison() {
    const keyColumn = document.getElementById('keyColumn').value;

    if (!file1Data || !file2Data || !keyColumn) {
        showAlert('Please upload both files and select a key column', 'error');
        return;
    }

    try {
        // Normalize data formats in both files before comparison
        normalizeDataFormats(file1Data);
        normalizeDataFormats(file2Data);

        // Determine columns to compare based on field mapping (if available) or common columns
        let commonCols = [];
        let sapToSfdcMapping = {};
        const moduleConfig = MODULE_CONFIG[selectedModule];

        if (moduleConfig && moduleConfig.fieldMapping) {
            // Use field mapping for modules like dispatch_details
            sapToSfdcMapping = moduleConfig.fieldMapping.sapToSfdc || {};
            commonCols = Object.keys(sapToSfdcMapping).filter(sapCol => {
                const sfdcCol = sapToSfdcMapping[sapCol];
                return file1Data.headers.includes(sapCol) && file2Data.headers.includes(sfdcCol);
            });
            console.debug(`Using field mapping for module "${selectedModule}": Found ${commonCols.length} mapped columns`);
        } else {
            // Fallback to common column names for other modules
            commonCols = file1Data.headers.filter(h => 
                file2Data.headers.includes(h)
            );
            console.debug(`Using common column names: Found ${commonCols.length} common columns`);
        }

        if (commonCols.length === 0) {
            throw new Error(`No columns available for comparison. Check that files have compatible column names or field mapping.`);
        }

        // Create maps for quick lookup
        // Note: Key column should be the same in both files (not mapped)
        const map1 = new Map();
        const map2 = new Map();

        file1Data.data.forEach(row => {
            const keyValue = row[keyColumn];
            if (keyValue !== undefined && keyValue !== null && keyValue !== '') {
                map1.set(keyValue, row);
            }
        });

        file2Data.data.forEach(row => {
            // Check if key column needs mapping (get SFDC column name)
            const sfdcKeyColName = sapToSfdcMapping[keyColumn] || keyColumn;
            const keyValue = row[sfdcKeyColName];
            if (keyValue !== undefined && keyValue !== null && keyValue !== '') {
                map2.set(keyValue, row);
            }
        });

        // Find records in each system
        const onlyInFile1 = [];
        const onlyInFile2 = [];
        const common = [];

        // Records in File1
        map1.forEach((row, key) => {
            if (!map2.has(key)) {
                onlyInFile1.push({ ...row, [keyColumn]: key });
            } else {
                common.push(key);
            }
        });

        // Records in File2
        map2.forEach((row, key) => {
            if (!map1.has(key)) {
                onlyInFile2.push({ ...row, [keyColumn]: key });
            }
        });

        // Find common records and compare
        const fieldComparison = {};
        const mismatches = [];
        const matches = [];

        commonCols.forEach(col => {
            if (col !== keyColumn) {
                fieldComparison[col] = {
                    field: col,
                    total: common.length,
                    matching: 0,
                    nonMatching: 0
                };
            }
        });

        common.forEach(key => {
            const row1 = map1.get(key);
            const row2 = map2.get(key);
            let recordMatches = true;
            const mismatchDetails = {};

            commonCols.forEach(col => {
                if (col !== keyColumn) {
                    // Get SAP column value from file1
                    const val1 = row1[col] !== undefined ? String(row1[col]).trim() : '';
                    
                    // Get SFDC column value from file2 (using mapping if available)
                    let sfdcColName = col; // default: same column name
                    if (sapToSfdcMapping[col]) {
                        sfdcColName = sapToSfdcMapping[col];
                    }
                    const val2 = row2[sfdcColName] !== undefined ? String(row2[sfdcColName]).trim() : '';
                    
                    // Normalize and compare values
                    const norm1 = normalizeValue(val1);
                    const norm2 = normalizeValue(val2);
                    
                    // Case-insensitive comparison
                    const isMatch = norm1.toLowerCase() === norm2.toLowerCase();
                    
                    if (isMatch) {
                        fieldComparison[col].matching++;
                    } else {
                        recordMatches = false;
                        fieldComparison[col].nonMatching++;
                        mismatchDetails[col] = { file1: val1, file2: val2 };
                    }
                }
            });

            if (recordMatches) {
                matches.push(row1);
            } else {
                mismatches.push({
                    [keyColumn]: key,
                    ...row1,
                    _mismatches: mismatchDetails
                });
            }
        });

        comparisonResult = {
            keyColumn,
            totalFile1: map1.size,
            totalFile2: map2.size,
            commonRecords: common.length,
            onlyInFile1: onlyInFile1,
            onlyInFile2: onlyInFile2,
            mismatchRecords: mismatches,
            matchRecords: matches,
            fieldComparison,
            sapToSfdcMapping: sapToSfdcMapping,
            totalMatchingFields: Object.values(fieldComparison).reduce((sum, f) => sum + f.matching, 0),
            totalMismatches: Object.values(fieldComparison).reduce((sum, f) => sum + f.nonMatching, 0)
        };

        displayResults();
        showAlert('Comparison completed successfully!', 'success');
    } catch (error) {
        showAlert(`Comparison error: ${error.message}`, 'error');
        console.error('Comparison Error:', error);
    }
}

// Display results
function displayResults() {
    if (!comparisonResult) return;

    const { totalFile1, totalFile2, commonRecords, onlyInFile1, onlyInFile2, mismatchRecords, matchRecords, fieldComparison } = comparisonResult;

    // Update KPI cards
    document.getElementById('totalSapRecords').textContent = totalFile1.toLocaleString();
    document.getElementById('totalSfdcRecords').textContent = totalFile2.toLocaleString();
    document.getElementById('matchedKpiRecords').textContent = matchRecords.length.toLocaleString();
    
    // Calculate average of field-level Match % values
    const fieldMatchPercentages = Object.values(fieldComparison).map(field => {
        return field.total > 0 ? (field.matching / field.total) * 100 : 0;
    });
    
    const averageMatchPercentage = fieldMatchPercentages.length > 0
        ? (fieldMatchPercentages.reduce((a, b) => a + b, 0) / fieldMatchPercentages.length).toFixed(2)
        : 0;
    
    document.getElementById('matchPercentageKpi').textContent = `${averageMatchPercentage}%`;
    document.getElementById('progressFill').style.width = `${averageMatchPercentage}%`;

    const quantityMatchPercentage = totalFile1 > 0 && totalFile2 > 0
        ? ((commonRecords / Math.max(totalFile1, totalFile2)) * 100).toFixed(2)
        : 0;

    document.getElementById('quantityMatchPercentageKpi').textContent = `${quantityMatchPercentage}%`;
    document.getElementById('quantityProgressFill').style.width = `${quantityMatchPercentage}%`;

    const recordDifference = Math.abs(totalFile1 - totalFile2);
    const recordDiffEl = document.getElementById('recordDifferenceKpi');
    if (recordDiffEl) recordDiffEl.textContent = recordDifference.toLocaleString();

    // Determine date range from SAP file (file1Data) if possible
    const dateRangeEl = document.getElementById('comparisonDateRange');
    if (dateRangeEl && window.file1Data && Array.isArray(window.file1Data.data)) {
        const headers = window.file1Data.headers || [];
        const dateCol = headers.find(h => /date|deliv|delivery date/i.test(h));
        if (dateCol) {
            const dates = window.file1Data.data
                .map(r => parseDate(r[dateCol]))
                .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
                .map(d => new Date(d));
            if (dates.length > 0) {
                const min = new Date(Math.min(...dates));
                const max = new Date(Math.max(...dates));
                const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                dateRangeEl.textContent = `${fmt(min)} → ${fmt(max)}`;
            } else {
                dateRangeEl.textContent = '';
            }
        } else {
            dateRangeEl.textContent = '';
        }
    }

    // Update missing cards
    document.getElementById('missingSapRecords').textContent = onlyInFile2.length.toLocaleString();
    document.getElementById('missingSfdcRecords').textContent = onlyInFile1.length.toLocaleString();
    document.getElementById('mismatchedRecords').textContent = mismatchRecords.length.toLocaleString();
    document.getElementById('perfectMatches').textContent = matchRecords.length.toLocaleString();

    // Update table with clickable rows
    const tbody = document.querySelector('#comparisonTable tbody');
    tbody.innerHTML = '';

    Object.values(fieldComparison).forEach(field => {
        const matchPercent = field.total > 0 
            ? ((field.matching / field.total) * 100).toFixed(2)
            : 0;

        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.transition = 'background-color 0.3s ease';
        row.onmouseover = () => row.style.backgroundColor = '#f0f9ff';
        row.onmouseout = () => row.style.backgroundColor = '';
        row.onclick = () => openFieldDetailModal(field.field);
        
        row.innerHTML = `
            <td>${field.field}</td>
            <td>${field.total}</td>
            <td><span style="color: #10b981; font-weight: 600;">${field.matching}</span></td>
            <td><span style="color: #ef4444; font-weight: 600;">${field.nonMatching}</span></td>
            <td>${matchPercent}%</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('resultsSection').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Modal Functions
function openModal(type) {
    currentModalType = type;
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalTable = document.getElementById('modalTable');
    const modalPagination = document.getElementById('modalPagination');

    let data = [];
    let title = '';
    const keyColumn = comparisonResult.keyColumn;

    switch(type) {
        case 'missing_sap':
            title = '⚠️ Missing in SAP (in SFDC only)';
            data = comparisonResult.onlyInFile2;
            break;
        case 'missing_sfdc':
            title = '⚠️ Missing in SFDC (in SAP only)';
            data = comparisonResult.onlyInFile1;
            break;
        case 'mismatches':
            title = '❌ Mismatched Records';
            data = comparisonResult.mismatchRecords;
            break;
        case 'matches':
            title = '✅ Perfect Match Records';
            data = comparisonResult.matchRecords;
            break;
    }

    currentModalData = data;
    modalTitle.textContent = title;

    // Store full dataset and pagination state
    window.modalFullData = data;
    window.currentModalPage = 1;
    window.modalPageSize = 100;

    displayModalPage();
    
    // Show modal
    modalOverlay.style.display = 'block';
    modal.style.display = 'flex';
    document.getElementById('modalSearch').value = '';
}

function displayModalPage() {
    const modal = document.getElementById('modal');
    const modalTable = document.getElementById('modalTable');
    const modalPagination = document.getElementById('modalPagination');
    const modalStats = document.getElementById('modalStats');
    
    const data = window.modalFullData || [];
    const pageSize = window.modalPageSize || 100;
    const page = window.currentModalPage || 1;
    
    const endIndex = page * pageSize;
    const pagedData = data.slice(0, endIndex);
    
    // Build table
    const headers = file1Data.headers;
    const headerRow = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    modalTable.querySelector('thead').innerHTML = headerRow;

    const bodyRows = pagedData.map(record => {
        return '<tr>' + headers.map(header => {
            let value = record[header] || '';
            
            // Highlight mismatches for mismatching records
            if (currentModalType === 'mismatches' && record._mismatches && record._mismatches[header]) {
                const { file1, file2 } = record._mismatches[header];
                value = `<strong style="color: #ef4444;">${file1}</strong> → <strong style="color: #005C8C;">${file2}</strong>`;
            }
            
            return `<td>${value}</td>`;
        }).join('') + '</tr>';
    }).join('');

    modalTable.querySelector('tbody').innerHTML = bodyRows;

    // Update stats and pagination
    const remaining = data.length - pagedData.length;
    modalStats.textContent = `Showing ${pagedData.length} of ${data.length} record(s)`;
    
    if (remaining > 0) {
        modalPagination.innerHTML = `
            <button type="button" onclick="loadMoreModalPage()" style="padding: 10px 20px; background: #005C8C; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                Load Another 100 records
            </button>
            <p style="margin-top: 10px; text-align: center; color: #666;">${pagedData.length} of ${data.length} records loaded</p>
        `;
    } else {
        modalPagination.innerHTML = `<p style="text-align: center; color: #666;">All ${data.length} records loaded</p>`;
    }
}

function loadMoreModalPage() {
    window.currentModalPage = (window.currentModalPage || 1) + 1;
    displayModalPage();
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Open field detail modal
function openFieldDetailModal(fieldName) {
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalTable = document.getElementById('modalTable');

    showLoading();

    requestAnimationFrame(() => {
        setTimeout(() => {
            try {
                // Build field detail data
                const fieldData = comparisonResult.fieldComparison[fieldName];
                const keyColumn = comparisonResult.keyColumn;
                const sapToSfdcMapping = comparisonResult?.sapToSfdcMapping || {};
                const map1 = new Map();
                const map2 = new Map();

                // Create maps
                file1Data.data.forEach(row => {
                    map1.set(row[keyColumn], row);
                });
                file2Data.data.forEach(row => {
                    // Use mapped key column name for file2 if available
                    const sfdcKeyColName = sapToSfdcMapping[keyColumn] || keyColumn;
                    map2.set(row[sfdcKeyColName], row);
                });

                // Get matching and non-matching records for this field
                const matchingRecords = [];
                const nonMatchingRecords = [];

                comparisonResult.fieldComparison[fieldName] = comparisonResult.fieldComparison[fieldName] || {
                    field: fieldName,
                    matchingRecordKeys: [],
                    nonMatchingRecordKeys: []
                };

                // Iterate through common records
                const commonKeys = [];
                map1.forEach((row, key) => {
                    if (map2.has(key)) {
                        commonKeys.push(key);
                    }
                });

                commonKeys.forEach(key => {
                    const row1 = map1.get(key);
                    const row2 = map2.get(key);

                    // Get SAP value using SAP column name
                    const val1 = (row1[fieldName] || '').toString().trim();
                    
                    // Get SFDC value using mapped column name (if field mapping exists)
                    const sapToSfdcMapping = comparisonResult?.sapToSfdcMapping || {};
                    const sfdcColName = sapToSfdcMapping[fieldName] || fieldName;
                    const val2 = (row2[sfdcColName] || '').toString().trim();
                    
                    // Normalize and compare values
                    const norm1 = normalizeValue(val1);
                    const norm2 = normalizeValue(val2);
                    const isMatch = norm1.toLowerCase() === norm2.toLowerCase();

                    if (isMatch) {
                        matchingRecords.push({
                            ...row1,
                            _source: 'SAP'
                        });
                    } else {
                        nonMatchingRecords.push({
                            [keyColumn]: key,
                            field: fieldName,
                            sapValue: val1,
                            sfdcValue: val2,
                            ...row1,
                            _source: 'SAP'
                        });
                    }
                });

                currentFieldDetail = {
                    fieldName,
                    matchingRecords,
                    nonMatchingRecords,
                    page: 1,
                    pageSize: 100
                };

                // Prepare full dataset for export and paging
                window.modalFullData = [
                    ...matchingRecords.map(r => ({ ...r, _recordType: 'Matching' })),
                    ...nonMatchingRecords.map(r => ({ ...r, _recordType: 'Non-Matching' }))
                ];
                currentModalData = window.modalFullData;
                currentModalType = `field_${fieldName}`;
                window.currentModalPage = 1;

                fieldDetailView = 'all';
                modalTitle.textContent = `📊 Field-Level Details: ${fieldName}`;

                displayFieldDetailView();

                // Add view toggle buttons
                const modalControls = modal.querySelector('.modal-controls');
                if (modalControls) {
                    const existingToggle = modalControls.querySelector('.view-toggle-container');
                    if (existingToggle) {
                        existingToggle.remove();
                    }

                    const toggleContainer = document.createElement('div');
                    toggleContainer.className = 'view-toggle-container';
                    toggleContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px; align-items: center;';
                    toggleContainer.innerHTML = `
                        <label style="font-weight: 600; margin-right: 10px;">View:</label>
                        <button class="btn-view view-all" onclick="switchFieldDetailView('all')" style="padding: 8px 16px; cursor: pointer; border: none; border-radius: 4px; background: #005C8C; color: white; font-weight: 600; transition: all 0.3s;">All Records</button>
                        <button class="btn-view view-matching" onclick="switchFieldDetailView('matching')" style="padding: 8px 16px; cursor: pointer; border: none; border-radius: 4px; background: #e5e7eb; color: #333; font-weight: 600; transition: all 0.3s;">✅ Matching Only</button>
                        <button class="btn-view view-non-matching" onclick="switchFieldDetailView('non-matching')" style="padding: 8px 16px; cursor: pointer; border: none; border-radius: 4px; background: #e5e7eb; color: #333; font-weight: 600; transition: all 0.3s;">❌ Non-Matching Only</button>
                    `;
                    modalControls.insertBefore(toggleContainer, modalControls.firstChild);
                }

                // Show modal
                modalOverlay.style.display = 'block';
                modal.style.display = 'flex';
                document.getElementById('modalSearch').value = '';
            } finally {
                hideLoading();
            }
        }, 50);
    });
}

// Switch field detail view
function switchFieldDetailView(view) {
    fieldDetailView = view;
    if (currentFieldDetail) {
        currentFieldDetail.page = 1;
    }
    displayFieldDetailView();
    
    // Update button styles
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.style.background = '#e5e7eb';
        btn.style.color = '#333';
    });
    
    if (view === 'all') {
        document.querySelector('.view-all').style.background = '#005C8C';
        document.querySelector('.view-all').style.color = 'white';
    } else if (view === 'matching') {
        document.querySelector('.view-matching').style.background = '#10b981';
        document.querySelector('.view-matching').style.color = 'white';
    } else if (view === 'non-matching') {
        document.querySelector('.view-non-matching').style.background = '#ef4444';
        document.querySelector('.view-non-matching').style.color = 'white';
    }
}

// Display field detail view
function displayFieldDetailView() {
    const modalTable = document.getElementById('modalTable');
    const modalStats = document.getElementById('modalStats');
    const modalPagination = document.getElementById('modalPagination');

    if (!currentFieldDetail) return;

    let displayData = [];

    if (fieldDetailView === 'all') {
        displayData = [
            ...currentFieldDetail.matchingRecords.map(r => ({ ...r, _recordType: 'Matching' })),
            ...currentFieldDetail.nonMatchingRecords.map(r => ({ ...r, _recordType: 'Non-Matching' }))
        ];
    } else if (fieldDetailView === 'matching') {
        displayData = currentFieldDetail.matchingRecords.map(r => ({ ...r, _recordType: 'Matching' }));
    } else if (fieldDetailView === 'non-matching') {
        displayData = currentFieldDetail.nonMatchingRecords.map(r => ({ ...r, _recordType: 'Non-Matching' }));
    }

    const displayPage = currentFieldDetail.page || 1;
    const pageSize = 100; // Always show 100 records per page
    const endIndex = displayPage * pageSize;
    const pagedData = displayData.slice(0, endIndex);

    // Build table with separate SAP and SFDC columns for the detail field
    const headers = file1Data.headers;
    const isNonMatchingView = fieldDetailView !== 'matching';
    
    // Get field mapping for column name translation
    const sapToSfdcMapping = comparisonResult?.sapToSfdcMapping || {};
    
    let headerHtml = '<tr>';
    headers.forEach(h => {
        if (isNonMatchingView && h === currentFieldDetail.fieldName) {
            // For non-matching view, show SAP and SFDC separately for the field being detailed
            const sfdcColName = sapToSfdcMapping[h] || h; // Get mapped SFDC column name
            headerHtml += `<th>${h} (SAP)</th><th>${sfdcColName} (SFDC)</th>`;
        } else {
            headerHtml += `<th>${h}</th>`;
        }
    });
    headerHtml += '<th style="background: #f3f4f6; font-weight: 700;">Status</th></tr>';
    modalTable.querySelector('thead').innerHTML = headerHtml;

    const bodyRows = pagedData.map(record => {
        let statusColor = '#10b981';
        let statusText = '✅ Match';

        if (record._recordType === 'Non-Matching') {
            statusColor = '#ef4444';
            statusText = '❌ Mismatch';
        }

        let rowHtml = '<tr>';
        headers.forEach(header => {
            let value = record[header] || '';

            if (record._recordType === 'Non-Matching' && header === currentFieldDetail.fieldName) {
                const sapValue = record.sapValue || '';
                const sfdcValue = record.sfdcValue || '';
                // Show SAP value in first column, SFDC in second
                rowHtml += `<td><strong style="color: #ef4444;">${sapValue}</strong></td>`;
                rowHtml += `<td><strong style="color: #005C8C;">${sfdcValue}</strong></td>`;
            } else {
                rowHtml += `<td>${value}</td>`;
            }
        });
        rowHtml += `<td style="background: #f3f4f6; color: ${statusColor}; font-weight: 600; text-align: center;">${statusText}</td></tr>`;
        return rowHtml;
    }).join('');

    modalTable.querySelector('tbody').innerHTML = bodyRows;

    const matchingCount = currentFieldDetail.matchingRecords.length;
    const nonMatchingCount = currentFieldDetail.nonMatchingRecords.length;
    const totalCount = displayData.length;
    const shownCount = pagedData.length;

    modalStats.innerHTML = `<strong>Field:</strong> ${currentFieldDetail.fieldName} | <strong>Total:</strong> ${matchingCount + nonMatchingCount} | <strong>Matching:</strong> <span style="color: #10b981;">${matchingCount}</span> | <strong>Non-Matching:</strong> <span style="color: #ef4444;">${nonMatchingCount}</span> | <strong>Showing:</strong> ${shownCount} of ${totalCount}`;

    if (modalPagination) {
        const remaining = totalCount - shownCount;
        if (remaining > 0) {
            modalPagination.innerHTML = `
                <button type="button" onclick="loadMoreFieldDetailPage()" style="padding: 10px 20px; background: #005C8C; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Load Another 100 records</button>
                <p style="margin-top: 10px; text-align: center; color: #666;">${shownCount} of ${totalCount} records loaded</p>
            `;
        } else {
            modalPagination.innerHTML = `<p style="text-align: center; color: #666;">All ${totalCount} records loaded</p>`;
        }
    }
}

function loadMoreFieldDetailPage() {
    if (!currentFieldDetail) return;
    currentFieldDetail.page = (currentFieldDetail.page || 1) + 1;
    displayFieldDetailView();
}

function filterModalTable() {
    const searchTerm = document.getElementById('modalSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#modalTable tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('modalStats').textContent = `Showing ${visibleCount} record(s)`;
}

// Get current filtered data based on view selection
function getCurrentFilteredData() {
    // For field detail views, respect the current filter
    if (currentModalType && currentModalType.startsWith('field_')) {
        if (!currentFieldDetail) return [];
        
        let filteredData = [];
        
        if (fieldDetailView === 'all') {
            filteredData = [
                ...currentFieldDetail.matchingRecords.map(r => ({ ...r, _recordType: 'Matching' })),
                ...currentFieldDetail.nonMatchingRecords.map(r => ({ ...r, _recordType: 'Non-Matching' }))
            ];
        } else if (fieldDetailView === 'matching') {
            filteredData = currentFieldDetail.matchingRecords.map(r => ({ ...r, _recordType: 'Matching' }));
        } else if (fieldDetailView === 'non-matching') {
            filteredData = currentFieldDetail.nonMatchingRecords.map(r => ({ ...r, _recordType: 'Non-Matching' }));
        }
        
        return filteredData;
    }
    
    // For regular modals, use all data
    return window.modalFullData || [];
}

// Export modal functions
function prepareExportModalData() {
    const filteredData = getCurrentFilteredData();
    
    if (!filteredData || filteredData.length === 0) {
        showAlert('No data to export', 'error');
        return;
    }

    const totalCount = filteredData.length;
    
    // If total is 100 or less, just export directly without asking
    if (totalCount <= 100) {
        exportModalDataConfirmed('all');
        return;
    }

    // Show export options modal
    document.getElementById('exportModalOverlay').style.display = 'block';
    document.getElementById('exportModal').style.display = 'flex';
    document.getElementById('exportTotalCount').textContent = totalCount;
    document.getElementById('exportAllCount').textContent = totalCount;
    
    // Update view label to show current filter selection
    let viewLabel = 'All Records';
    if (currentModalType && currentModalType.startsWith('field_')) {
        if (fieldDetailView === 'matching') {
            viewLabel = '✅ Matching Only';
        } else if (fieldDetailView === 'non-matching') {
            viewLabel = '❌ Non-Matching Only';
        } else {
            viewLabel = 'All Records';
        }
    }
    document.getElementById('exportViewLabel').textContent = viewLabel;
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    document.getElementById('exportModalOverlay').style.display = 'none';
}

function exportModalDataConfirmed(exportType) {
    const filteredData = getCurrentFilteredData();
    
    if (!filteredData || filteredData.length === 0) {
        showAlert('No data to export', 'error');
        return;
    }

    const headers = file1Data.headers;
    let data = [];
    
    if (exportType === 'preview') {
        // Export only the first 100 records
        data = filteredData.slice(0, 100);
    } else {
        // Export all data
        data = filteredData;
    }

    let csv = '';
    
    // Determine headers based on whether this is a field detail view
    if (currentModalType && currentModalType.startsWith('field_')) {
        // Field detail view - add separate SAP/SFDC columns for mismatches
        const fieldName = currentFieldDetail?.fieldName;
        const headerArray = [];
        headers.forEach(h => {
            if (h === fieldName && currentFieldDetail) {
                headerArray.push(`${h} (SAP)`);
                headerArray.push(`${h} (SFDC)`);
            } else {
                headerArray.push(h);
            }
        });
        headerArray.push('Status');
        csv = headerArray.join(',') + '\n';
        
        // Build rows
        data.forEach(record => {
            const values = [];
            headers.forEach(h => {
                if (h === fieldName && record._recordType === 'Non-Matching' && currentFieldDetail) {
                    // Add separate SAP and SFDC values
                    values.push(record.sapValue || '');
                    values.push(record.sfdcValue || '');
                } else {
                    let text = record[h] !== undefined ? String(record[h]) : '';
                    text = text.replace(/<[^>]*>/g, '');
                    values.push(text.includes(',') ? `"${text}"` : text);
                }
            });
            // Add status
            const statusText = record._recordType === 'Non-Matching' ? 'Non-Matching' : 'Matching';
            values.push(statusText);
            csv += values.join(',') + '\n';
        });
    } else {
        // Regular modal view (missing_sap, missing_sfdc, mismatches, matches)
        csv = headers.join(',') + '\n';
        
        data.forEach(record => {
            const values = headers.map(h => {
                let text = record[h] !== undefined ? String(record[h]) : '';
                // Remove HTML tags for CSV
                text = text.replace(/<[^>]*>/g, '');
                // Escape quotes and wrap in quotes if contains comma
                return text.includes(',') ? `"${text}"` : text;
            });
            csv += values.join(',') + '\n';
        });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const filename = exportType === 'all' 
        ? `${selectedModule}_${currentModalType}_export_all.csv`
        : `${selectedModule}_${currentModalType}_export_preview.csv`;
    
    downloadFile(blob, filename);
    closeExportModal();
    showAlert(`Exported ${data.length} record(s) successfully!`, 'success');
}

// Search table
function searchTable() {
    const searchTerm = document.getElementById('searchTable').value.toLowerCase();
    const rows = document.querySelectorAll('#comparisonTable tbody tr');

    rows.forEach(row => {
        const fieldName = row.cells[0].textContent.toLowerCase();
        row.style.display = fieldName.includes(searchTerm) ? '' : 'none';
    });
}

// Export functions
function exportToExcel() {
    if (!comparisonResult) return;

    let html = '<table border="1"><tr><th>Field Name</th><th>Total</th><th>Matching</th><th>Non-Matching</th><th>Match %</th></tr>';
    
    Object.values(comparisonResult.fieldComparison).forEach(field => {
        const matchPercent = field.total > 0 
            ? ((field.matching / field.total) * 100).toFixed(2)
            : 0;
        html += `<tr><td>${field.field}</td><td>${field.total}</td><td>${field.matching}</td><td>${field.nonMatching}</td><td>${matchPercent}%</td></tr>`;
    });
    
    html += '</table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    downloadFile(blob, `${selectedModule}_comparison_report.xls`);
    showAlert('Exported to Excel successfully!', 'success');
}

function exportToCSV() {
    if (!comparisonResult) return;

    let csv = 'Field Name,Total Records,Matching,Non-Matching,Match %\n';
    
    Object.values(comparisonResult.fieldComparison).forEach(field => {
        const matchPercent = field.total > 0 
            ? ((field.matching / field.total) * 100).toFixed(2)
            : 0;
        csv += `${field.field},${field.total},${field.matching},${field.nonMatching},${matchPercent}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, `${selectedModule}_comparison_report.csv`);
    showAlert('Exported to CSV successfully!', 'success');
}

function exportToJSON() {
    if (!comparisonResult) return;

    const data = {
        module: selectedModule,
        moduleConfig: moduleConfig,
        summary: {
            totalSAPRecords: comparisonResult.totalFile1,
            totalSFDCRecords: comparisonResult.totalFile2,
            commonRecords: comparisonResult.commonRecords,
            matchingRecords: comparisonResult.matchRecords.length,
            mismatchingRecords: comparisonResult.mismatchRecords.length,
            missingInSAP: comparisonResult.onlyInFile2.length,
            missingInSFDC: comparisonResult.onlyInFile1.length,
            keyColumn: comparisonResult.keyColumn
        },
        fieldComparison: comparisonResult.fieldComparison
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `${selectedModule}_comparison_report.json`);
    showAlert('Exported to JSON successfully!', 'success');
}

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Navigation
function goHome() {
    sessionStorage.removeItem('selectedModule');
    window.location.href = 'home.html';
}

// Reset form
function resetForm() {
    file1Data = null;
    file2Data = null;
    comparisonResult = null;
    document.getElementById('file1').value = '';
    document.getElementById('file2').value = '';
    document.getElementById('fileName1').textContent = '';
    document.getElementById('fileName2').textContent = '';
    document.getElementById('keyColumn').value = '';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('alertContainer').innerHTML = '';
}

// Show alerts
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${message}
        </div>
        <button class="alert-close" onclick="document.getElementById('${alertId}').remove()">×</button>
    `;
    
    container.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const el = document.getElementById(alertId);
        if (el) el.remove();
    }, 5000);
}
    