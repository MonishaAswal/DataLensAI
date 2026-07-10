import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def generate_ai_report(dataset_name: str, eda_stats: dict, api_key: str = None) -> str:
    """
    Generates a natural-language data analysis and quality report using LangChain and Groq.
    Uses the analyst-friendly structure and strictly aligns with actual dataset statistics.
    """
    try:
        # Clear duplicate GROQ_BASE_URL pathing from environment to prevent SDK 404s
        if "GROQ_BASE_URL" in os.environ:
            val = os.environ["GROQ_BASE_URL"]
            if val and "/openai/v1" in val:
                del os.environ["GROQ_BASE_URL"]

        # Fetch API Key from parameter or environment
        groq_key = api_key or os.environ.get("GROQ_API_KEY")
        
        # Extract variables safely first to avoid KeyError during warnings fallback
        dimensions = eda_stats.get("dimensions", {}) or {}
        col_summaries = eda_stats.get("column_summaries", {}) or {}
        quality_issues = eda_stats.get("data_quality_issues", []) or []
        duplicate_count = eda_stats.get("duplicate_count", 0)
        missing_analysis = eda_stats.get("missing_analysis") or {}
        quality_score = eda_stats.get("quality_score", 85)
        quality_breakdown = eda_stats.get("quality_score_breakdown", {}) or {}

        if not groq_key:
            missing_cols_count = sum(1 for c, m in missing_analysis.items() if m.get('count', 0) > 0)
            return (
                "### DataLens AI - Analysis Report\n\n"
                "> [!WARNING]\n"
                "> **Groq API Key Not Configured**: AI-powered insights cannot be generated without an API key.\n\n"
                "Please configure the `GROQ_API_KEY` in the environment variables (e.g. in your `.env` file) to enable automated natural-language reporting.\n\n"
                "**Dataset Summary Statistics (Raw Data)**:\n"
                f"- **Dataset Name**: {dataset_name}\n"
                f"- **Quality Score**: {quality_score}/100\n"
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
                    f"Range: [{min_v} to {max_v}], Mean: {mean_str}."
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

        # Format breakdown string
        breakdown_str = ", ".join([f"{k.replace('_', ' ').title()}: {v}" for k, v in quality_breakdown.items()])

        # Prompt design
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert Senior Data Analyst at 'DataLens AI'. "
                "Your task is to analyze the provided dataset statistics and draft a professional, executive-level, "
                "highly structured analysis report in Markdown. "
                "CRITICAL: Do NOT invent, assume, or hallucinate any statistics, columns, row counts, or scores. "
                "ONLY use the metrics and details provided below. Do not use generic placeholders. "
                "Make the tone analytical, clean, and professional. Use bullet points and clean structure."
            )),
            ("user", (
                "Please generate an analysis report for the dataset: **{dataset_name}**.\n\n"
                "### Computed Dataset Metrics (DO NOT HALLUCINATE OR CHANGE THESE):\n"
                "- **Overall Data Quality Score**: {quality_score}/100\n"
                "- **Quality Score Breakdown Details**: {quality_breakdown}\n"
                "- **Dimensions**: {rows} rows x {columns} columns\n"
                "- **Memory footprint**: {memory}\n"
                "- **Total duplicates**: {duplicates}\n\n"
                "### Column Summary Statistics\n"
                "{column_stats}\n\n"
                "### Correlations (r > 0.5)\n"
                "{correlations}\n\n"
                "### Automated Data Quality Flags\n"
                "{quality_flags}\n\n"
                "--- \n"
                "Please structure your Markdown report exactly with these section headings:\n"
                "1. **Executive Summary**: A brief, high-level overview of the dataset's purpose, size, and general health (incorporating the Quality Score of {quality_score}/100).\n"
                "2. **Data Quality Assessment**: A structured review of the issues detected (such as missing values, duplicates, or outliers) and how they impact the quality score.\n"
                "3. **Key Findings**: Important observations, distributions, or notable correlations in the columns.\n"
                "4. **Risks & Problems**: Critical concerns, potential biases, multi-collinearity, or parsing failures that present analytical risks.\n"
                "5. **Recommendations**: Suggested fixes (e.g. specific columns requiring imputation, date standardizations, or drop operations).\n"
                "6. **Action Items**: Next steps in bullet points for data preprocessing before machine learning or reporting.\n"
            ))
        ])

        # Initialize Groq LLM using LangChain integration
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=groq_key,
            temperature=0.1
        )
        
        chain = prompt_template | llm | StrOutputParser()
        
        report = chain.invoke({
            "dataset_name": dataset_name,
            "quality_score": str(quality_score),
            "quality_breakdown": breakdown_str,
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
