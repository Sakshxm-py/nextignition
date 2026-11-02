import multer from 'multer';

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG/PNG/WEBP images are allowed'));
    }
};

export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

const docsFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const allowed = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF/PPT/PPTX/DOC/DOCX/XLS/XLSX files are allowed'));
    }
};

export const uploadDocs = multer({
    storage: multer.memoryStorage(),
    fileFilter: docsFileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

const videoFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only MP4/WEBM/MOV videos are allowed'));
    }
};

export const uploadVideo = multer({
    storage: multer.memoryStorage(),
    fileFilter: videoFileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024,
    },
});

export const uploadAny = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});
