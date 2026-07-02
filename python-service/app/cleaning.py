import os
import pandas as pd
import numpy as np
from .analysis import load_dataframe

def clean_dataset(file_path: str, output_path: str, options: dict) -> dict:
    """
    Applies selected cleaning operations to the dataset and saves the result.
    Returns details of actions taken (e.g. number of rows cleaned, duplicates removed).
    """
    df = load_dataframe(file_path)
    initial_rows, initial_cols = df.shape
    
    actions_taken = []
    
    # 1. Remove duplicates
    if options.get("remove_duplicates", False):
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            df = df.drop_duplicates()
            actions_taken.append(f"Removed {dup_count} duplicate row(s).")
        else:
            actions_taken.append("No duplicate rows found.")
            
    # 2. Fill missing numerical values
    impute_numeric = options.get("impute_numeric", "none")  # 'mean', 'median', 'none'
    if impute_numeric in ["mean", "median"]:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        imputed_count = 0
        for col in numeric_cols:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                if impute_numeric == "mean":
                    fill_value = float(df[col].mean())
                else:  # median
                    fill_value = float(df[col].median())
                df[col] = df[col].fillna(fill_value)
                imputed_count += missing_count
        if imputed_count > 0:
            actions_taken.append(f"Imputed {imputed_count} missing numerical value(s) using column {impute_numeric}.")
            
    # 3. Fill missing categorical values
    impute_categorical = options.get("impute_categorical", "none")  # 'mode', 'none'
    if impute_categorical == "mode":
        categorical_cols = df.select_dtypes(include=[object, "category"]).columns
        imputed_count = 0
        for col in categorical_cols:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                mode_series = df[col].mode()
                if not mode_series.empty:
                    fill_value = mode_series.iloc[0]
                    df[col] = df[col].fillna(fill_value)
                    imputed_count += missing_count
        if imputed_count > 0:
            actions_taken.append(f"Imputed {imputed_count} missing categorical value(s) using column mode.")
            
    # 4. Remove empty columns
    if options.get("remove_empty_cols", False):
        empty_cols = [col for col in df.columns if df[col].isnull().all()]
        if empty_cols:
            df = df.dropna(how='all', axis=1)
            actions_taken.append(f"Removed {len(empty_cols)} completely empty column(s): {', '.join(empty_cols)}.")
            
    # 5. Standardize date formats
    if options.get("standardize_dates", False):
        object_cols = df.select_dtypes(include=[object]).columns
        standardized_cols = []
        for col in object_cols:
            # Check if column name contains date-like keywords or column values can be parsed as dates
            name_lower = col.lower()
            date_keywords = ["date", "time", "created", "updated", "timestamp", "dob", "birth"]
            is_date_named = any(keyword in name_lower for keyword in date_keywords)
            
            # Sample some non-null values to test parsing
            non_null_samples = df[col].dropna().head(10)
            if non_null_samples.empty:
                continue
                
            parse_success_count = 0
            for val in non_null_samples:
                try:
                    pd.to_datetime(val)
                    parse_success_count += 1
                except (ValueError, TypeError):
                    pass
            
            # If named like a date or >60% of test samples parse successfully, convert it
            if is_date_named or (parse_success_count / len(non_null_samples) >= 0.6):
                try:
                    # Coerce invalid dates to NaT (which is fine, will be cleaned or kept as Null)
                    converted = pd.to_datetime(df[col], errors='coerce')
                    # If conversion didn't result in all NaTs
                    if not converted.isnull().all():
                        df[col] = converted.dt.strftime('%Y-%m-%d')
                        standardized_cols.append(col)
                except Exception:
                    pass
        if standardized_cols:
            actions_taken.append(f"Standardized date formats for {len(standardized_cols)} column(s): {', '.join(standardized_cols)} to 'YYYY-MM-DD'.")

    # Save to target file
    _, ext = os.path.splitext(output_path.lower())
    if ext == '.csv':
        df.to_csv(output_path, index=False)
    elif ext in ['.xlsx', '.xls']:
        df.to_excel(output_path, index=False)
    elif ext == '.json':
        df.to_json(output_path, orient='records', indent=2)
    else:
        # Default to csv
        df.to_csv(output_path, index=False)

    final_rows, final_cols = df.shape
    
    return {
        "initial_dimensions": {"rows": initial_rows, "columns": initial_cols},
        "final_dimensions": {"rows": final_rows, "columns": final_cols},
        "actions_taken": actions_taken
    }
