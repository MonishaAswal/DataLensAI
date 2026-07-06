import os
import pandas as pd
import numpy as np

def load_dataframe(file_path: str) -> pd.DataFrame:
    """
    Loads a dataset file into a pandas DataFrame based on its extension.
    """
    _, ext = os.path.splitext(file_path.lower())
    if ext == '.csv':
        # Try reading with utf-8 first, fallback to latin-1
        try:
            return pd.read_csv(file_path)
        except UnicodeDecodeError:
            return pd.read_csv(file_path, encoding='latin-1')
    elif ext in ['.xlsx', '.xls']:
        return pd.read_excel(file_path)
    elif ext == '.json':
        try:
            return pd.read_json(file_path)
        except ValueError as e:
            if "If using all scalar values, you must pass an index" in str(e):
                import json
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    return pd.DataFrame([data])
                raise e
            raise e
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def analyze_dataset(file_path: str) -> dict:
    """
    Performs Exploratory Data Analysis (EDA) on a dataset and returns structured stats.
    """
    df = load_dataframe(file_path)
    
    # Basic statistics
    row_count = int(df.shape[0])
    col_count = int(df.shape[1])
    
    # Memory usage
    try:
        memory_usage_bytes = int(df.memory_usage(deep=True).sum())
    except Exception:
        memory_usage_bytes = int(df.memory_usage().sum())
        
    memory_usage_kb = round(memory_usage_bytes / 1024, 2)
    memory_str = f"{memory_usage_kb} KB" if memory_usage_kb < 1024 else f"{round(memory_usage_kb/1024, 2)} MB"
    
    # Columns list and data types
    columns = []
    dtypes_dict = {}
    for col in df.columns:
        dtype = str(df[col].dtype)
        dtypes_dict[col] = dtype
        columns.append({
            "name": str(col),
            "type": dtype
        })
        
    # Duplicate rows
    duplicate_count = int(df.duplicated().sum())
    
    # Missing values and unique counts
    missing_analysis = {}
    unique_counts = {}
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        missing_percent = round((missing_count / row_count) * 100, 2) if row_count > 0 else 0.0
        missing_analysis[col] = {
            "count": missing_count,
            "percentage": missing_percent
        }
        unique_counts[col] = int(df[col].nunique(dropna=True))

    # Detailed column-level summary and outlier detection using IQR
    column_summaries = {}
    outliers_analysis = {}
    distributions = {}
    
    for col in df.columns:
        col_data = df[col]
        col_type = dtypes_dict[col]
        
        # Determine if numeric
        is_numeric = np.issubdtype(col_data.dtype, np.number)
        
        summary = {
            "type": "numeric" if is_numeric else "categorical",
            "unique_count": unique_counts[col],
            "missing_count": missing_analysis[col]["count"]
        }
        
        if is_numeric:
            # Stats
            non_null_data = col_data.dropna()
            if not non_null_data.empty:
                summary.update({
                    "min": float(non_null_data.min()),
                    "max": float(non_null_data.max()),
                    "mean": float(non_null_data.mean()),
                    "median": float(non_null_data.median()),
                    "std": float(non_null_data.std()) if len(non_null_data) > 1 else 0.0,
                    "q25": float(non_null_data.quantile(0.25)),
                    "q75": float(non_null_data.quantile(0.75))
                })
                
                # IQR Outlier Detection
                q25 = summary["q25"]
                q75 = summary["q75"]
                iqr = q75 - q25
                lower_bound = q25 - 1.5 * iqr
                upper_bound = q75 + 1.5 * iqr
                
                outliers = non_null_data[(non_null_data < lower_bound) | (non_null_data > upper_bound)]
                outlier_count = len(outliers)
                outlier_percentage = round((outlier_count / row_count) * 100, 2) if row_count > 0 else 0.0
                
                outliers_analysis[col] = {
                    "count": outlier_count,
                    "percentage": outlier_percentage,
                    "lower_bound": float(lower_bound),
                    "upper_bound": float(upper_bound),
                    "outlier_samples": [float(val) for val in outliers.head(5).values]
                }
                
                # Histogram distribution
                try:
                    counts, bins = np.histogram(non_null_data, bins=10)
                    distributions[col] = {
                        "type": "numeric",
                        "data": [
                            {
                                "bin_range": f"{round(bins[i], 2)} - {round(bins[i+1], 2)}",
                                "count": int(counts[i])
                            } for i in range(len(counts))
                        ]
                    }
                except Exception:
                    distributions[col] = {"type": "numeric", "data": []}
            else:
                summary.update({
                    "min": None, "max": None, "mean": None, "median": None, "std": None, "q25": None, "q75": None
                })
                outliers_analysis[col] = {"count": 0, "percentage": 0.0, "lower_bound": None, "upper_bound": None, "outlier_samples": []}
                distributions[col] = {"type": "numeric", "data": []}
        else:
            # Categorical stats
            non_null_data = col_data.dropna()
            if not non_null_data.empty:
                val_counts = non_null_data.value_counts()
                top_val = val_counts.index[0]
                top_freq = val_counts.values[0]
                summary.update({
                    "top": str(top_val),
                    "freq": int(top_freq)
                })
                
                # Distribution of top 10 categories, combining rest as "Other"
                top_cats = val_counts.head(10)
                dist_data = [{"category": str(k), "count": int(v)} for k, v in top_cats.items()]
                if len(val_counts) > 10:
                    other_count = int(sum(list(val_counts.iloc[10:])))
                    dist_data.append({"category": "Other", "count": other_count})
                distributions[col] = {
                    "type": "categorical",
                    "data": dist_data
                }
            else:
                summary.update({
                    "top": None,
                    "freq": 0
                })
                distributions[col] = {"type": "categorical", "data": []}
                
        column_summaries[col] = summary

    # Data Quality Checks (Detect missing, duplicates, constant columns, high cardinality, high correlation, imbalance)
    data_quality_issues = []
    
    # Constant columns: column with only 1 unique value
    constant_cols_count = 0
    for col, u_cnt in unique_counts.items():
        if u_cnt == 1 and row_count > 1:
            constant_cols_count += 1
            data_quality_issues.append({
                "column": col,
                "issue": "Constant Column",
                "description": "This column contains only one unique value and offers no predictive power.",
                "severity": "low"
            })
            
    # High cardinality: categorical column with more than 50% unique values and count > 10
    high_cardinality_count = 0
    for col in df.columns:
        if dtypes_dict[col] == 'object' or dtypes_dict[col] == 'category':
            u_cnt = unique_counts[col]
            if u_cnt > 10 and (u_cnt / row_count) > 0.5:
                high_cardinality_count += 1
                data_quality_issues.append({
                    "column": col,
                    "issue": "High Cardinality",
                    "description": f"High number of unique text values ({u_cnt}). May need encoding or text grouping.",
                    "severity": "low"
                })
                
    # Outliers
    total_outliers = 0
    numeric_columns_count = 0
    for col, o_info in outliers_analysis.items():
        numeric_columns_count += 1
        if o_info["count"] > 0:
            total_outliers += o_info["count"]
            data_quality_issues.append({
                "column": col,
                "issue": f"Outliers Detected ({o_info['count']} values)",
                "description": f"{o_info['count']} values ({o_info['percentage']}%) fall outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR].",
                "severity": "medium" if o_info["percentage"] > 5 else "low"
            })
            
    # Missing values check
    total_missing = 0
    for col, m_info in missing_analysis.items():
        total_missing += m_info["count"]
        if m_info["count"] > 0:
            severity = "high" if m_info["percentage"] > 20 else ("medium" if m_info["percentage"] > 5 else "low")
            data_quality_issues.append({
                "column": col,
                "issue": f"Missing Values ({m_info['count']} values)",
                "description": f"{m_info['count']} records ({m_info['percentage']}%) contain empty or null values.",
                "severity": severity
            })

    # Numeric Correlation Matrix & Highly Correlated Check
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
    correlation_matrix = {}
    highly_correlated_pairs = []
    if len(numeric_cols) > 1:
        corr_matrix = pd.DataFrame.corr(df[numeric_cols])
        if isinstance(corr_matrix, pd.DataFrame):
            corr = corr_matrix.fillna(0)
        else:
            corr = pd.DataFrame(0.0, index=numeric_cols, columns=numeric_cols)
        for col1 in corr.columns:
            correlation_matrix[col1] = {}
            for col2 in corr.index:
                val = float(corr.loc[col1, col2])
                correlation_matrix[col1][col2] = val
                if col1 < col2 and abs(val) > 0.85:
                    highly_correlated_pairs.append((col1, col2, val))
                    data_quality_issues.append({
                        "column": f"{col1} & {col2}",
                        "issue": "High Correlation",
                        "description": f"Columns are highly correlated (r = {round(val, 2)}), which might cause multi-collinearity issues.",
                        "severity": "low"
                    })

    # Imbalance check for categorical columns
    class_imbalances_count = 0
    for col in df.columns:
        if dtypes_dict[col] == 'object' or dtypes_dict[col] == 'category':
            non_null = df[col].dropna()
            if not non_null.empty:
                freqs = non_null.value_counts(normalize=True)
                if freqs.iloc[0] > 0.85:
                    class_imbalances_count += 1
                    data_quality_issues.append({
                        "column": col,
                        "issue": "Data Imbalance",
                        "description": f"A single value '{freqs.index[0]}' dominates {round(freqs.iloc[0]*100, 1)}% of the column.",
                        "severity": "medium"
                    })

    # Invalid dates check: date keyword columns that fail parsing
    invalid_dates_count = 0
    for col in df.columns:
        name_lower = col.lower()
        date_keywords = ["date", "time", "created", "updated", "dob", "birth"]
        if any(kw in name_lower for kw in date_keywords) and dtypes_dict[col] == 'object':
            non_null = df[col].dropna()
            if not non_null.empty:
                try:
                    parsed = pd.to_datetime(non_null, errors='coerce')
                    nat_pct = (parsed.isna().sum() / len(non_null)) * 100
                    if nat_pct > 15:
                        invalid_dates_count += 1
                        data_quality_issues.append({
                            "column": col,
                            "issue": "Invalid/Inconsistent Dates",
                            "description": f"{round(nat_pct, 1)}% of non-null values failed to parse as date/time formats.",
                            "severity": "medium"
                        })
                except Exception:
                    pass

    # DYNAMIC QUALITY SCORE COMPUTATION
    total_cells = row_count * col_count if row_count > 0 and col_count > 0 else 1
    missing_pct = (total_missing / total_cells) * 100
    missing_penalty = min(40.0, (missing_pct * 1.5)) # Up to -40
    
    dup_pct = (duplicate_count / row_count) * 100 if row_count > 0 else 0
    duplicate_penalty = min(20.0, (dup_pct * 1.0)) # Up to -20
    
    outlier_pct = (total_outliers / total_cells) * 100
    outliers_penalty = min(20.0, (outlier_pct * 2.0)) # Up to -20
    
    constant_penalty = min(15.0, constant_cols_count * 5.0)
    cardinality_penalty = min(10.0, high_cardinality_count * 2.0)
    correlation_penalty = min(10.0, len(highly_correlated_pairs) * 1.0)
    imbalance_penalty = min(10.0, (class_imbalances_count + invalid_dates_count) * 2.0)
    
    raw_score = 100.0 - (missing_penalty + duplicate_penalty + outliers_penalty + constant_penalty + cardinality_penalty + correlation_penalty + imbalance_penalty)
    quality_score = max(0, min(100, int(raw_score)))
    
    quality_score_breakdown = {
        "score": quality_score,
        "missing_values_penalty": float(round(missing_penalty, 2)),
        "duplicates_penalty": float(round(duplicate_penalty, 2)),
        "outliers_penalty": float(round(outliers_penalty, 2)),
        "constant_columns_penalty": float(round(constant_penalty, 2)),
        "cardinality_penalty": float(round(cardinality_penalty, 2)),
        "correlation_penalty": float(round(correlation_penalty, 2)),
        "imbalance_penalty": float(round(imbalance_penalty, 2))
    }

    # Row previews (First 20 rows, clean NaN to None so it can serialize to JSON)
    preview_df = df.head(20)
    # Replace NaN/NaT with None so JSON conversion works
    preview_df = preview_df.replace({np.nan: None})
    preview_rows = preview_df.to_dict(orient='records')

    return {
        "dimensions": {
            "rows": row_count,
            "columns": col_count,
            "memory": memory_str,
            "memory_bytes": memory_usage_bytes
        },
        "columns": columns,
        "duplicate_count": duplicate_count,
        "missing_analysis": missing_analysis,
        "unique_counts": unique_counts,
        "column_summaries": column_summaries,
        "outliers_analysis": outliers_analysis,
        "distributions": distributions,
        "correlation_matrix": correlation_matrix,
        "data_quality_issues": data_quality_issues,
        "preview_rows": preview_rows,
        "quality_score": quality_score,
        "quality_score_breakdown": quality_score_breakdown
    }
