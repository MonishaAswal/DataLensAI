import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

def prepare_features(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    """
    Prepares features for predicting target_col.
    Fills missing values in other columns and performs one-hot encoding for categorical variables.
    """
    # 1. Drop target column
    X = df.drop(columns=[target_col])
    
    # 2. Drop columns that are completely null
    null_cols = [col for col in X.columns if X[col].isnull().all()]
    if null_cols:
        X = X.drop(columns=null_cols)
        
    if X.empty:
        return None
        
    numeric_cols = []
    categorical_cols = []
    
    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            numeric_cols.append(col)
        elif pd.api.types.is_object_dtype(X[col]) or pd.api.types.is_categorical_dtype(X[col]) or X[col].dtype == bool:
            categorical_cols.append(col)
            
    # 3. Clean features: impute temporarily to avoid sklearn complaining about NaNs
    X_clean = pd.DataFrame(index=df.index)
    
    for col in numeric_cols:
        median_val = X[col].median()
        if pd.isnull(median_val):
            median_val = 0.0
        X_clean[col] = X[col].fillna(median_val)
        
    for col in categorical_cols:
        mode_series = X[col].mode()
        mode_val = mode_series.iloc[0] if not mode_series.empty else 'missing'
        X_clean[col] = X[col].fillna(mode_val).astype(str)
        
    if X_clean.empty:
        return None
        
    # 4. One-hot encode
    if categorical_cols:
        X_encoded = pd.get_dummies(X_clean, columns=categorical_cols, drop_first=True)
    else:
        X_encoded = X_clean
        
    # 5. Convert to float to handle boolean values
    X_encoded = X_encoded.astype(float)
    
    return X_encoded

def run_smart_imputation(df: pd.DataFrame):
    """
    Main function to perform Smart AI Imputation.
    Identifies all columns containing missing values, processes each independently,
    trains RandomForest model, and returns the cleaned dataframe, report and statistics.
    """
    df_clean = df.copy()
    
    # 1. Identify columns containing missing values
    cols_with_missing = [col for col in df.columns if df[col].isnull().sum() > 0]
    
    report = []
    columns_processed = []
    total_before_missing = int(df.isnull().sum().sum())
    
    for col in cols_with_missing:
        missing_count = int(df[col].isnull().sum())
        
        # Separate rows into train and predict sets
        train_mask = df[col].notnull()
        pred_mask = df[col].isnull()
        
        y_train = df.loc[train_mask, col]
        
        if len(y_train) == 0:
            # Fallback when there is no training data
            if pd.api.types.is_numeric_dtype(df[col]):
                method = "Fallback: Zero Imputation (no training data)"
                fill_val = 0.0
                df_clean[col] = df_clean[col].fillna(fill_val)
                y_pred = [fill_val] * missing_count
            else:
                method = "Fallback: Mode Imputation (no training data)"
                fill_val = "missing"
                df_clean[col] = df_clean[col].fillna(fill_val)
                y_pred = [fill_val] * missing_count
        else:
            # Feature preparation
            X_encoded = prepare_features(df, col)
            
            if X_encoded is None or X_encoded.empty:
                # Fallback when there are no feature columns
                if pd.api.types.is_numeric_dtype(df[col]):
                    method = "Fallback: Median Imputation (no feature columns)"
                    fill_val = float(y_train.median()) if not pd.isnull(y_train.median()) else 0.0
                    df_clean[col] = df_clean[col].fillna(fill_val)
                    y_pred = [fill_val] * missing_count
                else:
                    method = "Fallback: Mode Imputation (no feature columns)"
                    mode_val = y_train.mode().iloc[0] if not y_train.mode().empty else "missing"
                    df_clean[col] = df_clean[col].fillna(mode_val)
                    y_pred = [mode_val] * missing_count
            else:
                X_train = X_encoded.loc[train_mask]
                X_pred = X_encoded.loc[pred_mask]
                
                # Check column type to select Regressor vs Classifier
                if pd.api.types.is_numeric_dtype(df[col]):
                    method = "Smart AI Imputation (Random Forest Regressor)"
                    
                    if y_train.nunique() <= 1:
                        fill_val = float(y_train.iloc[0])
                        y_pred = [fill_val] * missing_count
                    else:
                        reg = RandomForestRegressor(n_estimators=100, random_state=42)
                        reg.fit(X_train, y_train)
                        y_pred = reg.predict(X_pred)
                    
                    # Round if all original non-null values are integers
                    is_integer = all(val % 1 == 0 for val in y_train.dropna())
                    if is_integer:
                        y_pred = [int(round(val)) for val in y_pred]
                    else:
                        y_pred = [float(round(val, 4)) for val in y_pred]
                else:
                    method = "Smart AI Imputation (Random Forest Classifier)"
                    y_train_str = y_train.astype(str)
                    
                    if y_train_str.nunique() <= 1:
                        fill_val = y_train_str.iloc[0]
                        y_pred = [fill_val] * missing_count
                    else:
                        le = LabelEncoder()
                        y_train_encoded = le.fit_transform(y_train_str)
                        
                        clf = RandomForestClassifier(n_estimators=100, random_state=42)
                        clf.fit(X_train, y_train_encoded)
                        y_pred_encoded = clf.predict(X_pred)
                        y_pred = le.inverse_transform(y_pred_encoded)
                        
                    y_pred = list(y_pred)
            
            # Replace missing values in dataframe
            df_clean.loc[pred_mask, col] = y_pred
            
        columns_processed.append(col)
        
        # Prepare sample predicted values for the report
        sample_preds = y_pred[:5]
        col_type = "Numeric" if pd.api.types.is_numeric_dtype(df[col]) else "Categorical"
        
        report.append({
            "column": col,
            "type": col_type,
            "missingBefore": missing_count,
            "missingAfter": int(df_clean[col].isnull().sum()),
            "method": method,
            "valuesPredicted": missing_count,
            "samplePredictions": [str(val) for val in sample_preds]
        })
        
    total_after_missing = int(df_clean.isnull().sum().sum())
    
    return df_clean, report, total_before_missing, total_after_missing, columns_processed
