// services/userService.js
// Simple user service – adapt to your Mongoose models
// ----------------------------------------------------
import User from '../models/User.js'; // adjust path to your User schema

/**
 * Upsert a Google user.
 *   - If a user with the given Google sub exists, update its email/name.
 *   - Otherwise, create a new user document.
 * Returns the persisted user.
 */
export async function upsertGoogleUser({ googleSub, email, name }) {
  const update = { email, name, googleSub, lastLogin: new Date() };
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };
  const user = await User.findOneAndUpdate({ googleSub }, update, options).exec();
  return user;
}

/**
 * Find or create a Google user – used by Passport strategy.
 */
export async function findOrCreateGoogleUser({ googleSub, email, name }) {
  let user = await User.findOne({ googleSub }).exec();
  if (!user) {
    user = await User.create({ googleSub, email, name });
  } else {
    // keep email up‑to‑date if it changed on Google side
    user.email = email;
    user.name = name;
    await user.save();
  }
  return user;
}
