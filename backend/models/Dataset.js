import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

const Dataset = mongoose.model('Dataset', datasetSchema);
export default Dataset;
