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
    
    # 1. Pre-clean: Clean whitespace & detect text nulls in object columns without converting original NaNs to string
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) and not isinstance(x, (int, float)) else x)
            df[col] = df[col].replace(['', 'null', 'NULL', 'None', 'none', 'NaN', 'nan', 'undefined', 'NA', '<NA>'], np.nan)
    
    # 2. Remove duplicates (runs early so dups don't bias calculations)
    if options.get("remove_duplicates", False) or options.get("removeDuplicates", False):
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            df = df.drop_duplicates()
            actions_taken.append(f"Removed {dup_count} duplicate row(s).")
        else:
            actions_taken.append("No duplicate rows found.")
            
    # 3. Standardize date formats BEFORE imputation (in case invalid dates fail parse and become NaT/NaN)
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
                    # Coerce errors to NaN/NaT so we can impute them later
                    converted = pd.to_datetime(df[col], errors='coerce')
                    if not converted.isnull().all():
                        df[col] = converted.dt.strftime('%Y-%m-%d')
                        standardized_cols.append(col)
                except Exception:
                    pass
        if standardized_cols:
            actions_taken.append(f"Standardized date formats to 'YYYY-MM-DD' for {len(standardized_cols)} column(s): {', '.join(standardized_cols)}.")

    # 4. Convert object columns to numeric if mostly numeric (runs BEFORE imputation)
    for col in df.columns:
        if df[col].dtype == object:
            non_null = df[col].dropna()
            if not non_null.empty:
                converted = pd.to_numeric(non_null, errors='coerce')
                valid_numeric_pct = (converted.notna().sum() / len(non_null))
                if valid_numeric_pct > 0.8:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    actions_taken.append(f"Coerced column '{col}' to numeric (detected numeric values).")

    # 4b. Fix Incorrect Numeric Values (Clamp negative values in positive-only columns and remove infinite values)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        col_lower = str(col).lower()
        positive_only_keywords = ["age", "price", "salary", "count", "quantity", "rate", "amount", "cost", "total", "balance", "income", "revenue"]
        if any(kw in col_lower for kw in positive_only_keywords):
            neg_mask = df[col] < 0
            neg_count = int(neg_mask.sum())
            if neg_count > 0:
                df.loc[neg_mask, col] = df.loc[neg_mask, col].abs()
                actions_taken.append(f"Fixed {neg_count} negative value(s) in positive-only column '{col}' by converting to absolute value.")
                
        # Fix Infinite Values (replace with NaN so they get imputed or filled with fallback)
        inf_mask = np.isinf(df[col])
        inf_count = int(inf_mask.sum())
        if inf_count > 0:
            df.loc[inf_mask, col] = np.nan
            actions_taken.append(f"Replaced {inf_count} infinite value(s) in column '{col}' with NaN for subsequent imputation.")

    # 4c. Fix Inconsistent Categorical Formatting (trim whitespace and align casing if mixed duplicates exist)
    for col in df.columns:
        if df[col].dtype == object or isinstance(df[col].dtype, pd.CategoricalDtype):
            non_null = df[col].dropna()
            if not non_null.empty:
                # Check for duplicate lowercase values
                unique_vals = non_null.unique()
                unique_lowered = set(str(v).lower().strip() for v in unique_vals)
                if len(unique_vals) > len(unique_lowered):
                    df[col] = df[col].apply(lambda x: str(x).strip().title() if pd.notna(x) and not isinstance(x, (int, float)) else x)
                    actions_taken.append(f"Standardized text casing and stripped padding in column '{col}' to resolve inconsistencies.")

    # 5. Remove empty columns
    if options.get("remove_empty_cols", False) or options.get("removeEmptyCols", False):
        empty_cols = [col for col in df.columns if df[col].isnull().all()]
        if empty_cols:
            df = df.dropna(how='all', axis=1)
            actions_taken.append(f"Removed {len(empty_cols)} completely empty column(s): {', '.join(empty_cols)}.")

    # 6. Fill missing numerical values (handles coerced numeric NaNs too!)
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
                
                if pd.isna(fill_value):
                    fill_value = 0.0
                
                df[col] = df[col].fillna(fill_value)
                imputed_count += missing_count
                actions_taken.append(f"Imputed {missing_count} nulls in numeric column '{col}' using {impute_numeric}.")
        if imputed_count > 0:
            actions_taken.append(f"Total numeric values imputed: {imputed_count}.")
            
    # 7. Fill missing categorical values (handles coerced date NaNs too!)
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

    # 8. Final Sanitization Fallback: ensure no dangling NaN/NaT values exist anywhere
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        if missing_count > 0:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(0.0)
            else:
                df[col] = df[col].fillna("Unknown")
            actions_taken.append(f"Swept {missing_count} remaining unhandled nulls in '{col}' to fallbacks.")

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
