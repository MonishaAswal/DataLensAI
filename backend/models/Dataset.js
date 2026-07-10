import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    datasetName: {
      type: String,
      default: '',
    },
    filename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    cleanedFilePath: {
      type: String,
      default: '',
    },
    storageUrl: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      required: true,
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    columnCount: {
      type: Number,
      default: 0,
    },
    columns: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
    edaResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiReport: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['uploaded', 'analyzed', 'cleaned'],
      default: 'uploaded',
    },
    cleaningActions: {
      type: [String],
      default: [],
    },
    cleaningReport: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

import { getFallbackDb } from '../config/jsonDb.js';

const mongooseDataset = mongoose.model('Dataset', datasetSchema);

const DatasetProxy = new Proxy(mongooseDataset, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    const fallbackDb = getFallbackDb('datasets');
    if (prop in fallbackDb) {
      return fallbackDb[prop];
    }
    return Reflect.get(target, prop);
  }
});

export default DatasetProxy;
