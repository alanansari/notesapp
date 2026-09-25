import { model, Schema } from 'mongoose';

// An account waiting on email verification. The User is only created once the code is confirmed.
const pendingSignupSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true },
    codeHash: { type: String, required: true },
    codeExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const PendingSignup = model('PendingSignup', pendingSignupSchema);
