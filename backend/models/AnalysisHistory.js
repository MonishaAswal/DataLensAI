import mongoose from 'mongoose';

const analysisHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    datasetId: {
      type: String,
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

import { getFallbackDb } from '../config/jsonDb.js';

const mongooseAnalysisHistory = mongoose.model('AnalysisHistory', analysisHistorySchema);

const AnalysisHistoryProxy = new Proxy(mongooseAnalysisHistory, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    const fallbackDb = getFallbackDb('history');
    if (prop in fallbackDb) {
      return fallbackDb[prop];
    }
    return Reflect.get(target, prop);
  }
});

export default AnalysisHistoryProxy;
