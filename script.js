// Global state
let file1Data = null;
let file2Data = null;
let comparisonResult = null;
let currentModalData = [];
let currentModalType = null;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupFileUpload('file1', 'uploadBox1', 'fileName1');
    setupFileUpload('file2', 'uploadBox2', 'fileName2');
    
    document.getElementById('compareBtn').addEventListener('click', performComparison);
    document.getElementById('searchTable').addEventListener('input', searchTable);
});

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
            const data = parseCSV(csv);
            
            if (fileNameId === 'fileName1') {
                file1Data = data;
                document.getElementById('fileName1').textContent = `✅ ${file.name}`;
            } else {
                file2Data = data;
                document.getElementById('fileName2').textContent = `✅ ${file.name}`;
            }

            updateKeyColumnOptions();
            showAlert(`File "${file.name}" uploaded successfully`, 'success');
        } catch (error) {
            showAlert(`Error parsing CSV: ${error.message}`, 'error');
        }
    };

    reader.readAsText(file);
}

// Parse CSV to array of objects
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 1) throw new Error('CSV file is empty');

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const values = lines[i].split(',').map(v => v.trim());
        
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });

        data.push(obj);
    }

    return { headers, data };
}

// Update key column options
function updateKeyColumnOptions() {
    const select = document.getElementById('keyColumn');
    
    if (!file1Data || !file2Data) {
        select.disabled = true;
        return;
    }

    const commonColumns = file1Data.headers.filter(h => 
        file2Data.headers.includes(h)
    );

    if (commonColumns.length === 0) {
        showAlert('No common columns found between files', 'error');
        select.disabled = true;
        return;
    }

    select.innerHTML = '<option value="">Select a column...</option>';
    commonColumns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        select.appendChild(option);
    });

    select.disabled = false;
}

// Enable/disable compare button
document.addEventListener('change', () => {
    const keyColumn = document.getElementById('keyColumn').value;
    document.getElementById('compareBtn').disabled = !keyColumn;
});

// Perform comparison
function performComparison() {
    const keyColumn = document.getElementById('keyColumn').value;

    if (!file1Data || !file2Data || !keyColumn) {
        showAlert('Please upload both files and select a key column', 'error');
        return;
    }

    try {
        // Get common columns
        const commonCols = file1Data.headers.filter(h => 
            file2Data.headers.includes(h)
        );

        // Create maps for quick lookup
        const map1 = new Map();
        const map2 = new Map();

        file1Data.data.forEach(row => {
            map1.set(row[keyColumn], row);
        });

        file2Data.data.forEach(row => {
            map2.set(row[keyColumn], row);
        });

        // Find added/removed
        const added = [];
        const removed = [];

        map2.forEach((row, key) => {
            if (!map1.has(key)) added.push({ ...row, [keyColumn]: key });
        });

        map1.forEach((row, key) => {
            if (!map2.has(key)) removed.push({ ...row, [keyColumn]: key });
        });

        // Find common records and compare
        const common = Array.from(map1.keys()).filter(key => map2.has(key));
        
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
                    const val1 = (row1[col] || '').toString().trim();
                    const val2 = (row2[col] || '').toString().trim();
                    
                    if (val1 === val2) {
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
            commonRecords: common.length,
            addedRecords: added,
            removedRecords: removed,
            mismatchRecords: mismatches,
            matchRecords: matches,
            fieldComparison,
            totalComparable: common.length,
            totalMatchingFields: Object.values(fieldComparison).reduce((sum, f) => sum + f.matching, 0),
            totalMismatches: Object.values(fieldComparison).reduce((sum, f) => sum + f.nonMatching, 0)
        };

        displayResults();
        showAlert('Comparison completed successfully!', 'success');
    } catch (error) {
        showAlert(`Comparison error: ${error.message}`, 'error');
    }
}

// Display results
function displayResults() {
    if (!comparisonResult) return;

    const { commonRecords, addedRecords, removedRecords, mismatchRecords, matchRecords, fieldComparison, totalMatchingFields, totalMismatches } = comparisonResult;

    // Update summary cards
    document.getElementById('totalRecords').textContent = commonRecords.toLocaleString();
    document.getElementById('matchingRecords').textContent = matchRecords.length.toLocaleString();
    document.getElementById('mismatchingRecords').textContent = mismatchRecords.length.toLocaleString();
    document.getElementById('addedRecords').textContent = addedRecords.length.toLocaleString();
    document.getElementById('removedRecords').textContent = removedRecords.length.toLocaleString();

    const matchPercentage = commonRecords > 0 
        ? ((matchRecords.length / commonRecords) * 100).toFixed(2)
        : 0;
    document.getElementById('matchPercentage').textContent = `${matchPercentage}%`;

    // Update table
    const tbody = document.querySelector('#comparisonTable tbody');
    tbody.innerHTML = '';

    Object.values(fieldComparison).forEach(field => {
        const matchPercent = field.total > 0 
            ? ((field.matching / field.total) * 100).toFixed(2)
            : 0;

        const row = `
            <tr>
                <td>${field.field}</td>
                <td>${field.total}</td>
                <td><span style="color: #10b981; font-weight: 600;">${field.matching}</span></td>
                <td><span style="color: #ef4444; font-weight: 600;">${field.nonMatching}</span></td>
                <td>${matchPercent}%</td>
            </tr>
        `;
        tbody.innerHTML += row;
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

    let data = [];
    let title = '';
    const keyColumn = comparisonResult.keyColumn;

    switch(type) {
        case 'total':
            title = '📊 Total Records (Common)';
            data = comparisonResult.matchRecords.concat(comparisonResult.mismatchRecords);
            break;
        case 'matching':
            title = '✅ Matching Records';
            data = comparisonResult.matchRecords;
            break;
        case 'mismatching':
            title = '❌ Mismatching Records';
            data = comparisonResult.mismatchRecords;
            break;
        case 'added':
            title = '➕ Added Records (File 2)';
            data = comparisonResult.addedRecords;
            break;
        case 'removed':
            title = '➖ Removed Records (File 1)';
            data = comparisonResult.removedRecords;
            break;
    }

    currentModalData = data;
    modalTitle.textContent = title;

    // Build table
    const headers = file1Data.headers;
    const headerRow = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    modalTable.querySelector('thead').innerHTML = headerRow;

    const bodyRows = data.map(record => {
        return '<tr>' + headers.map(header => {
            let value = record[header] || '';
            
            // Highlight mismatches for mismatching records
            if (type === 'mismatching' && record._mismatches && record._mismatches[header]) {
                const { file1, file2 } = record._mismatches[header];
                value = `<strong style="color: #ef4444;">${file1}</strong> → <strong style="color: #005C8C;">${file2}</strong>`;
            }
            
            return `<td>${value}</td>`;
        }).join('') + '</tr>';
    }).join('');

    modalTable.querySelector('tbody').innerHTML = bodyRows;

    // Update stats
    document.getElementById('modalStats').textContent = `Showing ${data.length} record(s)`;

    // Show modal
    modalOverlay.style.display = 'block';
    modal.style.display = 'flex';
    document.getElementById('modalSearch').value = '';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
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

function exportModalData() {
    if (currentModalData.length === 0) {
        showAlert('No data to export', 'error');
        return;
    }

    const headers = file1Data.headers;
    let csv = headers.join(',') + '\n';

    const visibleRows = document.querySelectorAll('#modalTable tbody tr:not([style*="display: none"])');
    visibleRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const values = Array.from(cells).map(cell => {
            let text = cell.textContent;
            // Remove HTML tags for CSV
            text = text.replace(/<[^>]*>/g, '');
            // Escape quotes and wrap in quotes if contains comma
            return text.includes(',') ? `"${text}"` : text;
        });
        csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, `comparison_${currentModalType}_export.csv`);
    showAlert('Modal data exported successfully!', 'success');
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
    downloadFile(blob, 'comparison_report.xls');
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
    downloadFile(blob, 'comparison_report.csv');
    showAlert('Exported to CSV successfully!', 'success');
}

function exportToJSON() {
    if (!comparisonResult) return;

    const data = {
        summary: {
            commonRecords: comparisonResult.commonRecords,
            addedRecords: comparisonResult.addedRecords.length,
            removedRecords: comparisonResult.removedRecords.length,
            matchingRecords: comparisonResult.matchRecords.length,
            mismatchingRecords: comparisonResult.mismatchRecords.length,
            keyColumn: comparisonResult.keyColumn
        },
        fieldComparison: comparisonResult.fieldComparison
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'comparison_report.json');
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

// Show alerts
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong>
            ${message}
        </div>
        <button class="alert-close" onclick="document.getElementById('${alertId}').remove()">×</button>
    `;
    
    container.appendChild(alert);

    setTimeout(() => {
        const element = document.getElementById(alertId);
        if (element) element.remove();
    }, 5000);
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
    document.getElementById('keyColumn').disabled = true;
    document.getElementById('compareBtn').disabled = true;
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('searchTable').value = '';

    showAlert('Ready for new comparison', 'info');
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});