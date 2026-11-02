import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG, PNG allowed'));
        }
    }
});

export const uploadMiddleware = upload.single('document');

// ============================================================================
// Upload Document
// ============================================================================

export const uploadDocument = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { documentType } = req.body; // 'id', 'passport', 'portfolio', 'credential'
        if (!documentType) {
            return res.status(400).json({ error: 'Document type is required' });
        }

        // Generate unique filename
        const fileExt = path.extname(file.originalname);
        const fileName = `${userId}_${documentType}_${Date.now()}${fileExt}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('verification-documents')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('[Documents] Upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload document' });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('verification-documents')
            .getPublicUrl(fileName);

        // Save document record
        const { data: docData, error: docError } = await supabase
            .from('verification_documents')
            .insert({
                userId,
                documentType,
                fileName: file.originalname,
                fileUrl: urlData.publicUrl,
                fileSize: file.size,
                mimeType: file.mimetype,
                status: 'pending'
            })
            .select()
            .single();

        if (docError) {
            console.error('[Documents] DB error:', docError);
            return res.status(500).json({ error: 'Failed to save document' });
        }

        return res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document: docData
        });
    } catch (error) {
        console.error('[Documents] Upload error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get My Documents
// ============================================================================

export const getMyDocuments = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: documents, error } = await supabase
            .from('verification_documents')
            .select('*')
            .eq('userId', userId)
            .order('uploadedAt', { ascending: false });

        if (error) {
            console.error('[Documents] Fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch documents' });
        }

        return res.status(200).json({
            success: true,
            documents
        });
    } catch (error) {
        console.error('[Documents] Get documents error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Delete Document
// ============================================================================

export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get document
        const { data: doc, error: fetchError } = await supabase
            .from('verification_documents')
            .select('*')
            .eq('id', id)
            .eq('userId', userId)
            .single();

        if (fetchError || !doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete from storage
        const fileName = doc.fileUrl.split('/').pop();
        await supabase.storage
            .from('verification-documents')
            .remove([fileName]);

        // Delete from database
        const { error: deleteError } = await supabase
            .from('verification_documents')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Documents] Delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete document' });
        }

        return res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('[Documents] Delete error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Admin: Get Pending Documents
// ============================================================================

export const getPendingDocuments = async (req: Request, res: Response) => {
    try {
        const { data: documents, error } = await supabase
            .from('verification_documents')
            .select(`
                *,
                users:userId (
                    id,
                    name,
                    email,
                    isVerified,
                    phoneVerified,
                    linkedInVerified
                )
            `)
            .eq('status', 'pending')
            .order('uploadedAt', { ascending: true });

        if (error) {
            console.error('[Admin] Fetch pending docs error:', error);
            return res.status(500).json({ error: 'Failed to fetch documents' });
        }

        return res.status(200).json({
            success: true,
            total: documents.length,
            documents
        });
    } catch (error) {
        console.error('[Admin] Get pending error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Admin: Approve Document
// ============================================================================

export const approveDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const { data: doc, error: updateError } = await supabase
            .from('verification_documents')
            .update({
                status: 'approved',
                reviewedAt: new Date().toISOString(),
                reviewedBy: (req as any).admin?.username || 'admin',
                notes
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('[Admin] Approve error:', updateError);
            return res.status(500).json({ error: 'Failed to approve document' });
        }

        // If ID document, mark user as identity verified
        if (doc.documentType === 'id' || doc.documentType === 'passport') {
            await supabase
                .from('users')
                .update({
                    identityVerified: true,
                    updatedAt: new Date().toISOString()
                })
                .eq('id', doc.userId);
        }

        return res.status(200).json({
            success: true,
            message: 'Document approved',
            document: doc
        });
    } catch (error) {
        console.error('[Admin] Approve document error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Admin: Reject Document
// ============================================================================

export const rejectDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const { data: doc, error: updateError } = await supabase
            .from('verification_documents')
            .update({
                status: 'rejected',
                reviewedAt: new Date().toISOString(),
                reviewedBy: (req as any).admin?.username || 'admin',
                notes: reason
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('[Admin] Reject error:', updateError);
            return res.status(500).json({ error: 'Failed to reject document' });
        }

        return res.status(200).json({
            success: true,
            message: 'Document rejected',
            document: doc
        });
    } catch (error) {
        console.error('[Admin] Reject document error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
