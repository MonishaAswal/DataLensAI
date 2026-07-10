import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://127.0.0.1:5000';

const log = (msg, data = null) => {
  console.log(`\n✅ ${msg}`);
  if (data) console.log('   →', JSON.stringify(data, null, 2).substring(0, 500));
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

// Helper: POST file upload
async function postFile(path, filePath, filename, token) {
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
  console.log('  DataLens AI — Smart AI Imputation Test Suite ');
  console.log('═══════════════════════════════════════════');

  const testEmail = `impute_test_${Date.now()}@datalens.ai`;
  let token = null;
  let datasetId = null;

  // 1. Register user
  try {
    const { status, data } = await postJson('/api/auth/register', {
      name: 'Imputation Tester', email: testEmail, password: 'password123'
    });
    if (status !== 201) throw new Error(data.message);
    token = data.token;
    log(`Registered user: ${data.name}`);
  } catch (err) {
    logErr('Registration failed', err);
    process.exit(1);
  }

  // 2. Upload dataset with missing values
  const csvPath = path.join(__dirname, 'test_dataset.csv');
  try {
    const { status, data } = await postFile('/api/dataset/upload', csvPath, 'test_dataset.csv', token);
    if (status !== 201) throw new Error(data.message || JSON.stringify(data));
    datasetId = data._id;
    log(`Dataset uploaded`, { id: datasetId, rows: data.rowCount, cols: data.columnCount });
  } catch (err) {
    logErr('Upload failed', err);
    process.exit(1);
  }

  // 3. Trigger Smart AI Imputation
  try {
    console.log('\n⏳ Requesting Smart AI Imputation (POST /api/imputation/smart)...');
    const { status, data } = await postJson('/api/imputation/smart', { datasetId }, token);
    if (status !== 200) throw new Error(data.message || JSON.stringify(data));
    
    log('Smart AI Imputation Completed!', {
      beforeMissingCount: data.beforeMissingCount,
      afterMissingCount: data.afterMissingCount,
      columnsProcessed: data.columnsProcessed,
      reportCount: data.report?.length,
      sampleCleanedRowsCount: data.cleanedData?.length
    });

    console.log('\n📊 Detailed Imputation Report:');
    data.report.forEach(col => {
      console.log(`\n--------------------------------------------`);
      console.log(`Column Name: ${col.column} (${col.type})`);
      console.log(`Method Used: ${col.method}`);
      console.log(`Missing Before: ${col.missingBefore} | After: ${col.missingAfter}`);
      console.log(`Predicted: ${col.valuesPredicted} values`);
      console.log(`Sample Predictions: ${col.samplePredictions.join(', ')}`);
    });
    console.log(`--------------------------------------------\n`);

  } catch (err) {
    logErr('Smart AI Imputation API test failed', err);
  }

  // 4. Verify post-clean state in dataset overview
  try {
    const { status, data } = await getJson(`/api/dataset/${datasetId}`, token);
    if (status !== 200) throw new Error(data.message);
    const eda = data.edaResults || {};
    const missingValueCount = eda.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0;
    log(`Fetched dataset details after imputation`, {
      id: data._id,
      status: data.status,
      qualityScore: eda.quality_score || 85,
      missingValueCount,
      cleaningActions: data.cleaningActions
    });
  } catch (err) {
    logErr('Failed to fetch dataset details after cleaning', err);
  }

  // 5. Clean up by deleting dataset
  try {
    const { status } = await deleteReq(`/api/dataset/${datasetId}`, token);
    if (status === 200) {
      log(`Deleted test dataset successfully.`);
    }
  } catch (err) {
    logErr('Failed to delete test dataset', err);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Smart Imputation API Verification Complete');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n🔥 Unexpected test execution failure:', err);
  process.exit(1);
});
