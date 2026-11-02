import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { protectAdmin } from '../middleware/adminMiddleware';
import {
    uploadDocument,
    getMyDocuments,
    deleteDocument,
    uploadMiddleware,
    getPendingDocuments,
    approveDocument,
    rejectDocument
} from '../controllers/documentVerificationController';

const router = Router();

// ============================================================================
// User Document Routes (Protected)
// ============================================================================

// Upload verification document
router.post('/documents/upload', authenticateToken, uploadMiddleware, uploadDocument);

// Get my uploaded documents
router.get('/documents/my-documents', authenticateToken, getMyDocuments);

// Delete document
router.delete('/documents/:id', authenticateToken, deleteDocument);

// ============================================================================
// Admin Document Routes (Protected)
// ============================================================================

// Get pending documents for review
router.get('/admin/documents/pending', protectAdmin, getPendingDocuments);

// Approve document
router.post('/admin/documents/:id/approve', protectAdmin, approveDocument);

// Reject document
router.post('/admin/documents/:id/reject', protectAdmin, rejectDocument);

export default router;
