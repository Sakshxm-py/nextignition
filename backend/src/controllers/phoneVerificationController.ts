import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: any = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
        const twilio = require('twilio');
        twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        console.log('[Twilio] SMS verification enabled');
    } catch (error) {
        console.warn('[Twilio] Not configured. Phone verification will be disabled.');
    }
} else {
    console.warn('[Twilio] Credentials not found. Phone verification will be disabled.');
}

// Rate limiting map: phoneNumber -> { count, resetTime }
const otpRateLimits = new Map<string, { count: number; resetTime: number }>();

// Helper: Check rate limit
const checkRateLimit = (phoneNumber: string): boolean => {
    const now = Date.now();
    const limit = otpRateLimits.get(phoneNumber);

    if (!limit || now > limit.resetTime) {
        // Reset or new entry
        otpRateLimits.set(phoneNumber, {
            count: 1,
            resetTime: now + 60 * 60 * 1000 // 1 hour
        });
        return true;
    }

    if (limit.count >= 3) {
        return false; // Rate limited
    }

    limit.count++;
    return true;
};

// ============================================================================
// Send OTP to Phone Number
// ============================================================================

export const sendPhoneOTP = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Validate phone number format (basic E.164 format)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({
                error: 'Invalid phone number format',
                message: 'Phone number must be in E.164 format (e.g., +1234567890)'
            });
        }

        // Check rate limit
        if (!checkRateLimit(phoneNumber)) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Maximum 3 OTP requests per hour. Please try again later.'
            });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update user with OTP
        const { error: updateError } = await supabase
            .from('users')
            .update({
                phoneNumber,
                phoneOtp: otpHash,
                phoneOtpExpiry: otpExpiry.toISOString(),
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('[Phone] Update error:', updateError);
            return res.status(500).json({ error: 'Failed to generate OTP' });
        }

        // Send SMS via Twilio
        if (twilioClient) {
            try {
                await twilioClient.messages.create({
                    body: `Your NextIgnition verification code is: ${otp}. Valid for 10 minutes.`,
                    from: TWILIO_PHONE_NUMBER,
                    to: phoneNumber
                });

                console.log(`[Phone] OTP sent to ${phoneNumber}`);
            } catch (twilioError: any) {
                console.error('[Twilio] SMS send error:', twilioError);
                
                // If Twilio fails, return OTP in response (DEVELOPMENT ONLY)
                if (process.env.NODE_ENV === 'development') {
                    return res.status(200).json({
                        success: true,
                        message: 'OTP generated (Twilio failed)',
                        otp, // ONLY in development
                        expiresIn: '10 minutes'
                    });
                }
                
                return res.status(500).json({ error: 'Failed to send SMS' });
            }
        } else {
            // No Twilio configured - return OTP in response (DEVELOPMENT ONLY)
            if (process.env.NODE_ENV !== 'production') {
                return res.status(200).json({
                    success: true,
                    message: 'OTP generated (SMS disabled)',
                    otp, // ONLY in development
                    expiresIn: '10 minutes'
                });
            }
            
            return res.status(503).json({
                error: 'SMS service not configured',
                message: 'Phone verification is temporarily unavailable'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'OTP sent to your phone number',
            expiresIn: '10 minutes'
        });
    } catch (error) {
        console.error('[Phone] Send OTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Verify OTP
// ============================================================================

export const verifyPhoneOTP = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ error: 'OTP is required' });
        }

        // Get user's OTP data
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('phoneNumber, phoneOtp, phoneOtpExpiry, phoneVerified')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.phoneOtp || !user.phoneOtpExpiry) {
            return res.status(400).json({
                error: 'No OTP found',
                message: 'Please request an OTP first'
            });
        }

        // Check if OTP expired
        const now = new Date();
        const expiry = new Date(user.phoneOtpExpiry);
        if (now > expiry) {
            return res.status(400).json({
                error: 'OTP expired',
                message: 'Please request a new OTP'
            });
        }

        // Verify OTP
        const isValid = await bcrypt.compare(otp, user.phoneOtp);
        if (!isValid) {
            return res.status(400).json({
                error: 'Invalid OTP',
                message: 'The code you entered is incorrect'
            });
        }

        // Mark phone as verified
        const { error: updateError } = await supabase
            .from('users')
            .update({
                phoneVerified: true,
                phoneVerifiedAt: new Date().toISOString(),
                phoneOtp: null, // Clear OTP
                phoneOtpExpiry: null,
                updatedAt: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('[Phone] Verification error:', updateError);
            return res.status(500).json({ error: 'Failed to verify phone' });
        }

        console.log(`[Phone] Phone verified for user ${userId}`);

        return res.status(200).json({
            success: true,
            message: 'Phone number verified successfully',
            phoneVerified: true,
            phoneNumber: user.phoneNumber
        });
    } catch (error) {
        console.error('[Phone] Verify OTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Resend OTP
// ============================================================================

export const resendPhoneOTP = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user's phone number
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('phoneNumber')
            .eq('id', userId)
            .single();

        if (fetchError || !user?.phoneNumber) {
            return res.status(400).json({
                error: 'No phone number found',
                message: 'Please provide a phone number first'
            });
        }

        // Reuse sendPhoneOTP logic
        req.body.phoneNumber = user.phoneNumber;
        return sendPhoneOTP(req, res);
    } catch (error) {
        console.error('[Phone] Resend OTP error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Get Phone Verification Status
// ============================================================================

export const getPhoneVerificationStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('phoneNumber, phoneVerified, phoneVerifiedAt')
            .eq('id', userId)
            .single();

        if (fetchError) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            phoneNumber: user.phoneNumber || null,
            phoneVerified: user.phoneVerified || false,
            phoneVerifiedAt: user.phoneVerifiedAt || null
        });
    } catch (error) {
        console.error('[Phone] Get status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
