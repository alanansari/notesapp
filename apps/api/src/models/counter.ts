import { model, Schema, type Types } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model('Counter', counterSchema);

export async function reserveSeq(userId: Types.ObjectId, count: number): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: userId },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: 'after', projection: { seq: 1 } },
  ).lean();
  return (counter?.seq ?? count) - count + 1;
}
