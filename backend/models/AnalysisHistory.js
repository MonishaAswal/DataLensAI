import mongoose from 'mongoose';

const analysisHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
    },
    datasetName: {
      type: String,
      required: true,
    },
    operationType: {
      type: String,
      required: true,
    },
    report: {
      type: String, // Holds stringified JSON of changes or report text
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const AnalysisHistory = mongoose.model('AnalysisHistory', analysisHistorySchema);
export default AnalysisHistory;
