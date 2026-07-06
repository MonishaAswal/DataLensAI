import os
import pandas as pd
import numpy as np
from .analysis import load_dataframe

def clean_dataset(file_path: str, output_path: str, options: dict) -> dict:
    """
    Applies selected cleaning operations to the dataset and saves the result.
    Thoroughly cleans missing values, duplicates, and inconsistent formats in one run.
    """
    df = load_dataframe(file_path)
    initial_rows, initial_cols = df.shape
    
    actions_taken = []
    
    # Pre-clean: Replace empty strings, whitespace-only entries, and text nulls with actual NaN
    for col in df.columns:
        if df[col].dtype == object:
            # Replace whitespace-only strings
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace(['', 'null', 'NULL', 'None', 'none', 'NaN', 'nan', 'undefined', 'NA', '<NA>'], np.nan)
    
    # 1. Remove duplicates
    if options.get("remove_duplicates", False) or options.get("removeDuplicates", False):
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            df = df.drop_duplicates()
            actions_taken.append(f"Removed {dup_count} duplicate row(s).")
        else:
            actions_taken.append("No duplicate rows found.")
            
    # 2. Convert columns to numeric if they are mostly numeric but typed as object
    for col in df.columns:
        if df[col].dtype == object:
            non_null = df[col].dropna()
            if not non_null.empty:
                # Check if > 80% of non-null values can be converted to numeric
                converted = pd.to_numeric(non_null, errors='coerce')
                valid_numeric_pct = (converted.notna().sum() / len(non_null))
                if valid_numeric_pct > 0.8:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    actions_taken.append(f"Coerced column '{col}' to numeric (detected numeric values).")

    # 3. Fill missing numerical values
    impute_numeric = options.get("impute_numeric", "none") or options.get("imputeNumeric", "none")
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
                
                # In case the entire column was NaN
                if pd.isna(fill_value):
                    fill_value = 0.0
                
                df[col] = df[col].fillna(fill_value)
                imputed_count += missing_count
                actions_taken.append(f"Imputed {missing_count} nulls in numeric column '{col}' using {impute_numeric}.")
        if imputed_count > 0:
            actions_taken.append(f"Total numeric values imputed: {imputed_count}.")
            
    # 4. Fill missing categorical values
    impute_categorical = options.get("impute_categorical", "none") or options.get("imputeCategorical", "none")
    if impute_categorical == "mode":
        categorical_cols = df.select_dtypes(include=[object, "category"]).columns
        imputed_count = 0
        for col in categorical_cols:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                mode_series = df[col].mode()
                if not mode_series.empty:
                    fill_value = mode_series.iloc[0]
                else:
                    fill_value = "Unknown"
                
                df[col] = df[col].fillna(fill_value)
                imputed_count += missing_count
                actions_taken.append(f"Imputed {missing_count} nulls in categorical column '{col}' using mode.")
        if imputed_count > 0:
            actions_taken.append(f"Total categorical values imputed: {imputed_count}.")
            
    # 5. Remove empty columns
    if options.get("remove_empty_cols", False) or options.get("removeEmptyCols", False):
        empty_cols = [col for col in df.columns if df[col].isnull().all()]
        if empty_cols:
            df = df.dropna(how='all', axis=1)
            actions_taken.append(f"Removed {len(empty_cols)} completely empty column(s): {', '.join(empty_cols)}.")
            
    # 6. Standardize date formats
    if options.get("standardize_dates", False) or options.get("standardizeDates", False):
        object_cols = df.select_dtypes(include=[object]).columns
        standardized_cols = []
        for col in object_cols:
            name_lower = col.lower()
            date_keywords = ["date", "time", "created", "updated", "timestamp", "dob", "birth"]
            is_date_named = any(keyword in name_lower for keyword in date_keywords)
            
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
            
            if is_date_named or (parse_success_count / len(non_null_samples) >= 0.6):
                try:
                    converted = pd.to_datetime(df[col], errors='coerce')
                    if not converted.isnull().all():
                        df[col] = converted.dt.strftime('%Y-%m-%d')
                        standardized_cols.append(col)
                except Exception:
                    pass
        if standardized_cols:
            actions_taken.append(f"Standardized date formats to 'YYYY-MM-DD' for {len(standardized_cols)} column(s): {', '.join(standardized_cols)}.")

    # Save to target file
    _, ext = os.path.splitext(output_path.lower())
    if ext == '.csv':
        df.to_csv(output_path, index=False)
    elif ext in ['.xlsx', '.xls']:
        df.to_excel(output_path, index=False)
    elif ext == '.json':
        df.to_json(output_path, orient='records', indent=2)
    else:
        df.to_csv(output_path, index=False)

    final_rows, final_cols = df.shape
    
    return {
        "initial_dimensions": {"rows": initial_rows, "columns": initial_cols},
        "final_dimensions": {"rows": final_rows, "columns": final_cols},
        "actions_taken": actions_taken
    }
