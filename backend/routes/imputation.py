import os
import io
import base64
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd

from backend.services.smart_imputation import run_smart_imputation

router = APIRouter()

@router.post("/smart")
async def smart_imputation_endpoint(file: UploadFile = File(...)):
    """
    Endpoint for performing ML-based Smart AI Imputation.
    Receives a file, imputes it using Random Forest, and returns the report,
    statistics, records preview, and a base64 encoded copy of the fully cleaned dataset file.
    """
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    
    if ext not in ['.csv', '.xlsx', '.xls', '.json']:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")
        
    try:
        # Read uploaded file into a pandas dataframe
        contents = await file.read()
        file_io = io.BytesIO(contents)
        
        if ext == '.csv':
            df = pd.read_csv(file_io)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_io)
        elif ext == '.json':
            try:
                df = pd.read_json(file_io)
            except ValueError as e:
                if "If using all scalar values, you must pass an index" in str(e):
                    import json
                    file_io.seek(0)
                    data = json.loads(file_io.read().decode('utf-8'))
                    if isinstance(data, dict):
                        df = pd.DataFrame([data])
                    else:
                        raise e
                else:
                    raise e
        else:
            df = pd.read_csv(file_io)
            
        # Run imputation
        df_clean, report, before_count, after_count, processed_cols = run_smart_imputation(df)
        
        # Serialize the cleaned dataframe to its original file format
        output_buffer = io.BytesIO()
        if ext == '.csv':
            df_clean.to_csv(output_buffer, index=False)
        elif ext in ['.xlsx', '.xls']:
            # openpyxl is installed in the requirements
            df_clean.to_excel(output_buffer, index=False)
        elif ext == '.json':
            df_clean.to_json(output_buffer, orient='records', indent=2)
        else:
            df_clean.to_csv(output_buffer, index=False)
            
        cleaned_file_bytes = output_buffer.getvalue()
        cleaned_file_b64 = base64.b64encode(cleaned_file_bytes).decode('utf-8')
        
        # Limit preview records to fit in response cleanly
        # (e.g. converted to dict records)
        cleaned_data_records = df_clean.head(100).to_dict(orient='records')
        
        total_rows = int(df.shape[0])
        total_columns = int(df.shape[1])
        total_cells = total_rows * total_columns
        total_imputed = before_count - after_count
        columns_with_missing_before = len([col for col in df.columns if df[col].isnull().sum() > 0])
        data_completeness = round((1.0 - (after_count / total_cells)) * 100, 2) if total_cells > 0 else 100.0
        imputation_percentage = round((total_imputed / total_cells) * 100, 2) if total_cells > 0 else 0.0

        metrics = {
            "totalRows": total_rows,
            "totalColumns": total_columns,
            "columnsWithMissingBefore": columns_with_missing_before,
            "totalMissingBefore": before_count,
            "totalMissingAfter": after_count,
            "totalImputed": total_imputed,
            "dataCompleteness": data_completeness,
            "imputationPercentage": imputation_percentage
        }
        
        return {
            "cleanedData": cleaned_data_records,
            "report": report,
            "beforeMissingCount": before_count,
            "afterMissingCount": after_count,
            "columnsProcessed": processed_cols,
            "cleanedFileBase64": cleaned_file_b64,
            "metrics": metrics
        }
        
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Smart imputation failed: {str(e)}")
