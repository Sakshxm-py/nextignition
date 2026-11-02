import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { verifyEmail, requestVerificationOtp } from '../services/authService';
import { toast } from 'sonner';

export const VerifyEmailPage = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [email, setEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        const storedEmail = sessionStorage.getItem('verify_email') || '';
        if (!storedEmail) {
            window.location.hash = 'login';
            return;
        }
        setEmail(storedEmail);
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const onVerify = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const code = otp.join('');
        if (code.length < 6) {
            toast.error('Please enter the full 6-digit code');
            return;
        }

        setIsVerifying(true);
        try {
            await verifyEmail(email, code);
            toast.success('Email verified successfully! You can now log in.');
            sessionStorage.removeItem('verify_email');
            setTimeout(() => {
                window.location.hash = 'login';
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Verification failed. Please check the code.');
        } finally {
            setIsVerifying(false);
        }
    };

    const onResend = async () => {
        if (timer > 0) return;
        setIsResending(true);
        try {
            await requestVerificationOtp(email);
            toast.success('Verification code resent to your email.');
            setTimer(60);
        } catch (error: any) {
            toast.error('Failed to resend code. Please try again later.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                <div className="bg-blue-600 p-8 text-center text-white relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldCheck className="w-24 h-24" />
                    </div>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md mb-4">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Verify Your Email</h1>
                    <p className="text-blue-100 mt-2">
                        We've sent a 6-digit code to <span className="font-semibold text-white">{email}</span>
                    </p>
                </div>

                <div className="p-8">
                    <form onSubmit={onVerify} className="space-y-6">
                        <div className="flex justify-between gap-2">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    className="w-full h-14 text-center text-xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                                    required
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={isVerifying}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isVerifying ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Verify Account
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-sm">
                            Didn't receive the code?
                        </p>
                        <button
                            onClick={onResend}
                            disabled={timer > 0 || isResending}
                            className={`mt-2 inline-flex items-center gap-2 font-semibold text-sm transition-colors ${
                                timer > 0 || isResending ? 'text-slate-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                        >
                            {isResending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className={`w-4 h-4 ${timer > 0 ? '' : 'animate-pulse'}`} />
                            )}
                            {timer > 0 ? `Resend code in ${timer}s` : 'Resend Verification Code'}
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                        <button 
                            onClick={() => window.location.hash = 'login'}
                            className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                        >
                            Back to Log In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
