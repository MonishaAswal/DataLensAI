import AnalysisHistory from '../models/AnalysisHistory.js';

/**
 * @desc    Get all analysis history records for authenticated user
 * @route   GET /api/history
 * @access  Private
 */
export const getHistory = async (req, res) => {
  try {
    const history = await AnalysisHistory.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error getting analysis history:', error);
    return res.status(500).json({ message: 'Server error retrieving audit logs' });
  }
};

/**
 * @desc    Create a new analysis history record
 * @route   POST /api/history
 * @access  Private
 */
export const createHistory = async (req, res) => {
  const { datasetId, datasetName, operationType, report } = req.body;

  if (!datasetId || !datasetName || !operationType || !report) {
    return res.status(400).json({ message: 'Please add all required fields' });
  }

  try {
    const log = await AnalysisHistory.create({
      userId: req.user._id,
      datasetId,
      datasetName,
      operationType,
      report
    });
    return res.status(201).json(log);
  } catch (error) {
    console.error('Error creating analysis history:', error);
    return res.status(500).json({ message: 'Server error saving audit log' });
  }
};

/**
 * @desc    Delete an analysis history record
 * @route   DELETE /api/history/:id
 * @access  Private
 */
export const deleteHistory = async (req, res) => {
  try {
    const log = await AnalysisHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!log) {
      return res.status(404).json({ message: 'Audit log not found or unauthorized' });
    }
    await AnalysisHistory.deleteOne({ _id: req.params.id });
    return res.status(200).json({ message: 'Audit log deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis history:', error);
    return res.status(500).json({ message: 'Server error deleting audit log' });
  }
};
