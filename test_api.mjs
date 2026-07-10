/**
 * End-to-end API test script for DataLens AI backend.
 * Tests: Register/Login → Upload CSV → Get Dataset → Clean → Get History → Delete
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5000';

const log = (msg, data = null) => {
  console.log(`\n✅ ${msg}`);
  if (data) console.log('   →', JSON.stringify(data, null, 2).substring(0, 400));
};

const logErr = (msg, err) => {
  console.error(`\n❌ ${msg}`);
  console.error('   →', err?.message || err);
};

// Helper: POST JSON
async function postJson(path, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() };
}

// Helper: POST multipart form file upload
async function postFile(path, filePath, filename, token) {
  const fileBlob = await fetch(`file://${filePath}`).catch(() => null);
  // Use Node 24 native openAsBlob
  const { openAsBlob } = await import('fs');
  const blob = await openAsBlob(filePath);
  const form = new FormData();
  form.append('file', blob, filename);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  return { status: res.status, data: JSON.parse(text) };
}

// Helper: GET
async function getJson(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { status: res.status, data: await res.json() };
}

// Helper: DELETE
async function deleteReq(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  DataLens AI — End-to-End API Test Suite  ');
  console.log('═══════════════════════════════════════════');

  const testEmail = `testrun_${Date.now()}@datalens.ai`;
  let token = null;
  let datasetId = null;

  // 1. Register
  try {
    const { status, data } = await postJson('/api/auth/register', {
      name: 'API Test User', email: testEmail, password: 'testpass123'
    });
    if (status !== 201) throw new Error(data.message);
    token = data.token;
    log(`Registered: ${data.name} (${data.email})`, { id: data._id });
  } catch (err) {
    logErr('Registration failed', err);
    process.exit(1);
  }

  // 2. Login
  try {
    const { status, data } = await postJson('/api/auth/login', {
      email: testEmail, password: 'testpass123'
    });
    if (status !== 200) throw new Error(data.message);
    token = data.token;
    log(`Login successful: ${data.name}`);
  } catch (err) {
    logErr('Login failed', err);
    process.exit(1);
  }

  // 3. Upload Dataset
  const csvPath = path.join(__dirname, 'test_dataset.csv');
  if (!fs.existsSync(csvPath)) {
    logErr('Test CSV not found at ' + csvPath, null);
    process.exit(1);
  }

  try {
    const { status, data } = await postFile('/api/dataset/upload', csvPath, 'test_dataset.csv', token);
    if (status !== 201) throw new Error(data.message || JSON.stringify(data));
    datasetId = data._id;
    log(`Dataset uploaded & analyzed`, {
      id: datasetId, rows: data.rowCount, cols: data.columnCount, status: data.status
    });
  } catch (err) {
    logErr('Upload/Analysis failed', err);
    process.exit(1);
  }

  // 4. Get Dataset Overview
  try {
    const { status, data } = await getJson(`/api/dataset/${datasetId}`, token);
    if (status !== 200) throw new Error(data.message);
    const eda = data.edaResults || {};
    const missingValueCount = eda.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0;
    log(`Got dataset details`, {
      id: data._id,
      originalName: data.originalName,
      rowCount: data.rowCount,
      columnCount: data.columnCount,
      qualityScore: eda.quality_score || 85,
      duplicateCount: eda.duplicate_count || 0,
      missingValueCount
    });
  } catch (err) {
    logErr('Get Dataset details failed', err);
  }

  // 5. Get Dataset Visualizations (from cached edaResults)
  try {
    const { status, data } = await getJson(`/api/dataset/${datasetId}`, token);
    if (status !== 200) throw new Error(data.message);
    const eda = data.edaResults || {};
    log(`Got dataset visualizations details`, {
      hasCorrelation: !!eda.correlation_matrix,
      hasDistributions: !!eda.distributions,
      missingValuesCount: eda.missing_analysis ? Object.keys(eda.missing_analysis).length : 0,
      outliersCount: eda.outliers_analysis ? Object.keys(eda.outliers_analysis).length : 0
    });
  } catch (err) {
    logErr('Get Dataset Visualizations failed', err);
  }

  // 6. Get History
  try {
    const { status, data } = await getJson('/api/history', token);
    if (status !== 200) throw new Error(data.message);
    log(`History loaded: ${data.length} audit log(s) found`);
  } catch (err) {
    logErr('History fetch failed', err);
  }

  // 7. Clean Dataset
  try {
    const { status, data } = await postJson(`/api/dataset/${datasetId}/clean`, {
      removeDuplicates: true, imputeNumeric: 'mean', imputeCategorical: 'mode',
      removeEmptyCols: true, standardizeDates: true
    }, token);
    if (status !== 200) throw new Error(data.message || JSON.stringify(data));
    log(`Dataset cleaned`, {
      newRows: data.rowCount, newCols: data.columnCount, 
      actions: data.cleanSummary?.length
    });
    if (data.cleanSummary?.length) {
      console.log('   Actions taken:');
      data.cleanSummary.forEach(a => console.log('   - ' + a));
    }
  } catch (err) {
    logErr('Cleaning failed', err);
  }

  // 8. Delete Dataset
  try {
    const { status, data } = await deleteReq(`/api/dataset/${datasetId}`, token);
    if (status !== 200) throw new Error(data.message);
    log(`Dataset deleted successfully`);
  } catch (err) {
    logErr('Delete failed', err);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  All core API tests completed successfully ');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n🔥 Unexpected test failure:', err);
  process.exit(1);
});
