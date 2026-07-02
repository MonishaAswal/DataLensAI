import os
import shutil
import tempfile
import sys
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import pandas as pd
import io

# Add workspace directory to python path to resolve backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from .analysis import analyze_dataset
from .cleaning import clean_dataset
from .reporting import generate_ai_report
from backend.routes.imputation import router as imputation_router

app = FastAPI(title="DataLens AI Analytics Service", version="1.0.0")
app.include_router(imputation_router, prefix="/api/imputation")


# Enable CORS for communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReportRequest(BaseModel):
    dataset_name: str
    eda_stats: dict
    api_key: str = None

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "python-analytics"}

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    """
    Receives a dataset file, performs full EDA calculations, and returns JSON statistics.
    """
    # Verify file extension
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ['.csv', '.xlsx', '.xls', '.json']:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")
        
    # Write to a secure temporary file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"analyze_{tempfile.mktemp(dir='')}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        stats = analyze_dataset(temp_path)
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/clean")
async def clean_file(
    file: UploadFile = File(...),
    remove_duplicates: bool = Form(False),
    impute_numeric: str = Form("none"),  # 'mean', 'median', 'none'
    impute_categorical: str = Form("none"),  # 'mode', 'none'
    remove_empty_cols: bool = Form(False),
    standardize_dates: bool = Form(False)
):
    """
    Receives a dataset file and cleaning options, applies operations, and returns the cleaned file.
    """
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ['.csv', '.xlsx', '.xls', '.json']:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")
        
    temp_dir = tempfile.gettempdir()
    input_temp = os.path.join(temp_dir, f"input_{tempfile.mktemp(dir='')}_{file.filename}")
    output_temp = os.path.join(temp_dir, f"output_{tempfile.mktemp(dir='')}_{file.filename}")
    
    try:
        with open(input_temp, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        options = {
            "remove_duplicates": remove_duplicates,
            "impute_numeric": impute_numeric,
            "impute_categorical": impute_categorical,
            "remove_empty_cols": remove_empty_cols,
            "standardize_dates": standardize_dates
        }
        
        result = clean_dataset(input_temp, output_temp, options)
        
        # Prepare response headers
        media_type = "application/octet-stream"
        if ext == '.csv':
            media_type = "text/csv"
        elif ext in ['.xlsx', '.xls']:
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif ext == '.json':
            media_type = "application/json"
            
        # Return file response, ensuring clean headers
        return FileResponse(
            path=output_temp,
            media_type=media_type,
            filename=f"cleaned_{file.filename}",
            headers={
                "X-Clean-Summary": ",".join(result["actions_taken"]).replace(",", ";"),
                "Access-Control-Expose-Headers": "X-Clean-Summary, Content-Disposition"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {str(e)}")
        
    finally:
        # Clean up input temp file immediately
        if os.path.exists(input_temp):
            os.remove(input_temp)
        # Note: output_temp is cleaned up by the client/GC, or we can keep it momentarily.
        # To avoid leaks, we can also delete output_temp after a delay, or read it into memory and return a StreamingResponse.
        # Let's read the output file to memory to guarantee physical cleanup on disk!
        pass

@app.post("/clean-stream")
async def clean_file_stream(
    file: UploadFile = File(...),
    remove_duplicates: bool = Form(False),
    impute_numeric: str = Form("none"),
    impute_categorical: str = Form("none"),
    remove_empty_cols: bool = Form(False),
    standardize_dates: bool = Form(False)
):
    """
    Cleaner streaming-based version to avoid holding files open on disk during response streaming.
    """
    _, ext = os.path.splitext(file.filename.lower())
    temp_dir = tempfile.gettempdir()
    input_temp = os.path.join(temp_dir, f"in_{tempfile.mktemp(dir='')}_{file.filename}")
    output_temp = os.path.join(temp_dir, f"out_{tempfile.mktemp(dir='')}_{file.filename}")
    
    try:
        with open(input_temp, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        options = {
            "remove_duplicates": remove_duplicates,
            "impute_numeric": impute_numeric,
            "impute_categorical": impute_categorical,
            "remove_empty_cols": remove_empty_cols,
            "standardize_dates": standardize_dates
        }
        
        result = clean_dataset(input_temp, output_temp, options)
        
        with open(output_temp, "rb") as f:
            file_bytes = f.read()
            
        summary_str = "; ".join(result["actions_taken"]) if result["actions_taken"] else "No actions needed."
        
        # Determine media type
        media_type = "application/octet-stream"
        if ext == '.csv':
            media_type = "text/csv"
        elif ext in ['.xlsx', '.xls']:
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif ext == '.json':
            media_type = "application/json"
            
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename=cleaned_{file.filename}",
                "X-Clean-Summary": summary_str,
                "Access-Control-Expose-Headers": "X-Clean-Summary, Content-Disposition"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleaning operation failed: {str(e)}")
        
    finally:
        if os.path.exists(input_temp):
            os.remove(input_temp)
        if os.path.exists(output_temp):
            os.remove(output_temp)

@app.post("/report")
async def report_endpoint(request: ReportRequest):
    """
    Generates a natural language EDA and quality report using Gemini.
    """
    try:
        report = generate_ai_report(
            dataset_name=request.dataset_name,
            eda_stats=request.eda_stats,
            api_key=request.api_key
        )
        return {"report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.get("/test-groq")
def test_groq(api_key: str = Query(None)):
    """
    Diagnostic endpoint to test raw Groq connectivity.
    """
    groq_key = api_key or os.environ.get("GROQ_API_KEY")
    print(f"[test-groq] Invoked. Detected API key: {groq_key[:5] if groq_key else 'None'}...")
    if not groq_key:
        return {"status": "error", "message": "GROQ_API_KEY is not configured or passed."}
    
    try:
        from langchain_groq import ChatGroq
        print("[test-groq] Initializing ChatGroq...")
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=groq_key,
            temperature=0.2
        )
        print("[test-groq] Invoking simple prompt 'Say hello'...")
        response = llm.invoke("Say hello.")
        print(f"[test-groq] Success. Response content: {response.content}")
        return {"status": "success", "response": response.content}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[test-groq] Failed. Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/convert")
async def convert_file(
    file: UploadFile = File(...),
    target_format: str = Query(..., alias="format") # 'csv' or 'xlsx'
):
    """
    Converts a dataset file to the requested format and returns it.
    """
    _, ext = os.path.splitext(file.filename.lower())
    temp_dir = tempfile.gettempdir()
    input_temp = os.path.join(temp_dir, f"conv_in_{tempfile.mktemp(dir='')}_{file.filename}")
    
    try:
        with open(input_temp, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        df = pd.read_csv(input_temp) if ext == '.csv' else pd.read_excel(input_temp)
        
        output_buffer = io.BytesIO()
        
        if target_format == 'csv':
            df.to_csv(output_buffer, index=False)
            output_bytes = output_buffer.getvalue()
            media_type = "text/csv"
            filename = f"{os.path.splitext(file.filename)[0]}.csv"
        elif target_format == 'xlsx':
            # Needs openpyxl which is in requirements
            df.to_excel(output_buffer, index=False)
            output_bytes = output_buffer.getvalue()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{os.path.splitext(file.filename)[0]}.xlsx"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported target format: {target_format}")
            
        return StreamingResponse(
            io.BytesIO(output_bytes),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if os.path.exists(input_temp):
            os.remove(input_temp)
