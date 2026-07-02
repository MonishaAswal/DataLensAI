import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def generate_ai_report(dataset_name: str, eda_stats: dict, api_key: str = None) -> str:
    """
    Generates a natural-language data analysis and quality report using LangChain and Groq.
    """
    try:
        # Fetch API Key from parameter or environment
        groq_key = api_key or os.environ.get("GROQ_API_KEY")
        
        # Extract variables safely first to avoid KeyError during warnings fallback
        dimensions = eda_stats.get("dimensions", {})
        col_summaries = eda_stats.get("column_summaries", {}) or {}
        quality_issues = eda_stats.get("data_quality_issues", [])
        duplicate_count = eda_stats.get("duplicate_count", 0)
        missing_analysis = eda_stats.get("missing_analysis") or {}

        if not groq_key:
            missing_cols_count = sum(1 for c, m in missing_analysis.items() if m.get('count', 0) > 0)
            return (
                "### DataLens AI - Analysis Report\n\n"
                "> [!WARNING]\n"
                "> **Groq API Key Not Configured**: AI-powered insights cannot be generated without an API key.\n\n"
                "Please configure the `GROQ_API_KEY` in the environment variables (e.g. in your `.env` file) to enable automated natural-language reporting.\n\n"
                "**Dataset Summary Statistics (Raw Data)**:\n"
                f"- **Rows**: {dimensions.get('rows', 0):,}\n"
                f"- **Columns**: {dimensions.get('columns', 0):,}\n"
                f"- **Memory Usage**: {dimensions.get('memory', 'N/A')}\n"
                f"- **Duplicates**: {duplicate_count:,} duplicate row(s)\n"
                f"- **Missing Columns**: {missing_cols_count} column(s) with missing data.\n"
            )

        # 1. Format columns details safely
        cols_text = []
        for col_name, info in col_summaries.items():
            missing_count = info.get("missing_count", 0)
            u_count = info.get("unique_count", 0)
            c_type = info.get("type", "categorical")
            
            if c_type == "numeric":
                min_v = info.get("min")
                max_v = info.get("max")
                mean_v = info.get("mean")
                mean_str = f"{mean_v:.2f}" if mean_v is not None and isinstance(mean_v, (int, float)) else "N/A"
                
                cols_text.append(
                    f"- **{col_name}** (Numeric): {u_count} unique values, {missing_count} missing. "
                    f"Range: [{min_v} to {max_v}], Mean: {mean_str} (if applicable)."
                )
            else:
                top_v = info.get("top")
                freq_v = info.get("freq")
                cols_text.append(
                    f"- **{col_name}** (Categorical/Text): {u_count} unique values, {missing_count} missing. "
                    f"Top: '{top_v}' (appears {freq_v} times)."
                )
                
        cols_summary_str = "\n".join(cols_text)
        
        # 2. Format correlation details safely
        corr_matrix = eda_stats.get("correlation_matrix") or {}
        high_correlations = []
        for col1, targets in corr_matrix.items():
            if not isinstance(targets, dict):
                continue
            for col2, val in targets.items():
                # Avoid duplicate pairs and self-correlation, and verify type before abs()
                if col1 < col2 and val is not None and isinstance(val, (int, float)):
                    if abs(val) > 0.5:
                        high_correlations.append(f"- {col1} & {col2}: {val:.2f}")
                    
        corr_str = "\n".join(high_correlations) if high_correlations else "No highly correlated pairs (r > 0.5) detected."

        # 3. Format Quality issues safely
        issues_text = []
        for issue in quality_issues:
            severity = issue.get('severity', 'LOW').upper()
            column = issue.get('column', 'N/A')
            issue_name = issue.get('issue', 'Unknown')
            desc = issue.get('description', '')
            issues_text.append(f"- [{severity}] Column **{column}**: {issue_name} - {desc}")
            
        issues_str = "\n".join(issues_text) if issues_text else "No major data quality issues automatically flagged."

        # Prompt design
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a Senior Data Scientist and AI Analysis Engine inside 'DataLens AI'. "
                "Your task is to analyze the provided dataset statistics and draft a professional, executive-level, "
                "highly readable Exploratory Data Analysis (EDA) and Dataset Quality report in Markdown. "
                "Use GitHub markdown alerts (e.g. `> [!IMPORTANT]`, `> [!WARNING]`, `> [!NOTE]`) where appropriate "
                "to highlight key patterns or critical data quality concerns."
            )),
            ("user", (
                "Please generate an analysis report for the dataset: **{dataset_name}**.\n\n"
                "### Dataset Details\n"
                "- **Dimensions**: {rows} rows x {columns} columns\n"
                "- **Memory footprint**: {memory}\n"
                "- **Total duplicates**: {duplicates}\n\n"
                "### Column Summary Statistics\n"
                "{column_stats}\n\n"
                "### Notable Correlations\n"
                "{correlations}\n\n"
                "### Automated Data Quality Flags\n"
                "{quality_flags}\n\n"
                "--- \n"
                "Please structure your Markdown report exactly with these section headings:\n"
                "1. **Executive Summary**: A concise high-level synthesis of what this dataset represents, its size, and overall health.\n"
                "2. **Data Quality Audit**: A critical evaluation of anomalies (missing values, outlier impacts, constant columns, or duplicates) and how they could distort analysis.\n"
                "3. **Visual & Statistical Insights**: Key distribution characteristics, skewness, and correlation patterns of note.\n"
                "4. **Actionable Sanitization Roadmap**: A bulleted roadmap detailing specific data-cleaning operations recommended prior to downstream machine learning or analytics.\n"
            ))
        ])

        # Initialize Groq LLM using LangChain integration
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=groq_key,
            temperature=0.2
        )
        
        chain = prompt_template | llm | StrOutputParser()
        
        report = chain.invoke({
            "dataset_name": dataset_name,
            "rows": f"{dimensions.get('rows', 0):,}",
            "columns": f"{dimensions.get('columns', 0):,}",
            "memory": dimensions.get("memory", "N/A"),
            "duplicates": f"{duplicate_count:,}",
            "column_stats": cols_summary_str,
            "correlations": corr_str,
            "quality_flags": issues_str
        })
        
        return report
    except Exception as e:
        import traceback
        print(f"Exception during report generation: {str(e)}")
        traceback.print_exc()
        return (
            f"### DataLens AI - Report Generation Failed\n\n"
            f"> [!CAUTION]\n"
            f"> **Error generating AI Insights**: {str(e)}\n\n"
            "The system encountered an error invoking the Groq AI engine. Please ensure your `GROQ_API_KEY` is correct, and that network connection is active.\n\n"
            "**Raw Stats Outline**:\n"
            f"- **Rows**: {eda_stats.get('dimensions', {}).get('rows', 0):,}\n"
            f"- **Columns**: {eda_stats.get('dimensions', {}).get('columns', 0):,}\n"
            f"- **Duplicates**: {eda_stats.get('duplicate_count', 0):,}\n"
        )
