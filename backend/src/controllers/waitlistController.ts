import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

export const joinWaitlist = async (req: Request, res: Response) => {
  try {
    const { email, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    // Insert into a 'waitlist' table
    // If the table doesn't exist, we might get an error, so we should check first.
    // However, in this environment, I should assume I can insert if I create it.
    
    const { error } = await supabase
      .from('waitlist')
      .insert([{ 
        email, 
        source: source || 'startup_explorer',
        created_at: new Date().toISOString() 
      }]);

    if (error) {
      // If table doesn't exist, log it and return success for demo purposes if preferred,
      // but better to be honest or handle it.
      console.error('Waitlist error:', error);
      return res.status(500).json({ message: 'Failed to join waitlist', error: error.message });
    }

    return res.json({ success: true, message: 'Successfully joined the waitlist!' });
  } catch (error: any) {
    console.error('Waitlist exception:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
