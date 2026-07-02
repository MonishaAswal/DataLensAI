import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getHistory,
  createHistory,
  deleteHistory
} from '../controllers/historyController.js';

const router = express.Router();

router.route('/')
  .get(protect, getHistory)
  .post(protect, createHistory);

router.route('/:id')
  .delete(protect, deleteHistory);

export default router;
