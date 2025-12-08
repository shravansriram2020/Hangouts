const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAGIC_BYTES = {
  'image/jpeg': [
    [0xff, 0xd8, 0xff],
  ],
  'image/png': [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
};

const WEBP_RIFF_HEADER = [0x52, 0x49, 0x46, 0x46];
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE_BYTES * 1.37);

function isRemoteUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('http://') || str.startsWith('https://');
}

function extractBase64Data(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { error: 'Invalid file data provided' };
  }

  if (isRemoteUrl(dataUrl)) {
    return { isRemoteUrl: true };
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    if (dataUrl.match(/^[A-Za-z0-9+/=]+$/)) {
      return { data: dataUrl, mimeType: null };
    }
    return { error: 'Invalid file format. Expected base64 encoded data.' };
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function validateMimeType(mimeType) {
  if (!mimeType) {
    return { valid: false, error: 'Missing file type information' };
  }

  const normalizedMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.map(m => m.split('/')[1]).join(', ')}`,
    };
  }

  return { valid: true };
}

function validateFileSize(base64Data) {
  if (!base64Data) {
    return { valid: false, error: 'No file data provided' };
  }

  if (base64Data.length > MAX_BASE64_LENGTH) {
    const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
  if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true, estimatedSize: estimatedBytes };
}

function validateMagicBytes(base64Data, declaredMimeType) {
  if (!base64Data || base64Data.length < 16) {
    return { valid: false, error: 'File data too short to validate' };
  }

  try {
    const binaryString = Buffer.from(base64Data.slice(0, 32), 'base64');
    const bytes = Array.from(binaryString);

    let detectedType = null;

    for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
      for (const signature of signatures) {
        const matches = signature.every((byte, index) => bytes[index] === byte);
        if (matches) {
          detectedType = mimeType;
          break;
        }
      }
      if (detectedType) break;
    }

    if (!detectedType) {
      const isRiff = WEBP_RIFF_HEADER.every((byte, index) => bytes[index] === byte);
      const isWebp = WEBP_MARKER.every((byte, index) => bytes[8 + index] === byte);
      
      if (isRiff && isWebp) {
        detectedType = 'image/webp';
      }
    }

    // Check for HEIC/HEIF format (ISO Base Media File Format with ftyp box)
    if (!detectedType) {
      // HEIC/HEIF files start with a size field (4 bytes) followed by "ftyp"
      const ftypMarker = [0x66, 0x74, 0x79, 0x70]; // "ftyp"
      const hasFtyp = ftypMarker.every((byte, index) => bytes[4 + index] === byte);
      if (hasFtyp) {
        // Check for HEIC/HEIF brand markers - expanded list to cover all common variants
        const brandBytes = bytes.slice(8, 12);
        const brandStr = String.fromCharCode(...brandBytes);
        const heicBrands = [
          'heic', 'heix', 'hevc', 'hevx',  // HEIC variants
          'heif', 'heim', 'heis', 'hevm',  // HEIF variants
          'mif1', 'msf1',                   // HEIF image sequence
          'avif', 'avis',                   // AVIF (AV1 Image)
        ];
        if (heicBrands.includes(brandStr)) {
          detectedType = 'image/heic';
        }
      }
    }

    if (!detectedType) {
      return {
        valid: false,
        error: 'File content does not match any allowed image format',
      };
    }

    // If we detected a valid image type, accept it regardless of declared mime type
    // iOS and different platforms may declare different mime types for the same image
    if (declaredMimeType) {
      const normalizedDeclared = declaredMimeType.toLowerCase();
      const normalizedDetected = detectedType.toLowerCase();
      
      // Allow jpg/jpeg mismatch
      const isJpegMatch = (normalizedDeclared === 'image/jpg' || normalizedDeclared === 'image/jpeg') && 
                          (normalizedDetected === 'image/jpg' || normalizedDetected === 'image/jpeg');
      
      // If detected type is a valid allowed image and declared is also an image type, accept it
      const isValidImage = ALLOWED_MIME_TYPES.includes(normalizedDetected);
      const declaredIsImage = normalizedDeclared.startsWith('image/');
      
      if (!isJpegMatch && normalizedDeclared !== normalizedDetected && isValidImage && declaredIsImage) {
        // Log the mismatch but still accept since we detected a valid image format
        console.log(`[FileValidator] Mime type mismatch: declared=${normalizedDeclared}, detected=${normalizedDetected} - accepting detected type`);
      }
    }

    return { valid: true, detectedType };
  } catch (error) {
    console.error('Magic bytes validation error:', error);
    return { valid: false, error: 'Failed to validate file content' };
  }
}

function containsSuspiciousPatterns(base64Data) {
  if (!base64Data) return { safe: true };

  try {
    const decodedSample = Buffer.from(base64Data.slice(0, 2000), 'base64').toString('utf8');
    
    const suspiciousPatterns = [
      /<script[\s>]/i,
      /<iframe[\s>]/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<\?php/i,
      /<%[\s@]/i,
      /eval\s*\(/i,
      /document\.cookie/i,
      /document\.write/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(decodedSample)) {
        return {
          safe: false,
          error: 'File contains potentially malicious content',
        };
      }
    }

    return { safe: true };
  } catch (error) {
    return { safe: true };
  }
}

function validateImageUpload(photoUrl) {
  const extraction = extractBase64Data(photoUrl);
  
  if (extraction.isRemoteUrl) {
    return { valid: true, isRemoteUrl: true };
  }

  if (extraction.error) {
    return { valid: false, error: extraction.error };
  }

  const { mimeType, data } = extraction;

  if (mimeType) {
    const mimeValidation = validateMimeType(mimeType);
    if (!mimeValidation.valid) {
      return mimeValidation;
    }
  }

  const sizeValidation = validateFileSize(data);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  const magicValidation = validateMagicBytes(data, mimeType);
  if (!magicValidation.valid) {
    return magicValidation;
  }

  const patternCheck = containsSuspiciousPatterns(data);
  if (!patternCheck.safe) {
    return { valid: false, error: patternCheck.error };
  }

  return {
    valid: true,
    mimeType: magicValidation.detectedType || mimeType,
    estimatedSize: sizeValidation.estimatedSize,
  };
}

module.exports = {
  validateImageUpload,
  validateMimeType,
  validateFileSize,
  validateMagicBytes,
  containsSuspiciousPatterns,
  extractBase64Data,
  isRemoteUrl,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
};
