import { AVATAR_COLORS, type User as UserDTO } from '@noted/shared';
import { type HydratedDocument, type InferSchemaType, model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, enum: AVATAR_COLORS, default: AVATAR_COLORS[0] },
    passwordChangedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model('User', userSchema);

export function toUserDTO(user: UserDoc): UserDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt.getTime(),
    passwordChangedAt: user.passwordChangedAt.getTime(),
  };
}
